# Deploying to the VPS

Status (2026-10-27): **first real deploy done** on a Contabo Cloud VPS 6 behind Cloudflare (Full strict + origin certificate): bootstrap, `deploy-api`,
`deploy-alpr`, `deploy-web`, a verified `pg_restore` of the real DB (row counts equal local) and a live `https://carsua.app` (healthz, sitemap,
robots, plate API all 200; HTTP/3 advertised). The runbook below is corrected from that run; the problems found are in `docs/plan-done.md`
"First VPS deploy". R2 backups work (nightly + full verified 2026-10-27). UptimeRobot on `/healthz` is up (2026-10-28). `ingest` cron live since 2026-10-28 (step 8). **Not yet done:** the rest of the security gate (§7, partly checked 2026-10-28), the healthchecks.io checks for the ingest jobs.
Deploy scripts run via `ssh vps bash -s < script`, so bash reads the script from stdin: every `docker` call in them that could attach stdin needs
`</dev/null`, or it swallows the rest of the script and bash exits 0 early (this made `deploy-api` report success without starting the api).

This file is the single VPS reference: sizing/provider/DNS, architecture, runbook, secrets, backups, and the HTTP/2-3 + compression notes (last
section). Task checklists and the rate-limit policy stay in [PLAN.md "Phase 4"](../PLAN.md); the pre-deploy security gate is
[security-checklist.md](security-checklist.md); recurring jobs are [SCHEDULE.md](../SCHEDULE.md).

## Sizing and provider (checked 2026-10-13, prices ex-VAT/promo, verify at purchase)

The database is **23 GB** as of 2026-10-13 (`registrations` 14 GB / 24.7M rows + the `current_registration` matview 8.9 GB; everything else
< 0.5 GB), growing ~110 MB/year (monthly delta ingest, not a full re-ingest). Containers: Postgres, `api` (also serves the web), Caddy, `alpr`,
and later a monthly `ingest-cron` that holds an exclusive lock on `registrations` for minutes. **Traffic is expected to be low** (indexed point
lookups, edge-cacheable), so **disk is the binding constraint, not CPU/RAM**.

| Resource | Start (low traffic) | Comfortable | Why                                                                                                                                                                                                                         |
| -------- | ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU      | 2 vCPU              | 4 vCPU      | Lookups are light; `ingest-cron` is I/O-bound. Go to 4 only if metrics show API latency during ingest                                                                                                                       |
| RAM      | 8 GB                | 8–16 GB     | Hot path is `current_registration` + indexes (~9 GB on disk); a small working set stays cached with 8 GB. 4 GB works but cold lookups hit disk and the ingest index rebuild is slow                                         |
| Disk     | 160 GB NVMe         | 160–200 GB  | 23 GB DB + ~9 GB temp during matview refresh/index rebuild + WAL during ingest + 2–3 `pg_dump -Fc` backups (~5–8 GB each) + source ZIPs (~1.2 GB) + images/logs ≈ 60–70 GB peak. 80 GB is too tight; **40 GB does not fit** |
| Network  | default             | default     | Point lookups; bandwidth isn't the bottleneck                                                                                                                                                                               |

Resize CPU/RAM later from observed load. Keep backups off-box (or on a separate volume) so they don't compete with PGDATA for space.

- **Contabo Cloud VPS 6** (6 vCPU / 12 GB / 200 GB SSD _or_ 100 GB NVMe, ~€7.20/mo for the first 24 months, list €9) — current pick. EU
  (Germany). Renewal price is higher after 24 months; shared/noisy disk, so **off-box backups are mandatory**, not Contabo snapshots alone.
- Hetzner (4 vCPU / 8 GB + attached volume, ~€12–20/mo, NVMe) — the more reliable fallback.
- Ukrainian host kVPS90 (4 vCPU / 8 GB / 90 GB SSD, ~1618 UAH/mo yearly) — only if UAH payment / UA hosting is required; ~5× the price, 100 GB cap.

**Static IP + DNS (required):** a **static public IPv4** (and IPv6 if offered); never a NAT/shared/ephemeral address. `carsua.app` is registered at
**Squarespace** but DNS moves to **Cloudflare** (nameservers changed at Squarespace; steps in "Where to get what"): `A @ → IPv4`, `AAAA @ → IPv6`,
`CNAME www → carsua.app`, keep MX/TXT, drop old Squarespace-site `A`/`CNAME`. Use a low TTL (300 s) before cutover, raise it after. Set the
provider's **reverse DNS (PTR)** to `carsua.app`. Without Cloudflare, Caddy would get its Let's Encrypt cert once DNS resolves to the box.

## How it fits together

```
Internet → Cloudflare (TLS, h3, Brotli, edge cache, WAF) → VPS :443 → Caddy → api-blue | api-green (Nest, also serves the SPA)
                                                                              ├→ postgres   └→ alpr
```

One branch (`main`), three workflows that each run **only when their paths change** (+ a manual "Run workflow" button on each):

| Workflow          | Triggers on                                                                 | Does                                                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy-web.yml`  | `apps/web/**`, `packages/shared/**`                                         | CI → build with `VITE_*` vars → rsync to `releases/<sha>` → keep old hashed assets → atomic symlink swap → purge Cloudflare entry files. **No api restart.**                                                                                          |
| `deploy-api.yml`  | `apps/api/**`, `packages/shared/**`, `packages/db/**`, `infra/**`, lockfile | CI → image to GHCR → sync compose/Caddyfile → write env files from secrets → migrate → start idle colour → wait healthy → stop old colour → reload Caddy → check → purge the Cloudflare `/og/` cards (best-effort; prefix purge may need a paid plan) |
| `deploy-alpr.yml` | `services/alpr/**`                                                          | image to GHCR → roll the container → wait healthy                                                                                                                                                                                                     |

A change in `packages/shared` triggers web **and** api in parallel. New API fields are additive (`.nullable().optional()`), so either order is
safe; if you ever make a breaking contract change, run the api deploy first, wait, then the web one.

**Migration rule (blue/green):** the old api keeps running on the new schema for a few seconds, so a migration must be backward compatible —
add columns/tables first, deploy, drop/rename in a _later_ release.

## What users see during a deploy

- **Web deploy:** nothing. One atomic symlink swap; open tabs still load old lazy chunks (assets are carried over); PWA users get the existing
  "Update & see what's new" bar. The api re-reads `index.html` by mtime (`spa.controller.ts`), no restart.
- **API deploy:** nothing. The new colour is healthy before the old one stops; Caddy health-checks both upstreams every 2 s and retries for up to 15 s.
- **API really down** (crash, planned maintenance): Caddy answers instead. Pages get `infra/maintenance.html` (ua/ru/en, reloads itself when
  `/healthz` is OK, status 503 + `Retry-After`); `/api/*` gets `503 {"status":"maintenance","retryAfter":30}`. The web app turns that into a
  `MaintenanceError`, retries (≤5 s apart, ~2 min), and shows a "server is updating" banner (`MaintenanceBanner`) until a query succeeds.
- **Planned maintenance:** `ssh deploy@vps touch /opt/carsua/compose/flags/MAINTENANCE` (remove to end). `/healthz` stays reachable.

## Folder layout on the VPS (`/opt/carsua`)

```
compose/   docker-compose.prod.yml, Caddyfile, maintenance.html, backup.sh, .env (image tags), flags/MAINTENANCE   ← CI copies on every api deploy
env/       api.env, postgres.env, backup.env (mode 600, written by CI) · certs/origin.pem + origin.key (Cloudflare origin cert)
web/       releases/<git-sha>/ (5 kept) and `current` → the live release (a symlink the api container serves from /web/current)
pgdata/    Postgres data (the ~23 GB DB)        backups/  staging for dumps before upload        archive/  data.gov.ua source ZIPs
```

## Where to get what

**Contabo** — order _Cloud VPS 6_, EU (Germany), image **Ubuntu 24.04**, "No Data Protection" (backups go to R2). The order form only asks for a root
password (generate one; it is used once, for `scp`/`ssh` of `bootstrap.sh`, and the script then disables password login). Create the keys locally
(`ssh-keygen -t ed25519 -C carsua-admin`, and a passphrase-less `-C carsua-ci -f ~/.ssh/carsua-ci`); their `.pub` lines go into the bootstrap
command. In PowerShell/cmd quote the remote command with double quotes outside and single quotes around the keys. Contabo emails "Your login data" with the **IPv4/IPv6** and root; the same is in my.contabo.com → _Your services_ →
_VPS_. There also: _Reverse DNS management_ (set PTR to `carsua.app`), _Snapshots_ (take one before risky changes — not a backup).

**Cloudflare** (free) — dash.cloudflare.com → _Add a domain_ `carsua.app` (Free). Check the imported records (keep MX/TXT, drop old Squarespace site
A/CNAME), add `A @ → IPv4`, `AAAA @ → IPv6`, `CNAME www → carsua.app`, all **proxied**. Copy the two nameservers into Squarespace → Domains →
carsua.app → DNS → _Use custom nameservers_ (minutes to 24 h). Then: SSL/TLS **Full (strict)** · SSL/TLS → Origin Server → _Create certificate_
(→ `CF_ORIGIN_CERT`/`CF_ORIGIN_KEY`) · Speed → HTTP/3 on · Always Use HTTPS · Security → Bots → Bot Fight Mode · WAF → one rate-limit rule on
`/api/plate*` + `/api/vin*`. **Zone ID**: domain Overview, right column. **Token**: My Profile → API Tokens → Create → Custom → _Zone · Cache
Purge · Purge_, this zone only. **R2**: R2 → enable (free tier) → bucket `carsua-backups` → _Manage R2 API tokens_ → Object Read & Write on that
bucket → access key, secret, endpoint `https://<account-id>.r2.cloudflarestorage.com`.

**healthchecks.io** (free, 20 checks) — sign up → _Add Check_ `backup` (period 1 day, grace 2 h) → copy the ping URL (`https://hc-ping.com/<uuid>`)
→ secret `HC_PING_BACKUP`; add email/Telegram under _Integrations_. `backup.sh` pings `/start`, success and `/fail`. One check per future cron job.
It only notices _missing_ pings; for "site is down" add **UptimeRobot** (free, 5 min) on `https://carsua.app/healthz`.

**GitHub** (public repo) — Settings → Environments → New `production` → deployment branches: `main` only (optionally required reviewers) → add the
secrets/variables below. After the first image push, set the `carsua-api` and `carsua-alpr` packages to **Public** (Package settings) so the VPS
pulls without a login. Settings → Actions → "Require approval for all outside collaborators" (public repo; fork PRs never get secrets anyway).

## Secrets and variables (Environment `production`)

| Secrets                                                                                                                                   | Notes                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VPS_HOST`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`                                                                                              | CI-only ed25519 key (public half → `CI_PUBKEY` in bootstrap); `ssh-keyscan -t ed25519 <ip>`                                                                                                                                        |
| `POSTGRES_PASSWORD`                                                                                                                       | `openssl rand -hex 24` (hex: it goes into a URL). Only read by Postgres on first init — see DB. The api builds `DATABASE_URL` from it and refuses to boot in production if it is missing or the dev default `carplates:carplates@` |
| `AUTH_SECRET`                                                                                                                             | `openssl rand -base64 48`                                                                                                                                                                                                          |
| `CF_ORIGIN_CERT`, `CF_ORIGIN_KEY`, `CF_API_TOKEN`, `CF_ZONE_ID`                                                                           | cert pair for Caddy; token + zone for the web cache purge (skipped if unset)                                                                                                                                                       |
| `RESEND_API_KEY` or `SMTP_URL`                                                                                                            | prod refuses `MAIL_TRANSPORT=log`                                                                                                                                                                                                  |
| `TELEGRAM_BOT_TOKEN`, `TURNSTILE_SECRET_KEY`, `PLATE_RECOGNIZER_CLOUD_TOKEN`, `PIXABAY_API_KEY`, `POSTHOG_PERSONAL_API_KEY`, `SENTRY_DSN` | optional; unset = feature off                                                                                                                                                                                                      |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `HC_PING_BACKUP`                                                               | backups                                                                                                                                                                                                                            |

| Variables (public once deployed)                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VPS_USER` (= `deploy`), `PUBLIC_SITE_URL` (`https://carsua.app`), `MAIL_TRANSPORT`, `MAIL_FROM`, `MAIL_REPLY_TO`, `MAIL_FROM_NEWS` (digest sender, optional; its domain must be verified in Resend, else 403 `domain is not verified`), `DIGEST_ENABLED` (`true` = monthly digest on, off by default; on in production since 2026-10-28), `GOOGLE_CLIENT_ID`, `TELEGRAM_BOT_USERNAME`, `TURNSTILE_SITE_KEY` |
| `PLATE_RECOGNIZER_CLOUD_ENABLED`, `RIA_CHECK_ENABLED` (AUTO.RIA plate fallback, off by default), `POSTHOG_PROJECT_ID`, `SENTRY_ORG_SLUG`, `ENABLE_TELEMETRY`, `BACKUP_BUCKET`                                                                                                                                                                                                                                |
| Web build: `VITE_API_BASE` (leave empty), `VITE_DISQUS_SHORT_NAME`, `VITE_ENABLE_TELEMETRY`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_SENTRY_DSN`, `VITE_GOOGLE_MAPS_EMBED_KEY`                                                                                                                                                                                                                        |

`VITE_*` values are bundled into public JS — restrict `VITE_GOOGLE_MAPS_EMBED_KEY` to the `carsua.app` referrer in Google Cloud. Also set
`https://carsua.app` as an authorised origin for the Google client, and Telegram `/setdomain carsua.app`. `NODE_ENV`, `TRUST_PROXY`,
`WEB_DIST_DIR`, `ALPR_LOCAL_URL` are fixed in the compose file; `GIT_SHA` is set per deploy.

## First-time setup (in this order)

1. **Bootstrap** — `scp infra/vps/bootstrap.sh root@<ip>:` then `ssh root@<ip> 'DEPLOY_PUBKEY="…" CI_PUBKEY="…" bash bootstrap.sh'`. Creates `deploy`,
   locks SSH (key-only, no root), ufw (22/80/443 tcp, 443 udp), fail2ban, Docker, 4 GB swap, `/opt/carsua`, nightly backup cron. **Open a second terminal
   and `ssh deploy@<ip>` before closing the root session.**
2. **Cloudflare + GitHub** — as above (DNS can propagate while you continue).
3. **Images + files** — run `deploy-api` with **`sync_only` ticked** first: it builds the api image, copies compose/Caddyfile, writes
   the env files and cert, and starts **only Postgres** (empty). It does _not_ migrate or start the api. Then run `deploy-alpr` (its deploy step
   needs the compose file that `deploy-api` delivers; run first it fails with `COMPOSE_FILE ... no such file`). Set both `carsua-*` packages to
   Public before `deploy-alpr`. Merge to `main` with `[skip ci]`, otherwise the push starts `deploy-api` without `sync_only` on an empty DB.
4. **Copy the whole local database** (all schemas and tables; not an ingest):
   - Locally: `SELECT count(*) FROM registry.registrations` — expect ~24.7M (real data).
   - Dump inside the container, then copy it out (**never `> carsua.dump` in PowerShell: it re-encodes the binary and corrupts it**; in Git Bash
     write the container path as `//tmp/carsua.dump` or it is rewritten to a Windows path):
     `docker exec carplates-v2-postgres-1 pg_dump -Fc -Z 6 -U carplates -f //tmp/carsua.dump carplates`, then
     `docker cp carplates-v2-postgres-1://tmp/carsua.dump C:/tmp/carsua.dump` (may create `carsua.dumpcarsua.dump`: rename it). Verified 2026-10-27:
     **1.28 GB** for 24.7M rows (14.3 GB tables incl. indexes + 8.9 GB matview on disk; the dump holds compressed rows only, and **indexes and the
     matviews are rebuilt on restore**, which is why the restore is slow, not the data load).
   - `scp C:\tmp\carsua.dump deploy@<ip>:/opt/carsua/backups/` (1.28 GB took 43 s; check the byte size on the VPS matches).
   - On the VPS (`cd /opt/carsua/compose`, `export COMPOSE_FILE=docker-compose.prod.yml`; **re-export in every new SSH session**, otherwise
     `docker compose` fails with "no configuration file provided" and any `|| echo finished` fallback lies). `pg_restore -j` cannot read stdin and
     `/opt/carsua/backups` is not mounted in the container, so copy the file in and detach the job so a dropped SSH session does not kill it:
     `docker compose cp /opt/carsua/backups/carsua.dump postgres:/tmp/carsua.dump`, then
     `nohup docker compose exec -T postgres pg_restore -j 4 --no-owner -U carplates -d carplates --verbose /tmp/carsua.dump > /opt/carsua/backups/restore.log 2>&1 &`.
     Done when no `pg_restore` process is left **and** no `REFRESH MATERIALIZED VIEW` is active (`pg_stat_activity`); the last step is the
     `current_registration` refresh (~45+ min on the Contabo disk). No `ALTER ROLE` needed: `pg_dump` carries no roles, so the server role keeps the
     `POSTGRES_PASSWORD` secret. Then `docker compose exec postgres psql -U carplates -d carplates -c "VACUUM (ANALYZE)"`, remove
     `/tmp/carsua.dump` in the container, and compare `count(*)` of `registrations`, `current_registration` and `app.users` with local. Measured
     2026-10-27: 24721694 / 16723888 / 2 on both sides; restore log had 0 errors; VPS DB is 21 GB vs 23 GB local (no bloat).
   - Faster/no-rebuild alternative: stop local Postgres and copy the `pgdata` volume (~23 GB, same 18.6 image) into `/opt/carsua/pgdata`.
5. **Run `deploy-api` normally** (migrator is a no-op on the restored DB), then `deploy-web`. Check `https://carsua.app/healthz`, a plate, a VIN, camera recognize.
6. **Backups** — `ssh deploy@<ip> bash /opt/carsua/compose/backup.sh nightly` once by hand; confirm the object in R2; do a restore test into a scratch container.
7. Pre-deploy gate: [security-checklist.md §7](security-checklist.md); submit `sitemap.xml`.

## Backups (free, only what cannot be rebuilt)

| Data                                                                                                                                                   | Backup                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.*` (users, sessions, settings…) + `registry.wanted_vehicles`, `news_items`, `social_posts`, `owner_posts`, `missed_lookups`, `ingested_resources` | `backup.sh nightly` at 03:30 → R2 `nightly/`, 14 days kept (KB–MB)                                                                               |
| `registry.registrations` + matview                                                                                                                     | source ZIPs in `/opt/carsua/archive` → `backup.sh archive` (~1.2 GB); one `backup.sh full` after each monthly ingest (keeps 2; size = your dump) |
| Scraped tables (wiki, RDW, MOT, safety, VehiclesDB…)                                                                                                   | none — rebuilt from the committed seed CSVs                                                                                                      |

R2 free tier = 10 GB (no egress fees). ZIPs + one full dump may exceed it — if so, keep one full dump or rely on ZIPs + re-ingest. Contabo
snapshots are an extra, not the backup. `pg_dump` caveat (verified): `--schema` is ignored once `-t` is used, so the script lists `-t 'app.*'`.

## Restore from R2

Setup on the VPS (a new server first needs First-time setup steps 1-3: Docker, `deploy-api` with `sync_only`, empty Postgres, `backup.env`):
`cd /opt/carsua/compose && export COMPOSE_FILE=docker-compose.prod.yml; set -a; . /opt/carsua/env/backup.env; set +a`.
Dumps carry no roles; the server role keeps the `POSTGRES_PASSWORD` secret.

**A. Lost or corrupted app data (VPS alive): nightly tables only.** Stop the api (or use maintenance mode) first.

```bash
f=$(rclone lsf R2:carsua-backups/nightly | sort | tail -1)   # any of the last 14 days
rclone copyto "R2:carsua-backups/nightly/$f" /opt/carsua/backups/restore.dump
docker compose cp /opt/carsua/backups/restore.dump postgres:/tmp/restore.dump
docker compose exec -T postgres pg_restore --clean --if-exists --no-owner -U carplates -d carplates /tmp/restore.dump
```

`--clean --if-exists` drops and recreates only those tables; changes since the last 03:30 run are lost. Tested 2026-10-28 on a populated scratch container
(`postgres:18.6`; restore, delete all `app.users` + `app.sessions`, restore again with `--clean --if-exists`): no errors, counts back to 2 users / 5 sessions.

**B. Total loss (new empty server): full first, then nightly on top.**

1. `rclone copyto "R2:carsua-backups/full/$(rclone lsf R2:carsua-backups/full | sort | tail -1)" /opt/carsua/backups/full.dump`, then
   `docker compose cp` it into the container and run, detached:
   `nohup docker compose exec -T postgres pg_restore -j 4 --no-owner -U carplates -d carplates --verbose /tmp/full.dump > /opt/carsua/backups/restore.log 2>&1 &`.
   Over an hour (indexes + `current_registration` refresh ~45 min). Done when no `pg_restore` and no `REFRESH MATERIALIZED VIEW` is active.
2. `VACUUM (ANALYZE)`, then apply the newest nightly as in A.
3. `deploy-api` normally, then `deploy-web`; check `/healthz`, a plate, a login.

Registry data lost with the full dumps: re-ingest from `archive/` ZIPs (`backup.sh archive`) or data.gov.ua (`ingest:*`).

## Still open

### Next steps after the first deploy (2026-10-27, in this order)

1. ✅ **R2 backups (done 2026-10-27).** `backup.sh nightly` and `backup.sh full` uploaded to `carsua-backups`; the nightly dump was restored into a scratch
   `postgres:18.6` container (create schemas `app` + `registry` first; 9 app tables, 6 registry tables) and the 1.28 GB full dump passed `pg_restore --list`
   (68 `TABLE DATA`). Gotcha: an object-scoped R2 token cannot check/create buckets, so rclone needs `RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true` (set in `backup.env`
   by `deploy-api`), else uploads fail with 403 AccessDenied. A `501 NotImplemented` on attempt 1 followed by success on attempt 2 is normal. A full dump takes
   ~10 min; run it under `nohup`. Nightly cron confirmed 2026-10-28 (`/etc/cron.d/carsua-backup`, 03:30 server time; dump in R2; healthchecks.io Started + OK).
   Manual `rclone` on the VPS needs `set -a; . /opt/carsua/env/backup.env; set +a` first (no rclone.conf). Never open the ping URL in a browser (counts as a ping).
   `backup.sh archive` works but is a no-op until the first VPS ingest fills `/opt/carsua/archive`; run it and `backup.sh full` after that ingest. Restore path A tested
   on a populated DB 2026-10-28 (see "Restore from R2"). Still to do: delete the old local `C:\tmp\carsua.dump` once comfortable.
2. ✅ **SSH hardening (fixed + verified 2026-10-27).** The check found the problem: sshd takes the first value it reads, `50-cloud-init.conf` (unreadable by
   `deploy`) beat `99-carsua.conf`, and password login was on. Renamed the drop-in to `00-carsua.conf` (`bootstrap.sh` now writes that name) and reloaded sshd;
   `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password deploy@<ip>` is now refused with no password prompt. Re-run that test after any sshd change.
   `deploy` has no sudo (no password, no sudoers entry; only the `docker` group), so root edits go through the Contabo VNC console as root, or a privileged
   container: `docker run --rm --privileged --pid=host alpine nsenter -t 1 -m -u -n -i sh -c '/usr/sbin/sshd -t && systemctl reload ssh'` (the `docker` group is
   effectively root).
3. ✅ **UptimeRobot (done 2026-10-28):** free plan, HTTP monitors every 5 min on `https://carsua.app/healthz` and the home page, email alerts. One healthchecks.io check per future cron job.
4. ✅ **Cloudflare settings (done 2026-10-28):** Full (strict), Always Use HTTPS, Min TLS 1.2, Automatic HTTPS Rewrites, HTTP/2 + HTTP/3 (Speed → Settings →
   Protocol; not on the Network page), Browser Cache TTL "Respect Existing Headers", Rocket Loader off, Bot Fight Mode, and one WAF rate-limit rule `api-lookup-limit`
   (Security → Security rules → zone level, not the Enterprise account WAF): `starts_with(uri.path, "/api/plate") or starts_with(…, "/api/vin")`, per IP, 30 requests
   / 10 s, Block 10 s (verified: ~30 × 200 then 429). HSTS is sent by Caddy (`max-age=31536000`), so Cloudflare's HSTS toggle stays off (a second source would
   duplicate or override it). Not done: "Under Attack" is a manual toggle for incidents. DNSSEC was turned off at Squarespace for the nameserver move; optionally
   re-enable it in Cloudflare and add the DS record at Squarespace.
5. **Pre-deploy security gate** ([security-checklist.md §7](security-checklist.md)), partly done 2026-10-28. Passed against the live site: `pnpm audit --prod` has
   no high/critical (nodemailer ^10.2.1 and `fast-uri >=4.2.3` bumped; the one left is a low `deepmerge` with no patch, accepted), HSTS/nosniff/Referrer/Permissions
   headers, `/api/docs` is not Swagger, `/api/admin/*` anonymous → 401, cross-site POST → 403, rate limits → 429 on `/api/plate/*` and `/api/auth/google`.
   Also passed: `gitleaks` on all 558 commits (clean); `trivy fs` on the lockfile + `infra/` (0 HIGH/CRITICAL); `nmap` of the VPS (only 22/80/443 reachable, 5432/6379/8088
   filtered; an open port 53 seen from the dev PC was the local network intercepting DNS, not the VPS: `ss` shows only loopback listeners and no container publishes 53);
   session cookie flags (`carsua_sid` HttpOnly + Secure + SameSite=Lax) and sign-out deleting the `app.sessions` row (count 5 → 4 → 5); email sign-in via Resend.
   ZAP baseline (passive, public pages): 0 FAIL, 9 WARN, all accepted: CSP not enforced (Report-Only, below), COEP/COOP missing (would break the YouTube/Disqus/Sketchfab
   embeds and the Google sign-in popup), `?lang=` reflection is whitelisted by `resolveLang`, the rest is cache/comment noise. `trivy image` (api/alpr, HIGH+CRITICAL): ~55 Debian OS
   findings per image with no fix available (re-scan after base-image bumps), plus 7 HIGH in the npm bundled with `node:24-slim`, now removed in `apps/api/Dockerfile`.
   Gotcha: Cloudflare Bot Fight Mode challenges GitHub runner IPs (403), so the post-deploy public `/healthz` check in `deploy-api.yml` is advisory only.
   Still open: enforce CSP (Report-Only in `infra/Caddyfile`, after ~1 week of clean reports), account-deletion test with a throwaway account,
   re-run `trivy image` after the next base-image update.
6. ✅ **Browser smoke test (done 2026-10-28):** home, plate page, link-preview card, Google login (authorised origin `https://carsua.app`), Telegram login (`/setdomain carsua.app`;
   check `TELEGRAM_BOT_USERNAME` is the production bot), a real email through Resend (`MAIL_FROM` is `carsua <noreply@carsua.app>`), VIN lookup, camera recognize
   (ALPR), Maps key restricted to the `carsua.app` referrer, Disqus.
7. **Secrets hygiene (rotation skipped by choice 2026-10-28).** Dev values were visible in screenshots/chat during the first deploy: rotate `POSTHOG_PERSONAL_API_KEY` and any other key you consider exposed.
   The production `AUTH_SECRET` and `POSTGRES_PASSWORD` are separate from the dev ones. Optional secrets still unset: `SENTRY_DSN` (only `VITE_SENTRY_DSN` is set, so
   server errors are not tracked), `PLATE_RECOGNIZER_CLOUD_TOKEN`. `TURNSTILE_*` is set (2026-10-27).
8. **Ingest cron (live 2026-10-28).** `deploy-ingest.yml` (path-filtered: `scripts/**`, shared, db, `infra/vps/*ingest*`) builds `scripts/Dockerfile`, pulls it on the VPS,
   writes `/opt/carsua/env/ingest.env` (`DATABASE_URL`, `HC_PING_*`), syncs `run-ingest.sh` / `ingest-status.sh` / the compose file and installs
   `infra/vps/ingest.cron` as the `deploy` user's crontab (replaces it; it was empty). Jobs: `news`, `social`, `wanted` daily, `plates` Tue + Fri
   (crontab times are the VPS's local time, CET). Details, the first-load procedure and gotchas: SCHEDULE.md. Check: `crontab -l`,
   `~/ingest-status.sh`, `SELECT * FROM registry.job_runs ORDER BY id DESC`. Skipped for now (2026-10-28), so ingest failures are not alerted: create one healthchecks.io check per job (news/social/wanted 1 d,
   plates 7 d + 1 d grace), add the GitHub secrets `HC_PING_NEWS|SOCIAL|WANTED|PLATES` to the `production` environment, re-run `deploy-ingest`.
   A `plates` run that loaded something runs `backup.sh archive` + `full` by itself. The first manual load (2026-10-28) is written up in
   `docs/plan-done.md` "Ingest cron".
9. Housekeeping: ✅ Contabo snapshot taken 2026-10-28 (auto-deletes 2026-11-27, take a fresh one before risky changes; a rollback also reverts the DB, so re-apply the newest nightly dump after); ✅ Telegram `@WebpageBot` refresh of `https://carsua.app` (card shows title, description and OG image; send each older shared plate/VIN URL separately, X needs nothing since nothing was shared there). Open: the Dependabot PRs (count not re-checked since 2026-10-27; keep the version pins from CLAUDE.md).

### Longer term

- Redis throttler store (not used by the app yet, so Redis is not in the compose file); until then limits are per-process and reset on restart,
  and blue/green briefly runs two api processes.
- CSP is Report-Only; enforce after a clean week. Cloudflare IP ranges in the Caddyfile: re-check against cloudflare.com/ips occasionally.
- Caddy edge `rate_limit` needs a custom build — left to Cloudflare's rule + the Nest throttler.
- Pin GitHub Actions by commit SHA once stable (Dependabot already tracks them).

## HTTP/2, HTTP/3, compression, caching

The Nest/Fastify API speaks plain HTTP/1.1 and does **no compression**; it sets `Cache-Control` itself (`apps/api/src/spa/spa.controller.ts`:
hashed `/assets/*` long-cache; `index.html` / `sw.js` / `registerSW.js` / `manifest.webmanifest` `no-cache`). TLS, h2, h3, compression and edge
rate limiting belong to the proxy. The real config is `infra/Caddyfile` + `infra/docker-compose.prod.yml`. Local dev (Vite `:5173`) is HTTP/1.1
and unbundled, so it says nothing about production.

**Caddy (in use)**

- Enables **h2 and h3 by default** and advertises h3 via `Alt-Svc` (browsers use h2 on the first visit, h3 afterwards).
- Compose must publish **`80`, `443` and `443/udp`**; the firewall must allow TCP 80, TCP 443 **and UDP 443**. Without UDP, h3 silently falls back to h2.
- Stock Caddy 2 ships **zstd and gzip only** — `encode br` fails to load ("module not registered: http.encoders.br", verified 2026-10-15).
  Brotli to browsers comes from Cloudflare, but only when the origin response is **uncompressed**: it passes an already gzip/zstd response
  through (seen 2026-10-28: `content-encoding: gzip` with `accept-encoding: br`). The Caddyfile therefore compresses only requests without
  `CF-Connecting-IP` (`@direct`); after deploying it, check `curl -sI -H 'accept-encoding: br' https://carsua.app/assets/<file>.js` shows
  `content-encoding: br` (purge the Cloudflare cache first: the gzip copy is cached for a year). Cloudflare → Speed → Optimization →
  Content Optimization → Brotli must be on.
- Do not add a second `Cache-Control` for `/assets/*` in Caddy — the app already sends the right one. Put a Caddy/CDN cache in front of `/og/*`.

**nginx (alternative, not used)** — `listen 443 ssl;` + `listen 443 quic reuseport;`, `http2 on; http3 on;`,
`add_header Alt-Svc 'h3=":443"; ma=86400' always;`, `gzip on` (brotli needs the `ngx_brotli` module), `proxy_pass http://127.0.0.1:3000`.

**Cloudflare in front** — h2/h3 + Brotli on by default; hashed `/assets/*` cached at the edge; SSL mode Full (strict). The client IP arrives in
`CF-Connecting-IP` (Fastify `trustProxy` + throttler tracker; only trust Cloudflare's IP ranges). The global rollups (`/api/stats/*` except `version`, `/api/fuel/stats`,
`/api/fuel/powertrains`, `/api/safety/stats`, `/api/wanted/stats`) send `Cache-Control: public, max-age=300`, but Cloudflare does not cache
JSON by default, so a Cache Rule "Cache API rollups" (created 2026-10-29, verified MISS → HIT) makes it effective at the edge: custom expression
`(http.host eq "carsua.app" and ((starts_with(http.request.uri.path, "/api/stats/") and http.request.uri.path ne "/api/stats/version") or http.request.uri.path in {"/api/fuel/stats" "/api/fuel/powertrains" "/api/safety/stats" "/api/wanted/stats"}))`,
"Eligible for cache", Edge TTL "Use cache-control header if present, bypass cache if not", Browser TTL "Respect origin TTL". Paste it via
"Edit expression" and never switch back to the builder (it cannot show `starts_with` / `in {}` and wraps the text into a wildcard value).

Per-model lookups (`/api/vdb`, `/api/rdw`, `/api/rdw/recalls`, `/api/wiki`, `/api/wiki/image`; keyed on brand/model/year, never on a plate or VIN) send
`Cache-Control: public, max-age=3600, s-maxage=86400` (recalls `max-age=900, s-maxage=3600`; `lookupCacheInterceptor` in `common/cache.ts`), and
`no-store` with `refresh=true`; `/api/vdb/stats` reuses the 5 min rollup value. A second Cache Rule "Cache model lookups" (**to create in the dashboard**)
makes it effective: expression
`(http.host eq "carsua.app" and http.request.uri.path in {"/api/vdb" "/api/vdb/stats" "/api/rdw" "/api/rdw/recalls" "/api/wiki" "/api/wiki/image"} and not http.request.uri.query contains "refresh")`,
"Eligible for cache", Edge TTL "Use cache-control header if present, bypass cache if not", Browser TTL "Respect origin TTL", cache key left at default
(full path + query string; do **not** enable "Ignore query string"). `/api/plate/*` and `/api/vin/*` stay uncached (per vehicle).

**Pitfall: Browser Cache TTL.** Cloudflare → Caching → Configuration → **Browser Cache TTL must be "Respect Existing Headers"**. At its 4-hour
default it rewrites the app's `no-cache` on `sw.js` / `index.html` / `registerSW.js` to `max-age=14400`, so browsers keep the old service
worker for hours after a deploy and the "new version" banner shows late or not at all (found 2026-10-27 via `cf-cache-status: EXPIRED` +
`cache-control: max-age=14400`). After changing it, purge `/sw.js` (Custom Purge) and re-check with `curl -sI https://carsua.app/sw.js`:
expect `cache-control: no-cache`.

**Verify**

```bash
curl -sI --http2 https://carsua.app | head -1        # HTTP/2 200
curl -sI --http3 https://carsua.app | head -1        # HTTP/3 200 (needs a curl built with HTTP/3)
curl -sI -H 'accept-encoding: br' https://carsua.app/assets/<hashed>.js | grep -i 'content-encoding\|cache-control'
```

Or DevTools → Network → right-click the header row → enable **Protocol** (`h2` / `h3`).

**Production-like check on your machine** — `pnpm preview:prod` = `pnpm build` + the API with `apps/api/preview.env` (`WEB_DIST_DIR=../web/dist`),
so Nest serves the built SPA on `:3000` (stop `pnpm dev`'s API first or pass `PORT=3100`). Still HTTP/1.1 and **uncompressed** — judge transfer by
gzip/brotli sizes. The PWA service worker is active there: use DevTools → Application → "Update on reload" / clear storage when comparing runs.
