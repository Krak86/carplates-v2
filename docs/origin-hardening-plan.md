# Origin hardening plan (hide and lock the VPS)

Written 2026-11-16 after a walk through the request path (browser to Postgres). Status 2026-11-17: H0, H1 and H2 done and verified (see section 3); H3 code shipped but not applied; the rest open. Related:
[deploy.md](deploy.md) "How it fits together" and "HTTP/2, HTTP/3, compression, caching", [security-checklist.md](security-checklist.md) §1b,
[PLAN.md](../PLAN.md) "Deploy-time security checklist".

## 1. The real request path (verified against the repo)

```
Browser
  │ DNS: carsua.app -> Cloudflare IPs (orange cloud)
  ▼
Cloudflare edge   TLS #1 (edge cert), WAF rate limit, Bot Fight Mode, Cache Rules, HTTP/3, Brotli
  │ leg 2: new HTTPS connection (Full strict), origin cert checked
  ▼
VPS public IP :80/:443/:443udp   (ufw allows these from ANYWHERE, see §2)
  ▼
Docker network "carsua"
  caddy (only container with `ports:`)   TLS #2 (Cloudflare Origin CA cert), headers, CSP, reverse_proxy
    ▼
  api-blue | api-green   NestJS + Fastify; Drizzle ORM + node-postgres Pool (max 10 per process, same container)
    ├─▶ postgres        (no PgBouncer; direct connection)
    └─▶ alpr            (Python, internal only)
  ingest                 (profile `jobs`, run by cron, own Pool)
```

"Leg" is an informal word for one hop. There are two independent TLS connections, so two certificates (a TLS server must always present one):

| Leg                   | Server     | Certificate                                                                                    | Lifetime                                                  |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Browser to Cloudflare | Cloudflare | Universal edge cert, Let's Encrypt `YE2` seen 2026-11-16, `carsua.app` + `*.carsua.app`, ECDSA | 90 days, renewed by Cloudflare (CA may change)            |
| Cloudflare to VPS     | Caddy      | Cloudflare Origin CA (`/certs/origin.pem`), only Cloudflare trusts it                          | expires 2041-10-23 (checked with openssl/curl on the VPS) |

Notes:

- Caddy requests no ACME certificate for these sites (`tls /certs/origin.pem /certs/origin.key` in both site blocks). The `caddy_data` volume holds only Caddy state.
- Alternatives for leg 2, all accepted by Full (strict) except self-signed: a public-CA cert (Caddy auto Let's Encrypt, HTTP-01 through the proxy; the
  stock `caddy:2` image has no Cloudflare DNS plugin, so DNS-01 needs a custom build). Renewal would be automatic in Caddy, never via GitHub secrets.
  Flexible mode (plain HTTP on leg 2) needs no cert but leaves leg 2 readable on the internet: do not use. Not worth switching: the origin cert is only ever seen by Cloudflare.
- Cloudflare dashboard (SSL/TLS, seen 2026-11-16): the page shows **Automatic SSL/TLS (recommended)**, "Currently running: Full (strict)", next scan Nov 18.
  Automatic is a selector on top of the mode; the effective mode is Full (strict). See H1.
- TLS #1 / #2 cannot be one connection while the proxy is on: Cloudflare must decrypt to apply WAF and cache.
- Edge cert vs origin cert are on different pages: SSL/TLS > Edge Certificates and SSL/TLS > Origin Server.

Verify the origin cert (on the VPS; Git Bash curl on Windows is built on Schannel and prints no cert lines):

```bash
curl -vk --resolve carsua.app:443:127.0.0.1 https://carsua.app -o /dev/null 2>&1 | grep -iE "issuer|subject|expire"
# or, from any machine with openssl:
openssl s_client -connect <VPS-IP>:443 -servername carsua.app </dev/null 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```

Expected: issuer `CloudFlare Origin SSL Certificate Authority`. "unable to get local issuer certificate (20)" is normal (only Cloudflare trusts that CA).

### Containers (docker-compose.prod.yml)

6 services defined: `caddy`, `api-blue`, `api-green`, `alpr`, `postgres`, `ingest` (profile `jobs`, only via `docker compose run --rm`).
Normally 4 or 5 run (green is up only during a deploy). **Not defined: PgBouncer, Redis.** Dev compose adds `mailpit` and a local `alpr`.
Only `caddy` publishes ports (`80:80`, `443:443`, `443:443/udp`, line 32). Others are reachable by service name on the internal network only
(`api-blue:3000` in the Caddyfile, `http://alpr:8088`). Docker-published ports bypass ufw (comment in `bootstrap.sh`): never add `ports:` to postgres/alpr.

## 2. Findings

| #   | Finding                                                                                                                                                                                                                                                                                                                  | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| F1  | **FIXED by H2 2026-11-17 (a direct hit now fails the handshake).** Was: **ufw allows 22/80/443 tcp and 443/udp from anywhere** (`bootstrap.sh:47-54`). Docs said "only Cloudflare ranges" but the only Cloudflare-range list is `trusted_proxies` in the Caddyfile (client IP header). Anyone who learns the VPS IP can bypass the WAF rate limit, Bot Fight Mode, the cache and DDoS filtering. | Medium   |
| F2  | The IP can leak even with the orange cloud: old DNS history, internet-wide scanners that return our cert on :443, any grey-cloud record.                                                                                                                                                                                 | Medium   |
| F3  | Docs wrongly said Redis is "already in the production compose" (`catalog-plan.md`, PLAN.md stack line). It is not; the throttler store is still open.                                                                                                                                                                    | Docs     |
| F4  | `deploy.md` says the firewall must allow 443/udp for HTTP/3. With Cloudflare in front, browsers speak HTTP/3 to Cloudflare, which talks to the origin over TCP; 443/udp matters only for direct hits (verify before closing, H4).                                                                                        | Low      |
| F5  | SSL mode is held by "Automatic SSL/TLS", not pinned. Today it resolves to Full (strict).                                                                                                                                                                                                                                 | Low      |
| F6  | SSH (22) is open to the world (key-only, no root, fail2ban). Acceptable, but the cheapest further step is restricting it.                                                                                                                                                                                                | Low      |

## 3. Plan (ordered; tick when done and verified)

Goal: the VPS answers only Cloudflare (and SSH from the owner), so a leaked IP is useless, without breaking deploys, UptimeRobot or the admin analytics card.

- [x] **H0 Baseline (read-only), done 2026-11-17.** From a machine outside Cloudflare: `curl -skI --resolve carsua.app:443:<VPS-IP> https://carsua.app/` returns 200 today (this is F1). Record it, repeat after each step. Check DNS: every record for the zone that points at the VPS must be orange-clouded (Cloudflare > DNS); list any grey ones.
  - **Result 2026-11-17:** direct `curl --resolve` to the VPS IP returned `HTTP/1.1 200 OK` (`Via: 1.1 Caddy`), so F1 is confirmed open. DNS audit (10 records): `carsua.app` A + AAAA and `www` are Proxied; the only DNS-only records are `rsend`/`send` (CNAME to `forge.rmta.net`, Resend mail) and TXT (Google verification, SPF `-all`, DMARC, DKIM). No MX, no `mail.`/`ftp.`/`direct.` record, nothing grey that contains the VPS IP.
  - **IPv6:** the AAAA record is the VPS IPv6 address, an equal way in. H2 (Caddy) covers both; H3 must add `ip6tables` (`DOCKER-USER` for v6) rules and the IPv6 ranges (`ips-v6`), and H0 must be repeated with `curl -6 --resolve carsua.app:443:[<VPS-IPv6>]`.
  - **Remaining leak risk (F2, not fixable by DNS edits):** DNS history (SecurityTrails and similar), internet scanners (Censys/Shodan) that return our cert on :443, Certificate Transparency logs. Only H2/H3 plus H7 neutralise it.
- [x] **H1 Pin the mode, done 2026-11-17** (was Automatic SSL/TLS running Full (strict), next scan Nov 18; now **Full (Strict)** saved, no visitor change). SSL/TLS > Configure > select **Full (Strict)** > Save (no visitor change). Reason: Automatic can move the mode after an origin scan; a lockdown must not depend on it.
- [x] **H2 Authenticated Origin Pulls (mTLS), preferred. Done and verified 2026-11-17** (Deploy API #155, Zone-level AOP ON with custom CA `carsua-aop-ca` valid to 2036-11-14, Caddy `require_and_verify`): the direct `curl -skI --resolve carsua.app:443:<VPS-IP>` that returned 200 in H0 now returns nothing (handshake rejected), and carsua.app through Cloudflare loads normally (plate page, API calls 200, no console errors). IPv6 verified from the VPS itself (`curl -6 -skv --resolve carsua.app:443:[<VPS-IPv6>]` completes TLS 1.3, sends `Request CERT`, then fails with `tlsv13 alert certificate required`); a test from outside needs an IPv6 network (the owner's PC has none: `Network unreachable`). Calendar: renew the AOP cert before 2036-11-14.
  - **Gotchas learned:** (1) Cloudflare rejects a self-signed `CA:TRUE` cert as a client cert ("Missing leaf certificate"): make a CA + a `CA:FALSE` leaf signed by it, upload `aop-bundle.pem` (leaf + CA) and the leaf key; the GitHub secret `CF_AOP_CERT` and Caddy's `trust_pool` hold only the CA cert. (2) Git Bash rewrites `/CN=...` into a Windows path: use `MSYS_NO_PATHCONV=1`. (3) `curl -s` hides the error: a blank result is the failed handshake, use `-skv` to see it. (4) Keys and certs live in the git-ignored `secrets/` folder (layout in `secrets/README.md`). (5) The Caddyfile references `cf-aop.pem`, so `deploy-api` fails on purpose when `CF_AOP_CERT` is unset instead of reloading Caddy into a crash. Code written 2026-11-17 (`infra/Caddyfile` `client_auth` in `verify_if_given`; `deploy-api` writes `certs/cf-aop.pem` from secret `CF_AOP_CERT` and fails if the Caddyfile needs it and the secret is missing). Free plan has the zone-level Upload certificate button (checked 2026-11-17). Cloudflare rejects a self-signed CA cert as client cert ("Missing leaf certificate"): use a CA + signed leaf, commands in `secrets/README.md`; upload the leaf+CA bundle and the leaf key, and `CF_AOP_CERT` = the CA cert. Enforcing (`require_and_verify`) prepared 2026-11-17 after deploy #154 + toggle ON + site checked. Owner order: generate the certs, upload to Cloudflare Zone-level (toggle still off), add secret `CF_AOP_CERT`, deploy, enable the toggle, switch the Caddyfile to `require_and_verify`, deploy, verify. Cloudflare presents a client certificate on leg 2; Caddy requires it, so a direct hit fails the TLS handshake.
  - Use a **per-zone custom** AOP certificate, not Cloudflare's shared default (the shared one is trusted for every Cloudflare customer, so someone could point their own zone at our IP). Needs the SSL/TLS > Origin Server > Authenticated Origin Pulls toggle (zone-level, with a custom cert uploaded via API; check the free-plan availability first).
  - Caddy side (later, code): `tls /certs/origin.pem /certs/origin.key { client_auth { mode require_and_verify; trust_pool file /certs/cf-origin-pull-ca.pem } }`, the CA file mounted in `../env/certs` and written by `deploy-api` like `origin.pem` (new secret).
  - Check first what reaches Caddy without Cloudflare: the deploy health check runs on the origin (the public `/healthz` check in `deploy-api.yml` is advisory and goes through Cloudflare), UptimeRobot goes through Cloudflare. Anything hitting `https://<ip>` or localhost with TLS would need an exception (`@direct` in the Caddyfile is for that traffic and would become dead code).
  - Rollout: enable with `mode verify_if_given` first, watch, then `require_and_verify`. Keep an escape hatch (remove the block + reload Caddy over SSH).
- [ ] **H3 Cloudflare-range allowlist in the firewall (alternative or second layer).** Code written 2026-11-17, not applied: `infra/vps/cf-firewall.sh` (`apply|status|remove`; ipset + `DOCKER-USER` for v4, `INPUT` (+ `DOCKER-USER` if present) for v6, only on the public interface, SSH untouched), shipped by `deploy-api`; `bootstrap.sh` installs ipset, a boot unit and a daily refresh cron that stay inert until `/opt/carsua/env/cf-firewall.enabled` exists. Rollout: `apt-get install ipset`, run `apply` by hand with a second SSH session open, repeat H0 over v4 and v6 (direct hit must hang or fail, `https://carsua.app` must still load, UptimeRobot and the `deploy-api` health check still green), then touch the flag. Escape hatch: `cf-firewall.sh remove`. ufw alone is bypassed by Docker-published ports: rules go in the `DOCKER-USER` chain (accept Cloudflare ranges on 80/443, drop the rest). Needs a script that refreshes the ranges (cloudflare.com/ips-v4, ips-v6; the Caddyfile list is the same data). More moving parts than H2 (ranges change); pick H2 unless AOP is unavailable.
- [ ] **H4 Shrink open ports.** After H2/H3 verify then close: 443/udp (F4; check with `curl --http3` against Cloudflare that browsers still get h3 and that origin h3 is not used), and 80 if no ACME/redirect need remains (Always Use HTTPS redirects at the edge; Caddy only needs 80 for the HTTP to HTTPS redirect of direct hits). Update `bootstrap.sh`, `deploy.md` ("open UDP 443!") and the PLAN.md line in the same change.
- [ ] **H5 SSH.** Restrict 22 to the owner's IP or a VPN (Tailscale), or keep the current key-only + fail2ban and accept it. Decide; GitHub Actions deploys SSH in from runner IPs, so IP restriction would break CI unless CI uses a different path. Likely: leave 22 as is.
- [ ] **H6 Cloudflare Tunnel (strongest, deferred).** `cloudflared` as a compose service makes an outbound connection, so 80/443 can be closed entirely and the IP serves nothing (SSH aside). Replaces leg-2 TLS and AOP. Cost: a new container, changes to Caddy upstream, health checks and deploys. Revisit if H2 proves insufficient.
- [ ] **H7 After lockdown, consider changing the VPS IP** (if the provider allows) so previously leaked addresses are dead; DNS history cannot be erased.
- [ ] **H8 Origin header fallback** (existing open item, `main.ts` `onSend`): a direct hit is header-naked; moot once H2/H3 land, still cheap.
- [ ] **H9 Host patching (do now, 2026-11-17 MOTD: 7 updates + 1 ESM Apps, and `*** System restart required ***` already shown on kernel 6.8.0-147, so a reboot is pending even before the 7 updates; disk `/` 70.6% of 192 GB, watch it).** `sudo apt update && sudo apt upgrade`, then `[ -f /var/run/reboot-required ] && sudo reboot` in a quiet window (Docker restarts the stack; check `https://carsua.app` and the next deploy). `bootstrap.sh` already installs `unattended-upgrades`; verify with `systemctl status unattended-upgrades` and `grep -r Automatic-Reboot /etc/apt/apt.conf.d/` (kernel fixes need a reboot, decide on a reboot window). Ignore the ESM Apps line (needs Ubuntu Pro, covers `universe` packages we do not rely on; Pro is free for 5 machines if ever wanted: `pro attach`).
- [ ] **H10 Ubuntu 24.04 to 26.04 LTS: decided NOT now, revisit 2027-Q2.** Research 2026-11-17: 24.04 has standard security updates until May 2029 (ESM to 2034), so there is no deadline pressure. Canonical opened the 24.04 to 26.04.1 path in autumn 2026 (the MOTD prompt), so it is only weeks old. Risks for this single production box with no Contabo backups: a major `do-release-upgrade` swaps kernel, systemd, OpenSSL and iptables/nftables, which touches exactly what H2/H3 rely on (Docker `DOCKER-USER` chain, `ipset`, `cf-firewall.sh`, ufw, fail2ban) plus Docker CE repo support for the new release. Benefit is small (newer kernel, longer support horizon). Do **not** run it in place. When it is time, prefer a **fresh VPS on 26.04** built with `bootstrap.sh`, restore Postgres from the R2 backup, flip the DNS A/AAAA: it tests the bootstrap and restore paths, and doubles as H7 (new IP, old leaked one dead). Before that: take a manual `pg_dump` + R2 backup check, and confirm Docker CE publishes a `resolute` apt repo.

Do not choose grey cloud (DNS only) as a security measure: the origin cert is not browser-trusted (Caddy would need Let's Encrypt), and it removes the WAF rule, Bot Fight Mode,
all three Cache Rules (every request would hit the VPS and Postgres), Brotli and the admin Cloudflare card, and publishes the IP. Useful only as a short debugging toggle.

## 4. Cloudflare config known from the docs (dashboard is the source of truth)

- Security: WAF rate-limit rule `api-lookup-limit` (`starts_with(http.request.uri.path, "/api/plate") or "/api/vin"`, IP characteristic, 30 per 10 s, action Block; free-plan block duration is fixed at 10 s), Bot Fight Mode, Always Use HTTPS, min TLS 1.2, HSTS off at Cloudflare (Caddy owns it), "Under Attack" as a manual toggle, DDoS protection (always on, nothing to configure), Turnstile (app feature).
- Cache Rules: "Cache API rollups", "Cache model lookups" (skips `refresh`), "Cache catalog pages" (`/cars`, `/cars/*`); expressions and the add-an-endpoint procedure in `deploy.md` "HTTP/2, HTTP/3, compression, caching". `/api/plate/*` and `/api/vin/*` are never cached.
- Other: Universal SSL edge cert, Origin CA cert, Browser Cache TTL "Respect Existing Headers", HTTP/3, Brotli, Web Analytics, Zone Analytics read token (admin card), R2 for backups.
- Traffic seen 2026-11-16 (SSL/TLS overview, 24 h): TLS 1.3 17.38k, TLS 1.2 4, "None" 1.74k (plain-HTTP requests that Always Use HTTPS redirects; not served insecurely).

## 5. Decisions on PgBouncer and Redis

**PgBouncer: not needed now.** Drizzle runs on a `pg` Pool (`packages/db/src/client.ts`, default max 10 per process). `api-blue` + `api-green` + an ingest run stay well under Postgres' default `max_connections = 100`. Add it only when one of these shows up:

```sql
SHOW max_connections;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;   -- sustained use near the limit
```

`too many clients already` in the logs, `pool.waitingCount` above 0, or memory pressure from many backends. Costs: transaction pooling breaks prepared statements, session `SET`, advisory locks and `LISTEN`. The likelier bottleneck is heavy queries on the 24M-row registry, not connection count (check `pg_stat_statements` first).

**Redis: not in the compose file; reasons it is on the backlog** (PLAN.md "Redis-backed throttler storage", low priority): (1) shared throttler counters that survive restarts and cover the blue/green overlap (today per process, reset on restart), (2) an optional global daily counter for paid third-party keys (e.g. a RIA key, 5000/day), (3) a cache shared between blue and green (the catalog stays in process memory instead). Add it when one of those becomes a real problem.

**Where things run:** Drizzle and the Pool are libraries inside the NestJS container (each of `api-blue`, `api-green`, `ingest` has its own Pool); the postgres container is only the server.

## 6. Doc fixes made in the same change

`deploy.md` diagram and TLS notes, `security-checklist.md` §1b rows (origin trust, ufw, SSL mode), `PLAN.md` stack line and the deploy-time security checklist (new open items H0-H8), `catalog-plan.md` Redis wording.
