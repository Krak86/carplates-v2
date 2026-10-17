# Deploying to the VPS

Status (2026-10-15): everything below is **written and locally tested, but never run on a real VPS**. Tested locally: api image builds,
boots, migrates; ALPR image runs hardened (non-root, read-only, no caps); Caddyfile + compose run as a stack (h2, zstd, headers, blue/green
switch with zero non-200s, outage page/JSON, maintenance flag); `deploy-web.sh` against a Linux container; workflows pass `actionlint`.
Not testable here: real SSH deploys, Cloudflare, R2, `pg_restore` of the real DB, HTTP/3 through Cloudflare.

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

| Workflow          | Triggers on                                                                 | Does                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy-web.yml`  | `apps/web/**`, `packages/shared/**`                                         | CI → build with `VITE_*` vars → rsync to `releases/<sha>` → keep old hashed assets → atomic symlink swap → purge Cloudflare entry files. **No api restart.**     |
| `deploy-api.yml`  | `apps/api/**`, `packages/shared/**`, `packages/db/**`, `infra/**`, lockfile | CI → image to GHCR → sync compose/Caddyfile → write env files from secrets → migrate → start idle colour → wait healthy → stop old colour → reload Caddy → check |
| `deploy-alpr.yml` | `services/alpr/**`                                                          | image to GHCR → roll the container → wait healthy                                                                                                                |

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

**Contabo** — order _Cloud VPS 6_, EU (Germany), image **Ubuntu 24.04**, paste your SSH public key (`ssh-keygen -t ed25519 -C carsua-admin`, then
`~/.ssh/id_ed25519.pub`). Contabo emails "Your login data" with the **IPv4/IPv6** and root; the same is in my.contabo.com → _Your services_ →
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

| Variables (public once deployed)                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VPS_USER` (= `deploy`), `PUBLIC_SITE_URL` (`https://carsua.app`), `MAIL_TRANSPORT`, `MAIL_FROM`, `MAIL_REPLY_TO`, `GOOGLE_CLIENT_ID`, `TELEGRAM_BOT_USERNAME`, `TURNSTILE_SITE_KEY`  |
| `PLATE_RECOGNIZER_CLOUD_ENABLED`, `POSTHOG_PROJECT_ID`, `SENTRY_ORG_SLUG`, `ENABLE_TELEMETRY`, `BACKUP_BUCKET`                                                                        |
| Web build: `VITE_API_BASE` (leave empty), `VITE_DISQUS_SHORT_NAME`, `VITE_ENABLE_TELEMETRY`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_SENTRY_DSN`, `VITE_GOOGLE_MAPS_EMBED_KEY` |

`VITE_*` values are bundled into public JS — restrict `VITE_GOOGLE_MAPS_EMBED_KEY` to the `carsua.app` referrer in Google Cloud. Also set
`https://carsua.app` as an authorised origin for the Google client, and Telegram `/setdomain carsua.app`. `NODE_ENV`, `TRUST_PROXY`,
`WEB_DIST_DIR`, `ALPR_LOCAL_URL` are fixed in the compose file; `GIT_SHA` is set per deploy.

## First-time setup (in this order)

1. **Bootstrap** — `scp infra/vps/bootstrap.sh root@<ip>:` then `ssh root@<ip> 'DEPLOY_PUBKEY="…" CI_PUBKEY="…" bash bootstrap.sh'`. Creates `deploy`,
   locks SSH (key-only, no root), ufw (22/80/443 tcp, 443 udp), fail2ban, Docker, 4 GB swap, `/opt/carsua`, nightly backup cron. **Open a second terminal
   and `ssh deploy@<ip>` before closing the root session.**
2. **Cloudflare + GitHub** — as above (DNS can propagate while you continue).
3. **Images + files** — run `deploy-alpr`, then `deploy-api` with **`sync_only` ticked**: it builds the api image, copies compose/Caddyfile, writes
   the env files and cert, and starts **only Postgres** (empty). It does _not_ migrate or start the api.
4. **Copy the whole local database** (all schemas and tables; not an ingest):
   - Locally: `SELECT count(*) FROM registry.registrations` — expect ~24.7M (real data).
   - `docker exec carplates-v2-postgres-1 pg_dump -Fc -Z 6 -U carplates carplates > carsua.dump` — smaller than the 23 GB on disk because the dump
     holds rows only; **indexes and the `current_registration` matview (8.9 GB) are rebuilt on restore**. The real size is whatever the file is.
   - `rsync -P --partial carsua.dump deploy@<ip>:/opt/carsua/backups/` (resumable).
   - On the VPS (`cd /opt/carsua/compose`, `export COMPOSE_FILE=docker-compose.prod.yml`):
     `docker compose exec -T postgres pg_restore -j 4 --no-owner -U carplates -d carplates < /opt/carsua/backups/carsua.dump`, then
     `docker compose exec postgres psql -U carplates -c "ALTER ROLE carplates PASSWORD '<POSTGRES_PASSWORD>'"` (the restored role keeps the _local_
     password; the api uses the secret) and `VACUUM ANALYZE`. Budget 30–90 min. Compare `count(*)` of the big tables with local.
   - Faster/no-rebuild alternative: stop local Postgres and copy the `pgdata` volume (~23 GB, same 18.6 image) into `/opt/carsua/pgdata`.
5. **Run `deploy-api` normally** (migrator is a no-op on the restored DB), then `deploy-web`. Check `https://carsua.app/healthz`, a plate, a VIN, camera recognize.
6. **Backups** — `ssh deploy@<ip> bash /opt/carsua/compose/backup.sh nightly` once by hand; confirm the object in R2; do a restore test into a scratch container.
7. Pre-deploy gate: [security-checklist.md §7](security-checklist.md); UptimeRobot; submit `sitemap.xml`.

## Backups (free, only what cannot be rebuilt)

| Data                                                                                                                                                   | Backup                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.*` (users, sessions, settings…) + `registry.wanted_vehicles`, `news_items`, `social_posts`, `owner_posts`, `missed_lookups`, `ingested_resources` | `backup.sh nightly` at 03:30 → R2 `nightly/`, 14 days kept (KB–MB)                                                                               |
| `registry.registrations` + matview                                                                                                                     | source ZIPs in `/opt/carsua/archive` → `backup.sh archive` (~1.2 GB); one `backup.sh full` after each monthly ingest (keeps 2; size = your dump) |
| Scraped tables (wiki, RDW, MOT, safety, VehiclesDB…)                                                                                                   | none — rebuilt from the committed seed CSVs                                                                                                      |

R2 free tier = 10 GB (no egress fees). ZIPs + one full dump may exceed it — if so, keep one full dump or rely on ZIPs + re-ingest. Contabo
snapshots are an extra, not the backup. `pg_dump` caveat (verified): `--schema` is ignored once `-t` is used, so the script lists `-t 'app.*'`.

## Still open

- `ingest-cron` image + `run-job.ts` + crontab (SCHEDULE.md) — not built; monthly ingest and `ingest:wanted` must be run by hand on the VPS until then
  (`wanted` loses history on skipped days). There is no `ingest` image yet, so `backup.sh full/archive` are manual too.
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
  Brotli to browsers comes from Cloudflare, which re-compresses.
- Do not add a second `Cache-Control` for `/assets/*` in Caddy — the app already sends the right one. Put a Caddy/CDN cache in front of `/og/*`.

**nginx (alternative, not used)** — `listen 443 ssl;` + `listen 443 quic reuseport;`, `http2 on; http3 on;`,
`add_header Alt-Svc 'h3=":443"; ma=86400' always;`, `gzip on` (brotli needs the `ngx_brotli` module), `proxy_pass http://127.0.0.1:3000`.

**Cloudflare in front** — h2/h3 + Brotli on by default; hashed `/assets/*` cached at the edge; SSL mode Full (strict). The client IP arrives in
`CF-Connecting-IP` (Fastify `trustProxy` + throttler tracker; only trust Cloudflare's IP ranges). A short-TTL edge cache for read-only `/api/*`
lookups (stats, vdb, rdw, wiki) is a PLAN.md Phase 4 item.

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
