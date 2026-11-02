# Security assessment, local pentest lab & hardening plan — carsua.app v2

## Context

The question came from a web-vuln checklist (Command Injection, CORS, CSRF, File Upload, IDOR,
LFI/RFI, Open Redirect, SQLi, SSRF, XSS, XXE) and asks: do we need CSP/SRI, are we safe from
XSS/CSRF, how do we harden, and can we pentest a local copy to *understand* the attacks before
securing. Intent is learning + verification on our own app — defensive. **No code changes now**
(user: "just make plan for now").

Key finding from exploration (3 Explore agents, verified against live code 2026-11-02): **the app
is already hardened well beyond the question's assumption.** A prior audit lives at
[docs/security-checklist.md](../../../../VSCode/Krak86/carplates-v2/docs/security-checklist.md)
(OWASP Top 10 map + the 11 threats + a pre-deploy gate). Its claims still hold. So this plan is a
**research/learning deliverable**, not a remediation project: (1) a consolidated verdict, (2) a
hands-on local pentest lab runbook, (3) the short list of genuinely-open items.

Architecture that matters for security:
`Internet → Cloudflare (TLS, WAF, edge cache) → VPS:443 → Caddy (headers, TLS) → api-blue|green (NestJS+Fastify) → Postgres`.
Security headers are split: **Caddy** (`infra/Caddyfile`) sets HSTS, Permissions-Policy, CSP
(Report-Only); the **API** (`apps/api/src/main.ts`) sets nosniff, X-Frame-Options, Referrer-Policy,
CORS, and a global CSRF `OriginGuard`.

---

## Part 0 — Security already in place (completed work, for the record)

Baseline delivered by the 2026-10-13 audit + subsequent fixes, verified against live code 2026-11-02.
Don't redo these; they're the floor the open items (Part 3) build on.

### Application / code (NestJS API + React SPA)
- **CSRF**: global `OriginGuard` (`Sec-Fetch-Site`/`Origin`) on every `/api` write — checklist finding #3 **fixed**.
- **Account safety**: `SudoGuard` (re-auth < 10 min) on set-email/link/unlink/delete + 14-day grace purge — finding #4 **fixed**.
- **Sessions**: `carsua_sid` 256-bit random, only SHA-256 stored, `HttpOnly; SameSite=Lax; Secure`, rotated per sign-in, logout deletes the row; hashed device cookie.
- **Env hardening**: `assertProductionEnv` refuses to boot prod with the dev DB / reflecting CORS — finding #5 **fixed**.
- **Static serving**: `distDir + path.sep` prefix check + `safeDecode` (no traversal / no 500) — finding #7 **fixed**.
- **Deps**: `fastify` 5.12.7 / `@nestjs/platform-fastify` 11.2.7 + `pnpm.overrides`; `pnpm audit --prod` **clean** — finding #1 **fixed**.
- **`target="_blank"`** noopener — finding #9 resolved (`rel="noreferrer"`).
- **Input**: Zod on all cross-boundary data; Drizzle parameterized; `sql.raw` only on constants/enums.
- **Uploads**: session-gated, 4 MB / 1-file cap, magic-byte sniff (client MIME ignored), EXIF/XMP/IPTC stripped, `sharp` re-encode + `limitInputPixels`, faces blurred, server-side recognition, private R2, token-only serving with `no-store`/`noindex`/`no-referrer`.
- **SSRF**: fixed outbound hosts; the one URL endpoint gated by a strict `static.nhtsa.gov` regex; ffmpeg via an argv array (no shell).
- **IDOR**: 128-bit capability tokens stored as SHA-256; owner routes scoped to the session `userId`.
- **Abuse**: `@nestjs/throttler` per-IP global + per-route caps; Turnstile on send-code.

### HTTP headers / edge
- **API** (`main.ts` `onSend`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`; CORS pinned to `PUBLIC_SITE_URL` in prod; 1 MB body / 4 MB multipart; `requestTimeout` 60s (slowloris).
- **Caddy**: HSTS `max-age=31536000`, Permissions-Policy, CSP (**Report-Only**).
- **Cloudflare**: Full (strict) TLS, min TLS 1.2, HTTP/3, Bot Fight Mode, WAF rate-limit rule `api-lookup-limit` (30 req/10s per IP on `/api/plate` + `/api/vin`); HSTS toggle off (Caddy owns it); `CF-Connecting-IP` trusted only from CF ranges.

### Docker / infra
- **Dev**: Postgres + Mailpit bound to `127.0.0.1` only (finding #6, dev part done).
- **Prod compose hardening** (tracked, finding #6 open): no published ports for Postgres/ALPR/Redis (internal network only), strong secret password, ALPR non-root + `read_only` + `cap_drop: [ALL]` + `no-new-privileges`, pinned image digests, resource limits.
- **ALPR**: untrusted-image parser kept internal-only, upload size cap, pin `requirements.txt` hashes.
- **Secrets**: never in Dockerfile `ENV`/`ARG`; env files written with `umask 077`; `.env*` gitignored.
- **Docker image scanning: Trivy** — `trivy image` for the api/web/alpr images, `trivy fs .` for the repo. (This is the image-security tool name to standardize on.) Run weekly in CI + before deploy.
- **Secret scanning: gitleaks** — pre-push hook + full-history check in the deploy gate.
- **Dependency automation: Dependabot** (npm, docker, actions; weekly); Node major + Python major/minor ignored on purpose (version pins).

### OWASP Top 10 (2021) — current status
| Risk | Status |
|---|---|
| A01 Broken access control | ✅ `userId`-scoped rows, `AdminGuard` (admin by SQL only) |
| A02 Cryptographic failures | ✅ 256-bit hashed tokens, Google ID token verified; HSTS at Caddy |
| A03 Injection | ✅ Drizzle params, no shell |
| A04 Insecure design | ⚠️ throttles in-memory/per-IP (Redis store planned) |
| A05 Security misconfiguration | ⚠️ CSP enforcement pending (else ✅) |
| A06 Vulnerable components | ✅ audit clean + Dependabot + Trivy |
| A07 Identification & auth failures | ✅ fresh token, secure cookie, logout revokes |
| A08 Software & data integrity | ✅ Zod + committed lockfile; SRI N/A by design (CSP covers) |
| A09 Logging & monitoring | ✅ Sentry; auth-event logging to expand |
| A10 SSRF | ✅ fixed hosts + regex gate |

### Verifications already performed (pre-deploy gate, `docs/deploy.md` 2026-10-28)
- `pnpm audit --prod` **clean**.
- Live header check: HSTS, nosniff, Referrer-Policy, Permissions-Policy present.
- `/api/admin/*` anon → **401**; cross-site POST → **403** (OriginGuard); rapid requests → **429**.
- **OWASP ZAP baseline scan: 0 FAIL / 9 WARN.**
- Cloudflare: Full (strict) + WAF rate-limit rule live.
- CSP confirmed still Report-Only (the one gap).

---

## Part 0.5 — Infrastructure security settings (Cloudflare / Caddy / VPS / Postgres)

The security-relevant platform config, with verified values + dates. Source of truth: `infra/Caddyfile`,
`infra/docker-compose.prod.yml`, `infra/vps/bootstrap.sh`, PLAN.md "Deploy-time security checklist",
`docs/deploy.md`. Stack: `Cloudflare → Caddy → api-blue|green → Postgres`, all on one VPS.

### Cloudflare (edge / WAF / CDN) — verified 2026-10-28
- **TLS**: SSL mode **Full (strict)**, Always Use HTTPS, **Min TLS 1.2**, Automatic HTTPS Rewrites.
- **HSTS toggle OFF** on purpose — Caddy sends HSTS; a second source would duplicate/override it.
- **WAF rate-limit rule `api-lookup-limit`** (zone level): `starts_with(uri.path,"/api/plate") or starts_with(…,"/api/vin")`, per IP, **30 req / 10 s, Block 10 s** (verified ~30×200 then 429).
- **Bot Fight Mode** on. "Under Attack" left as a manual incident toggle.
- **Origin trust**: only Cloudflare IP ranges are trusted; client IP read from `CF-Connecting-IP` (re-check CF ranges occasionally against cloudflare.com/ips).
- Protocols: HTTP/2 + HTTP/3; Brotli on; Rocket Loader off; edge Cache Rules for `/api` rollups.
- DNSSEC off during the nameserver move (optional re-enable + DS record).
- Gotcha: Bot Fight Mode challenges GitHub-runner IPs (403), so the post-deploy public `/healthz` check is advisory only.

### Caddy (reverse proxy / TLS terminator) — `infra/Caddyfile`
- **TLS** from the Cloudflare **origin cert** (`origin.pem`/`key`); `www` → apex 301.
- **`trusted_proxies` = Cloudflare ranges**, `client_ip_headers CF-Connecting-IP`; `header_up X-Forwarded-For {client_ip}` so only the *verified* IP reaches the API (blocks XFF spoofing — the basis for `TRUST_PROXY=true` being safe).
- **Headers**: HSTS `max-age=31536000`, Permissions-Policy (`camera=(self), geolocation=(self), microphone=()`), CSP (**Report-Only**).
- Blue/green `reverse_proxy` with `/healthz` checks; maintenance 503 flag; `handle_errors` → self-refreshing notice / JSON.
- **Caddy admin API (2019) unpublished.** Edge `rate_limit` dropped (needs a custom build) → covered by the Cloudflare rule + Nest throttler.

### VPS / OS (Contabo, `bootstrap.sh`) — firewall verified 2026-10-31, SSH 2026-10-27
- **Firewall (ufw)**: open **22, 80, 443 tcp + 443 udp** (UDP needed for HTTP/3); **closed/internal-only: 3000 (api), 5432 (Postgres), 6379 (Redis), 8088 (ALPR), 2019 (Caddy admin)** — confirmed from outside (`Test-NetConnection`/`nmap`) and on-host (`ss -tln`), IPv4 **and** IPv6.
- **SSH**: key-only (ed25519), **no root login, password login disabled** (drop-in `00-carsua.conf`; re-test `ssh -o PreferredAuthentications=password` after any sshd change). The `deploy` user has **no sudo** (only the `docker` group).
- **fail2ban** installed by bootstrap; **4 GB swap**; `/opt/carsua`; nightly backup cron. Contabo snapshot taken before risky changes.

### Postgres — `postgres:18.6`, internal-only
- Reachable **only on the internal Docker network** (5432 not published); `TRUST_PROXY=true` set only because the API port isn't publicly reachable.
- **Prod `POSTGRES_PASSWORD` ≠ dev**; `DATABASE_URL` must not be the dev `carplates:carplates@` default — `assertProductionEnv` **refuses to boot** otherwise.
- **Backups**: nightly `pg_dump -Fc` cron (03:30, `/etc/cron.d/carsua-backup`) → R2 via rclone (object-scoped token, `RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true`), healthchecks.io ping; **restore tested 2026-10-28**. Policy today: DB is derived/rebuildable (recovery = re-ingest); **the first user-writable table flips this to nightly `pg_dump --schema=app` + WAL/PITR** (Phase 5).
- ⚠️ Open (recommended): **least-privilege DB roles** — the API user shouldn't own schemas/DDL; migrations should use a separate role (checklist §4). `sslmode=require` if the DB ever becomes remote.

### Secrets / CI / monitoring
- Secrets in **env files outside git** (`umask 077`), `.env*` gitignored, never in Dockerfile `ENV`/`ARG`; deploy via GHCR image + rsync, blue/green.
- **gitleaks** clean on all commits; **`trivy fs`** clean (0 HIGH/CRIT on lockfile + `infra/`); **`trivy image`** = ~OS findings with no fix (re-scan after base-image bumps); npm bundled in `node:24-slim` removed from `apps/api/Dockerfile`.
- Prod `AUTH_SECRET`/`POSTGRES_PASSWORD` separate from dev; key rotation skipped by choice (rotate `POSTHOG_PERSONAL_API_KEY` if considered exposed).
- Monitoring: **UptimeRobot** on `/healthz` + home (5 min). ⚠️ Open: confirm **server Sentry** events actually arrive (`SENTRY_DSN` set); add a **429-spike alert**; healthchecks.io per ingest cron.

### Open infra items (feed Part 3)
Enforce CSP (+ report sink) · HSTS `includeSubDomains`/`preload` · **Redis-backed throttler** (shared counters across blue/green restarts) · Postgres least-privilege roles · confirm server Sentry + 429 alert · re-run `trivy image` after base-image bumps · pin GitHub Actions by commit SHA.

---

## Part 1 — Consolidated assessment (answers to the 5 questions + the 11-vuln menu)

### The 5 questions

**Q1. Do we need CSP and SRI? Worth it?**
- **CSP: yes, high value — and it's already written, just not enforced.** `infra/Caddyfile:27`
  ships a full `Content-Security-Policy-Report-Only` policy (`default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`, explicit `script-src`/`frame-src`
  allow-lists for Google, Telegram, Turnstile, PostHog, Disqus, YouTube, Sketchfab, Maps). Enforcing
  it is the single biggest remaining XSS/clickjacking backstop. Tracked as finding #2 in the checklist.
- **SRI: low value here, correctly skipped.** SRI pins a hash of a third-party file. Our third-party
  scripts (Google Identity, PostHog, Telegram widget, Turnstile, Disqus) load from vendor origins that
  rotate their bundles and don't publish stable hashes — SRI would break on their next deploy. CSP
  (origin allow-listing) is the right control for these. SRI only pays off for self-hosted or
  version-pinned CDN assets, which we don't rely on. Documented as an accepted gap (checklist A08).

**Q2. Are we secured from XSS and CSRF?**
- **XSS — yes.** React escapes by default; `dangerouslySetInnerHTML`/`innerHTML`/`document.write`/
  `insertAdjacentHTML` return **zero** matches in `apps/web`. Server-side HTML (`apps/api/src/spa/meta.ts:34`
  `esc()` on title/description/OG url+image/hreflang; JSON-LD emits `<` as `<`); OG SVG text escaped
  in `apps/api/src/spa/og-card.ts:28` and then rasterized to PNG anyway. Residual: CSP not yet enforced
  (that's the backstop, not a code defect).
- **CSRF — yes, defense in depth.** Session cookie `carsua_sid` is `HttpOnly; SameSite=Lax; Secure`
  (`apps/api/src/auth/session-cookie.ts`), **plus** a global `OriginGuard`
  (`apps/api/src/common/origin.guard.ts`, registered `app.module.ts`) that rejects non-safe-method
  `/api/*` writes unless `Sec-Fetch-Site` is same-origin/none or `Origin` matches `PUBLIC_SITE_URL`.

**Q3. What can we do to secure the app?** → see Part 3 (prioritized hardening). Short version: enforce
CSP + add a violation-report endpoint, clear the `pnpm audit --prod` high-severity deps, add HSTS
`includeSubDomains`/`preload`, and set a minimal header fallback at the API origin so headers survive a
direct-origin hit that bypasses Caddy.

**Q4. Verify the 11 web-vuln classes.** Table below.

**Q5. Can we emulate attacks locally to understand then secure?** Yes — Part 2 is the runbook. Hard
rule: **only ever against a local instance**, never production (Cloudflare WAF + Nest throttler treat
scans as a real attack and answer 429; `docs/deploy.md` warns against it explicitly).

### The 11-vuln menu — verdicts (verified in code)

| # | Class | Verdict | Evidence |
|---|---|---|---|
| 1 | **Command Injection** | ✅ Protected | Only `child_process` use is ffmpeg, spawned with an **argv array** (not a shell) in `apps/api/src/safety/safety-video.service.ts`; input is a strict `static.nhtsa.gov` regex first. |
| 2 | **CORS Misconfiguration** | ✅ Protected | `apps/api/src/main.ts:41` — prod origin pinned to `PUBLIC_SITE_URL`; `origin:true` + credentials only when `NODE_ENV!=production`, and `env.ts assertProductionEnv` refuses to boot prod misconfigured. |
| 3 | **CSRF** | ✅ Protected | `SameSite=Lax` + global `OriginGuard` (above). |
| 4 | **File Upload** | ✅ Protected | 4 MB/1-file multipart cap (`main.ts:40`); session required; magic-byte sniff (client MIME ignored), EXIF/XMP/IPTC rejected, `sharp` re-encode + `limitInputPixels`, faces blurred, no-plate refused; private R2, served only via token w/ `no-store`/`noindex` (`apps/api/src/shares/*`). |
| 5 | **IDOR** | ✅ Protected | Share links are 128-bit random capability tokens stored as SHA-256; owner routes filter by session `userId` (`shares.repository.ts`), uniform `410 Gone` for unknown/expired. |
| 6 | **LFI/RFI** | ✅ Protected | Static serving compares against `distDir + path.sep` and `safeDecode` (checklist finding #7, fixed 2026-10-13); no user-path file reads; ESM imports are static. |
| 7 | **Open Redirect** | ✅ Not present | No `res.redirect`/`Location` built from input; `window.location` writes are same-origin only; `?lang=`/`?section=` validated. (Re-check when a `next=`/`returnTo=` login param lands — relative-only rule noted.) |
| 8 | **SQL Injection** | ✅ Protected | Drizzle parameterizes; every `sql.raw` takes a constant/enum-keyed lookup (`SOURCE_COLUMN[source]` with `source` a Zod enum), never request text. |
| 9 | **SSRF** | ✅ Protected | All outbound `fetch` go to fixed env hosts; user input only enters as `encodeURIComponent`'d path/query. The one URL-accepting endpoint (crash-video) is gated by a strict `^https://static\.nhtsa\.gov/...` regex before any fetch. |
| 10 | **XSS** | ✅ Protected | See Q2. CSP enforcement is the remaining backstop. |
| 11 | **XXE** | ➖ Not applicable | **No XML parsing in production.** `jsdom` is only the Vitest test env; upstream responses are JSON via `res.json()` + Zod. No `DOMParser`/`fast-xml-parser`/`xml2js`. |

---

## Part 2 — Hands-on local pentest lab (runbook; nothing runs during planning)

Goal: attack a **local** copy, watch each defense fire, and understand *why* it blocks. Each probe
lists the command/payload and the expected (secured) result. This is a runbook to execute later.

### Lab setup (local, isolated)
1. `pnpm db:up` (Postgres + Mailpit on 127.0.0.1 via `infra/docker-compose.yml`).
2. `pnpm dev` (API `:3000`, web `:5173`) — or `pnpm preview:prod` to serve the built SPA from the API
   on `:3000` (closer to prod, exercises the real `spa.controller`).
3. For load/throttle probes only: set `THROTTLE_DISABLED=true` (ignored when `NODE_ENV=production`) so
   the rate limiter doesn't mask other behavior. Turn it back off to test throttling itself.
4. Optional realism: `pnpm tunnel` (Cloudflare tunnel) to get https locally — needed only to exercise
   Google/Telegram/Turnstile, which require https.
5. **Never** target `https://carsua.app`. All probes hit `http://localhost:3000` / `:5173`.

### Probes (payload → expected secured result)
- **Headers baseline** — `curl -sI http://localhost:3000/` and `/api/auth/me`: expect
  `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `referrer-policy`. Note CSP/HSTS are
  absent locally (Caddy adds them) — that itself is a finding → Part 3 origin-fallback item. Compare the
  prod surface later with `securityheaders.com`, SSL Labs, Mozilla Observatory against the live URL
  (passive, allowed — those don't attack, they read headers).
- **XSS (reflected into meta)** — request a plate/VIN path with `"><script>alert(1)</script>` in it;
  view-source the returned HTML. Expect the payload HTML-escaped inside `<meta>` (`esc()`), never a live
  tag. Try the OG card route too; expect a PNG.
- **XSS (stored/DOM)** — put `<img src=x onerror=alert(1)>` into any free-text field the UI renders
  (contact, display name). Expect React to render it as literal text.
- **CSRF** — from a different origin (e.g. a scratch `file://` page or `http://localhost:9999`), run
  `fetch('http://localhost:3000/api/auth/logout',{method:'POST',credentials:'include'})`. Expect **403**
  from `OriginGuard` (Sec-Fetch-Site: cross-site). Repeat for `DELETE /api/auth/me`.
- **SQLi** — pass `' OR '1'='1` / `1;DROP TABLE` as a plate/make/region filter. Expect a normal empty/
  valid result, no SQL error, parameters bound. (Confirm in the API log that the query is parameterized.)
- **SSRF** — hit the crash-video endpoint with `?url=http://169.254.169.254/latest/meta-data/` and with
  `http://localhost:3000/`. Expect rejection by the `static.nhtsa.gov` regex before any fetch.
- **IDOR** — create a share, then (a) try a random/sequential token → expect `410 Gone`; (b) as user B,
  `DELETE /api/shares/<user-A-uuid>` → expect it not found/not deleted (scoped to `userId`).
- **File upload** — upload a `.php`/`.svg` renamed to `.jpg`, an oversized image, and a JPEG with EXIF
  GPS. Expect: non-image rejected by magic-byte sniff; oversize rejected; stored image stripped of EXIF
  and face-blurred; no-plate image refused.
- **Clickjacking** — load the site inside an `<iframe>` on a local page. Expect it blocked by
  `X-Frame-Options: SAMEORIGIN` (and `frame-ancestors 'self'` once CSP is enforced).
- **Open redirect** — append `?next=//evil.com` / `?returnTo=https://evil.com` to routes. Expect no
  off-site navigation (no such param is honored today).
- **Rate limiting** — with throttling ON, loop 200 rapid `GET /api/plate/*` and `POST /api/auth/google`.
  Expect `429` after the per-route cap (`PLATE_LOOKUP_THROTTLE` 100/min, auth 20/15min).
- **Automated sweep** — OWASP **ZAP baseline** against the **local** instance only:
  `zap-baseline.py -t http://localhost:3000`. Treat as a regression check; triage any medium+ alert.
  (A prior ZAP baseline run recorded 0 FAIL / 9 WARN — see `docs/deploy.md`.)

### Suggested learning references (passive reading)
- The hackviser XSS tactics page the user linked, and OWASP's XSS / CSRF / SSRF cheat sheets — read to
  map each probe above to the underlying technique. Keep the existing `docs/security-checklist.md` open
  alongside; it already names the control for each threat.

---

## Part 3 — Prioritized hardening list (open items; not executed now)

Ordered by value/effort. All are infra/ops, not code-architecture; the code-level surfaces are clean.

1. **Enforce CSP** (finding #2, High). After a clean week of Report-Only consoles, rename the Caddy
   header `Content-Security-Policy-Report-Only` → `Content-Security-Policy`. Verify it applies to the
   **SPA HTML + static assets**, not just `/api` (checklist §flags this), then confirm on live with
   `curl -sI`. File: `infra/Caddyfile:27`.
2. **Add a CSP violation-report sink** (do this *before* enforcing). Today the policy has no
   `report-uri`/`report-to`, so violations only reach whoever has DevTools open — you can't judge a
   "clean week" on real traffic. **Recommended approach: a thin same-origin endpoint that forwards to
   Sentry** (reuse the Sentry you already have; do **not** build storage/dashboard yourself, and do
   **not** add a new vendor — CSP reports are dominated by browser-extension/AV/ISP noise, so you want
   dedup + filtering, which Sentry already does).
   - Caddy: add `report-uri /api/csp-report` to the policy (same-origin → no new CSP allow-list entry, no
     public Sentry ingest key in the header). `infra/Caddyfile:27`.
   - API: a new `POST /api/csp-report` route — accepts `application/csp-report` + `application/reports+json`,
     `@Throttle`'d (open unauthenticated POST = abuse target), Zod-validated, **filters noise**
     (`blocked-uri` of `chrome-extension:`/`moz-extension:`/`safari-extension:`/`about`/`data`/empty), then
     forwards survivors to Sentry via the SDK. Follows the "new cacheable/public endpoint" + `@Throttle`
     conventions in CLAUDE.md (and `common/throttle.ts`).
   - Zero-code fallback if preferred: point `report-uri` straight at the Sentry security endpoint and rely
     on Sentry inbound filters (accept the public ingest key in the header; verify the Sentry plan still
     accepts security/CSP reports).
   - Keep it running after enforcing — its long-term job is catching third-party drift (Google/PostHog
     adding a new domain later surfaces as a report, not a user-facing break).
3. **Dependency audit — already clean, keep it recurring.** Finding #1 was fixed 2026-10-13
   (`fastify` 5.12.7 / `@nestjs/platform-fastify` 11.2.7 + `pnpm.overrides`; `pnpm audit --prod` clean).
   No outstanding high-sev deps. Action is ongoing, not a one-off: `pnpm audit --prod --audit-level=high`
   in CI (fail on high) + Dependabot + weekly `trivy image`/`trivy fs .`; re-verify against the lockfile
   before each deploy.
4. **HSTS `includeSubDomains; preload`** (finding, Medium). `infra/Caddyfile:24` currently
   `max-age=31536000` only. Add the flags once subdomains are all-HTTPS; submit to the preload list after
   it's stable.
5. **Origin-level header fallback** (Medium, defense-in-depth). Caddy owns CSP/HSTS/Permissions-Policy;
   a request that reaches the API origin directly (bypassing Caddy) loses them. Add a minimal fallback in
   the Fastify `onSend` hook (`apps/api/src/main.ts:35`) so the origin is never header-naked.
6. **`react/jsx-no-target-blank` lint rule** (finding #9, Low) so the one missing `rel="noopener"` can't
   regress.
7. **Operational hardening** already tracked in the checklist §4–§7 (prod Docker compose with no exposed
   Postgres/ALPR ports, Redis-backed throttle store, Trivy image scans, gitleaks pre-push, per-account
   login counters before any password flow). Reference, don't re-plan here.

---

## Critical files (reference, not to edit now)
- [docs/security-checklist.md](../../../../VSCode/Krak86/carplates-v2/docs/security-checklist.md) — the authoritative audit; this plan consolidates + updates it.
- `infra/Caddyfile` — CSP/HSTS/Permissions-Policy (edge).
- `apps/api/src/main.ts` — nosniff/X-Frame-Options/Referrer-Policy/CORS/body limits.
- `apps/api/src/common/origin.guard.ts`, `common/throttle.ts`, `common/cache.ts` — CSRF guard, rate limits, cache headers.
- `apps/api/src/spa/meta.ts`, `spa/og-card.ts` — server HTML escaping.
- `apps/api/src/auth/session-cookie.ts` — session cookie flags.
- `apps/api/src/shares/*` — upload validation + capability-token IDOR model.
- `docs/deploy.md`, `README.md` — deploy pipeline, env, "never scan production" warning, local dev setup.

## Verification (how to confirm, when executed later)
- Run each Part 2 probe against the local instance; every one should yield the "expected secured result".
- `curl -sI` the local then (passively) the live URL; compare header sets.
- After any Part 3 change: re-run the relevant probe + `pnpm audit --prod` + the existing CSRF/guard
  unit tests; for CSP enforcement, confirm no console violations for a representative set of pages
  (lookup, share, auth, embeds) before flipping Report-Only off.

## Scope / non-goals
- **No code or config changes in this pass** (user: research only). Part 3 items are planned, not applied.
- Do not run any scanner, load test, or probe against `https://carsua.app` or the live origin — local
  instance only.

---

## Execution plan — who does what (ordered)

Status as of 2026-11-02: assessment complete, **nothing in the app changed**. Remaining work below.
Legend: 👤 = you (Ruslan) · 🤖 = Claude (next session). "[code]" = touches code/config → show the diff first.

**Phase A — docs into the repo (doc-only, safe to do first)**
1. 🤖 **Update `docs/security-checklist.md`**: bump "as of" to the current date, mark the newly-verified items ✅, add the **CSP report-sink design** to finding #2, correct **finding #1** to fixed/recurring, and reflect the **Part 0.5 infra settings** status. Keep CLAUDE.md doc conventions.
2. 🤖 **Create `docs/pentest-lab.md`** from Part 2 (the local-only attack runbook: setup + per-vuln payload → expected blocked result + ZAP baseline). Cross-link it with `security-checklist.md`.
3. 👤 **Review + commit** the new/updated mds.

**Phase B — CSP enforcement (the biggest single win)**
4. 🤖 Add **`POST /api/csp-report`** (throttled, Zod-validated, noise-filtered, forwards to Sentry) + `report-uri /api/csp-report` in `infra/Caddyfile`. [code]
5. 👤 Deploy, then **exercise every flow for ~1 week** (plate/VIN lookup, Google/Telegram/email auth, Turnstile, YouTube/Sketchfab/Maps embeds, Disqus, PostHog, share) and watch the Sentry CSP reports.
6. 👤+🤖 When reports are clean: flip **`Content-Security-Policy-Report-Only` → `Content-Security-Policy`** in `infra/Caddyfile`; re-walk the flows on the live enforced version. [code]

**Phase C — smaller hardening (as time allows)**
7. 🤖 **HSTS `includeSubDomains; preload`** in `infra/Caddyfile` once all subdomains are confirmed HTTPS. [code]
8. 🤖 **Origin-level header fallback** in `apps/api/src/main.ts` `onSend` (so a direct-origin hit isn't header-naked). [code]
9. 🤖 Draft **`pnpm security:check`** + a CI job (audit-high + gitleaks + Trivy) and the Dependabot path trigger. [code]
10. 👤 Decide on **Redis-backed throttler** and **Postgres least-privilege roles** (bigger infra changes — schedule separately).

**Phase D — set the cadence once (from Part 3 / checklist §6)**
11. 🤖 Wire the tiered schedule: CI gates on every PR + every dep-update PR (blocking); weekly Trivy/Dependabot; monthly Sentry-CSP + live-header review; quarterly ZAP baseline vs staging.

## Handoff for the next session

Paste this into a fresh session tomorrow:

> Continue the carsua.app security-hardening work. Read `docs/security-hardening-plan-2026-11.md`
> (committed) and `docs/security-checklist.md` first. Context: the assessment is done and the app is
> already well-hardened; the remaining work is doc consolidation → CSP enforcement → minor hardening.
> **Do Phase A only, doc-only, no code:** (1) update `docs/security-checklist.md` — bump the date, mark
> verified items, add the CSP report-sink design to finding #2, correct finding #1 to fixed/recurring,
> and reflect the Part 0.5 infra settings; (2) create `docs/pentest-lab.md` from the plan's Part 2
> (local pentest runbook), cross-linked with the checklist. Follow CLAUDE.md doc conventions. Do **not**
> touch code or infra yet — stop after the docs and give me a suggested commit message. We'll do Phase B
> (the `/api/csp-report` endpoint + CSP enforcement) after I review.
