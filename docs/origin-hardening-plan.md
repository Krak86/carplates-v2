# Origin hardening plan (hide and lock the VPS)

Written 2026-11-16 after a walk through the request path (browser to Postgres). Docs only: no code or infra file was changed. Related:
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
| F1  | **ufw allows 22/80/443 tcp and 443/udp from anywhere** (`bootstrap.sh:47-54`). Docs said "only Cloudflare ranges" but the only Cloudflare-range list is `trusted_proxies` in the Caddyfile (client IP header). Anyone who learns the VPS IP can bypass the WAF rate limit, Bot Fight Mode, the cache and DDoS filtering. | Medium   |
| F2  | The IP can leak even with the orange cloud: old DNS history, internet-wide scanners that return our cert on :443, any grey-cloud record.                                                                                                                                                                                 | Medium   |
| F3  | Docs wrongly said Redis is "already in the production compose" (`catalog-plan.md`, PLAN.md stack line). It is not; the throttler store is still open.                                                                                                                                                                    | Docs     |
| F4  | `deploy.md` says the firewall must allow 443/udp for HTTP/3. With Cloudflare in front, browsers speak HTTP/3 to Cloudflare, which talks to the origin over TCP; 443/udp matters only for direct hits (verify before closing, H4).                                                                                        | Low      |
| F5  | SSL mode is held by "Automatic SSL/TLS", not pinned. Today it resolves to Full (strict).                                                                                                                                                                                                                                 | Low      |
| F6  | SSH (22) is open to the world (key-only, no root, fail2ban). Acceptable, but the cheapest further step is restricting it.                                                                                                                                                                                                | Low      |

## 3. Plan (ordered; tick when done and verified)

Goal: the VPS answers only Cloudflare (and SSH from the owner), so a leaked IP is useless, without breaking deploys, UptimeRobot or the admin analytics card.

- [ ] **H0 Baseline (read-only).** From a machine outside Cloudflare: `curl -skI --resolve carsua.app:443:<VPS-IP> https://carsua.app/` returns 200 today (this is F1). Record it, repeat after each step. Check DNS: every record for the zone that points at the VPS must be orange-clouded (Cloudflare > DNS); list any grey ones.
- [ ] **H1 Pin the mode.** SSL/TLS > Configure > select **Full (Strict)** > Save (no visitor change). Reason: Automatic can move the mode after an origin scan; a lockdown must not depend on it.
- [ ] **H2 Authenticated Origin Pulls (mTLS), preferred.** Cloudflare presents a client certificate on leg 2; Caddy requires it, so a direct hit fails the TLS handshake.
  - Use a **per-zone custom** AOP certificate, not Cloudflare's shared default (the shared one is trusted for every Cloudflare customer, so someone could point their own zone at our IP). Needs the SSL/TLS > Origin Server > Authenticated Origin Pulls toggle (zone-level, with a custom cert uploaded via API; check the free-plan availability first).
  - Caddy side (later, code): `tls /certs/origin.pem /certs/origin.key { client_auth { mode require_and_verify; trust_pool file /certs/cf-origin-pull-ca.pem } }`, the CA file mounted in `../env/certs` and written by `deploy-api` like `origin.pem` (new secret).
  - Check first what reaches Caddy without Cloudflare: the deploy health check runs on the origin (the public `/healthz` check in `deploy-api.yml` is advisory and goes through Cloudflare), UptimeRobot goes through Cloudflare. Anything hitting `https://<ip>` or localhost with TLS would need an exception (`@direct` in the Caddyfile is for that traffic and would become dead code).
  - Rollout: enable with `mode verify_if_given` first, watch, then `require_and_verify`. Keep an escape hatch (remove the block + reload Caddy over SSH).
- [ ] **H3 Cloudflare-range allowlist in the firewall (alternative or second layer).** ufw alone is bypassed by Docker-published ports: rules go in the `DOCKER-USER` chain (accept Cloudflare ranges on 80/443, drop the rest). Needs a script that refreshes the ranges (cloudflare.com/ips-v4, ips-v6; the Caddyfile list is the same data). More moving parts than H2 (ranges change); pick H2 unless AOP is unavailable.
- [ ] **H4 Shrink open ports.** After H2/H3 verify then close: 443/udp (F4; check with `curl --http3` against Cloudflare that browsers still get h3 and that origin h3 is not used), and 80 if no ACME/redirect need remains (Always Use HTTPS redirects at the edge; Caddy only needs 80 for the HTTP to HTTPS redirect of direct hits). Update `bootstrap.sh`, `deploy.md` ("open UDP 443!") and the PLAN.md line in the same change.
- [ ] **H5 SSH.** Restrict 22 to the owner's IP or a VPN (Tailscale), or keep the current key-only + fail2ban and accept it. Decide; GitHub Actions deploys SSH in from runner IPs, so IP restriction would break CI unless CI uses a different path. Likely: leave 22 as is.
- [ ] **H6 Cloudflare Tunnel (strongest, deferred).** `cloudflared` as a compose service makes an outbound connection, so 80/443 can be closed entirely and the IP serves nothing (SSH aside). Replaces leg-2 TLS and AOP. Cost: a new container, changes to Caddy upstream, health checks and deploys. Revisit if H2 proves insufficient.
- [ ] **H7 After lockdown, consider changing the VPS IP** (if the provider allows) so previously leaked addresses are dead; DNS history cannot be erased.
- [ ] **H8 Origin header fallback** (existing open item, `main.ts` `onSend`): a direct hit is header-naked; moot once H2/H3 land, still cheap.

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
