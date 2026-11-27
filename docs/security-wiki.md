# Security wiki - carsua.app v2

Status of every security control and every open step, layer by layer. **Grep `^## ` and `^### Step`, never read whole.**
Companions: [security-checklist.md](security-checklist.md) (pre-deploy gate, findings table), [pentest-lab.md](pentest-lab.md) (local attack runbook),
[origin-hardening-plan.md](origin-hardening-plan.md) (origin lockdown), [deploy.md](deploy.md). Cloud ALPR (Plate Recognizer) is out of scope (not in use).

## 1. Status and legend

As of **2026-11-25**. Repo: **public** (confirmed 2026-11-25), so CodeQL, the Security tab (SARIF), GitHub secret scanning and push protection are available at no cost. Source: three read-only surveys of the repo (infra, API, web and supply chain). Nothing was probed on production.

Legend: ✅ done · ❌ open (step #) · 🔍 verify · 🤖 code/config (diff shown first) · 👤 owner action (dashboard, VPS, account) · effort **S** < 1 h, **M** half a day, **L** 1-2 days.

| #   | Layer                | Done             | Open steps     |
| --- | -------------------- | ---------------- | -------------- |
| 1   | User OS and device   | D1-D2            | 29             |
| 2   | Browser and frontend | D3-D11, D56      | 27, 28, 31, 32 |
| 3   | Cloudflare, CDN, DNS | D12-D14          | 32             |
| 4   | Network and provider | D15              | 32             |
| 5   | Ubuntu host          | D16-D19          | 19, 25         |
| 6   | Docker               | D20-D23          | 13, 14, 15, 19 |
| 7   | Caddy                | D24-D26          | 16, 17, 18     |
| 8   | API (NestJS)         | D27-D40, D57-D58 | 7-10           |
| 9   | Postgres and Redis   | D41-D44          | 12, 15, 20     |
| 10  | ALPR (Python)        | D45, D51         | -              |
| 11  | Supply chain and CI  | D46-D49, D52-D55 | 24, 26         |
| 12  | Accounts and people  | D50              | 32             |

## 2. Twelve-Factor and security

Twelve-Factor is about **operability**, not security. It helps only through III (config), V (build/release/run), X (parity), XI (logs). It says nothing
about authentication, input handling, least privilege, the network or the supply chain. The app is compliant (audit: PLAN.md "Twelve-Factor audit").

| #    | Factor              | Status           | How the app uses it                                                                                    | Security relevance                 |
| ---- | ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| I    | Codebase            | Fully            | One monorepo, many deploys (blue/green, `stage` branch)                                                | Traceable code, one place to scan  |
| II   | Dependencies        | Partly           | `pnpm-lock.yaml` frozen, `packageManager` pinned. ALPR `requirements.txt` hash-pinned (step 21)        | Reproducible builds, supply chain  |
| III  | Config              | Fully, with gaps | Zod `env.ts` + `assertProductionEnv`, ALPR fails closed. Secrets visible in `docker inspect` → step 15 | Secrets out of code                |
| IV   | Backing services    | Fully            | Postgres, Redis, ALPR, mail, R2 all by URL                                                             | Swappable and isolatable → step 13 |
| V    | Build, release, run | Fully            | SHA-tagged images, rollback by `image_tag`, immutable web build. `:latest` also pushed → step 26       | Integrity, provenance              |
| VI   | Processes           | Partly           | Stateless API, sessions in DB, throttle counters in Redis. `contact-limiter` in memory by design       | Scale without sticky state         |
| VII  | Port binding        | Fully            | `PORT`; only Caddy publishes 443                                                                       | Small exposed surface              |
| VIII | Concurrency         | Partly           | Ingest is its own process (advisory lock). Timers run inside the API (fine at one replica)             | n/a                                |
| IX   | Disposability       | Fully            | `enableShutdownHooks`, exec-form `CMD`, healthchecks, `stop_grace_period: 30s`                         | Fast patch rollout                 |
| X    | Dev/prod parity     | Fully            | Same Postgres 18.6 and Redis in dev and prod; dev binds 127.0.0.1                                      | Bugs reproducible locally          |
| XI   | Logs                | Partly           | stdout JSON, rotated json-file, Sentry. PII scrubbed (D56, D57). No Caddy access log → step 16         | Audit trail vs PII leak            |
| XII  | Admin processes     | Fully            | Migrations, seed, ingest as one-off `compose run --rm` with the release image                          | Same audited image for admin tasks |

"Beyond the Twelve-Factor App" (Hoffman, 2016) adds **API first**, **Telemetry**, **Authentication and authorization**. Mapped here: curated public OpenAPI
subset (D36); Sentry + PostHog (D56, D57); sessions, guards, sudo mode (D28-D30).

## 3. Standards and tools

Yardsticks: **OWASP Top 10** and **ASVS 5.0 L2** (mapped in security-checklist §2), **CIS Docker and Ubuntu benchmarks** (Lynis, docker-bench), **OpenSSF Scorecard**.

**Trivy vs Lynis: keep both, they do not overlap.**

|              | Trivy                                                                                      | Lynis                                                                                |
| ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Checks       | Artifacts: npm/pip CVEs, image OS packages, Dockerfile/compose misconfig, secrets in files | The running Ubuntu host: SSH, PAM, sysctl, permissions, services, firewall, auditing |
| When / where | Build time, in CI, every PR and weekly                                                     | Run time, on the VPS only (on a CI runner it would audit GitHub's VM)                |
| Licence      | Apache-2.0                                                                                 | GPL-3.0                                                                              |

docker-bench-security covers the gap between them (CIS Docker daemon and runtime) and runs on the VPS with Lynis.

- **Lynis in CI: no.** Monthly cron on the VPS (step 25).
- **ZAP baseline in CI: yes**, weekly and `workflow_dispatch`, against the local stack inside CI, never carsua.app (step 24). `.zap/rules.tsv` ignores the header rules Caddy owns (guarded by `caddyfile-headers.test.ts`). Active scans stay manual, local only.

| Need                 | Tool                                    | Licence             | Alternatives (pros / cons)                                                                                                                                                                                               |
| -------------------- | --------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secrets in git       | gitleaks (CLI or image)                 | MIT                 | trufflehog: verifies secrets live, more noise · GitHub secret scanning: free on public repos, cloud-side only. The official gitleaks-action needs a licence key for organisation repos                                   |
| Deps, images, IaC    | Trivy                                   | Apache-2.0          | Grype (+Syft): simpler, no IaC · Docker Scout: not fully OSS                                                                                                                                                             |
| Second advisory feed | OSV-Scanner                             | Apache-2.0          | `pnpm audit` only: GitHub advisories only                                                                                                                                                                                |
| SAST                 | Opengrep (or Semgrep CE)                | LGPL-2.1            | CodeQL: deeper, free only on public repos · SonarQube Cloud: free on public repos, runs in `quality.yml` for quality (bugs, smells, duplication, coverage), not as a security gate · SonarQube Community: needs a server |
| DAST                 | OWASP ZAP baseline                      | Apache-2.0          | Nuclei (MIT): fast CVE templates, less app-logic · Nikto: dated                                                                                                                                                          |
| Host audit           | Lynis, docker-bench-security            | GPL-3.0, Apache-2.0 | OpenSCAP + CIS profile: formal, heavy · Wazuh: full SIEM, too heavy for one VPS                                                                                                                                          |
| SBOM, provenance     | Syft, `actions/attest-build-provenance` | Apache-2.0, free    | cosign keyless: also verifies at deploy, more scripting                                                                                                                                                                  |
| Backup encryption    | age                                     | BSD                 | rclone crypt: transparent, key on the VPS · gpg: clunky                                                                                                                                                                  |
| Supply-chain score   | OpenSSF Scorecard                       | Apache-2.0          | none needed                                                                                                                                                                                                              |

## 4. Layer wiki (done items, D-n)

Each row: what is in place, where, and the real-world reason it matters. CVE status is in section 6.

### Layer 1 - User OS and device

| ID  | Control                                                                                         | Where                                    | Why it matters                                |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| D1  | Session cookie `carsua_sid` HttpOnly, SameSite=Lax; DB stores only a SHA-256 of a 256-bit token | `apps/api/src/auth/session-cookie.ts`    | Firesheep (2010) cookie hijack; CWE-1004      |
| D2  | No auth token in JS storage; share tokens cleared on sign-out                                   | `components/auth/use-auth-actions.ts:58` | Malware or extensions cannot read the session |

Open: history, favorites and offline cache survive sign-out → step 29.

### Layer 2 - Browser and frontend

| ID  | Control                                                                                                                                                                                                                                                                | Where                                                               | Why it matters                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| D3  | CSP enforced since 2026-11-21: no `unsafe-inline` for scripts, `frame-ancestors 'self'`, `object-src 'none'`, report sink `/api/csp-report`                                                                                                                            | `infra/Caddyfile:48-81`                                             | British Airways Magecart (2018)     |
| D4  | Fonts self-hosted; third-party script hosts allow-listed                                                                                                                                                                                                               | `Caddyfile` CSP                                                     | Polyfill.io takeover (2024)         |
| D5  | No `dangerouslySetInnerHTML`, `eval`, `new Function`, markdown renderer                                                                                                                                                                                                | grep, `apps/web`                                                    | CVE-2018-6341 class (React SSR XSS) |
| D6  | Zod `jitless`, `zod-config` first import                                                                                                                                                                                                                               | `lib/zod-config.ts`, `main.tsx:1`                                   | Lets CSP forbid `eval`              |
| D7  | Service worker never caches `/api`; prompted update                                                                                                                                                                                                                    | `vite.config.ts:150-297`                                            | No stale or poisoned personal data  |
| D8  | No production source maps                                                                                                                                                                                                                                              | `vite.config.ts`                                                    | No source disclosure                |
| D9  | Every `target=_blank` has `noopener`/`noreferrer`                                                                                                                                                                                                                      | `components/ExternalLink.tsx:19`                                    | Reverse tabnabbing (CWE-1022)       |
| D10 | Telegram widget isolated in its own page with its own CSP, origin-checked `postMessage`                                                                                                                                                                                | `public/telegram-frame.*`, `lib/telegram-login.ts:24`               | Contains the one `eval`             |
| D11 | SPA, no React Server Components, so not exposed to CVE-2025-55182                                                                                                                                                                                                      | architecture                                                        | RSC deserialization RCE             |
| D56 | `?p=<token>` removed from the address bar after reading (Chrome still keeps the original URL in its history, which JS cannot erase); token, plate and VIN scrubbed from PostHog and Sentry URLs, breadcrumbs, transactions; Sentry `share_ref` tag is a SHA-256 prefix | `use-shared-photo.ts`, `lib/telemetry-scrub.ts`, `lib/telemetry.ts` | CWE-598, CWE-359                    |

Open: 27 (lint rules), 28 (iframe sandbox), 31 (Trusted Types), 32 (Maps key restriction).

### Layer 3 - Cloudflare, CDN, DNS

| ID  | Control                                                                                                 | Where                                  | Why it matters                                                |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| D12 | SSL Full (strict), Always HTTPS, min TLS 1.2                                                            | `origin-hardening-plan.md` §4          | Prevents edge-to-origin downgrade                             |
| D13 | Authenticated Origin Pulls (mTLS), per-zone CA, cert valid to 2036                                      | `Caddyfile:14-17`, `secrets/README.md` | Origin reachable only through Cloudflare (CWE-693 WAF bypass) |
| D14 | WAF rate rule `api-lookup-limit` 30 req / 10 s on `/api/plate`, `/api/vin`; Bot Fight Mode; cache rules | dashboard                              | Scraping and enumeration                                      |

DNSSEC and CAA are on (2026-11-26; DS record at Squarespace, Verisign analyzer green). Open: origin IP change (H7), account hardening → step 32.

### Layer 4 - Network and provider (Contabo)

| ID  | Control                                                                                                                        | Where                      | Why it matters                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------- |
| D15 | ufw: only 22 and 443; `cf-firewall.sh` admits Cloudflare ranges only (ipset, `DOCKER-USER` chain, IPv6 `INPUT`), daily refresh | `infra/vps/cf-firewall.sh` | Docker publishes ports around ufw (CWE-284) |

Open: IPv6 lockdown not tested from outside, SSH tunnel decision (H11) → step 32.

### Layer 5 - Ubuntu host

| ID  | Control                                                        | Where                          | Why it matters                                  |
| --- | -------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| D16 | SSH: keys only, no root, `AllowUsers deploy`, `MaxAuthTries 3` | `infra/vps/bootstrap.sh:36-45` | CVE-2024-6387 regreSSHion                       |
| D17 | unattended-upgrades                                            | `bootstrap.sh:59`              | CVE-2024-3094 xz backdoor was fixed by upgrades |
| D18 | fail2ban (stock config)                                        | `bootstrap.sh:58`              | SSH brute force                                 |
| D19 | `deploy` user has no sudo                                      | `bootstrap.sh:26`              | CVE-2021-3156 class (sudo privilege escalation) |

Open: CI key restrictions, reboot policy, auditd, logrotate → step 19. Lynis baseline → step 25. Note: `deploy` is in the docker group, which is effectively root (CWE-250).

### Layer 6 - Docker

| ID  | Control                                                                                                      | Where                            | Why it matters                                         |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------ |
| D20 | api, alpr, ingest, redis: `cap_drop: ALL`, `no-new-privileges`; api, alpr non-root; alpr `read_only` + tmpfs | `docker-compose.prod.yml:27-107` | CVE-2019-5736, CVE-2024-21626 runc escapes are blunted |
| D21 | Exact image tags (`caddy:2.11.9`, `redis:8.10.3-alpine`, `postgres:18.6`), no `latest` in prod compose       | `docker-compose.prod.yml`        | Surprise upgrades                                      |
| D22 | Only Caddy publishes a port; dev ports bound to 127.0.0.1                                                    | compose files                    | Postgres exposure                                      |
| D23 | json-file rotation 10m x 5, memory limits on api, alpr, redis, ingest                                        | `docker-compose.prod.yml:9-11`   | Log disk exhaustion                                    |

Open: segmentation → 13; Caddy and Postgres hardening, pids limits → 14; digests, Redis password → 15; `daemon.json` → 19.

### Layer 7 - Caddy

| ID  | Control                                                                                                    | Where               | Why it matters                                                    |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| D24 | `trusted_proxies` = Cloudflare ranges, `client_ip_headers CF-Connecting-IP`, `X-Forwarded-For` overwritten | `Caddyfile:4-7,110` | Header-trust bypass class (CVE-2025-29927 is the Next.js example) |
| D25 | HSTS 1 year, Permissions-Policy, COOP, Origin-Agent-Cluster                                                | `Caddyfile:37-44`   | Downgrade and cross-origin isolation                              |
| D26 | Maintenance flag and `handle_errors`                                                                       | `Caddyfile:90-131`  | Controlled failure pages                                          |

Open: CORP, Server header, admin off, body limit, access log → 16; HSTS flags → 17; IP list drift → 18.

### Layer 8 - API (NestJS on Fastify)

| ID  | Control                                                                                                                                                                                                | Where                                                                | Why it matters                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| D27 | Global `ZodValidationPipe` + `zodParam`                                                                                                                                                                | `app.module.ts:126`                                                  | CWE-20                                                           |
| D28 | Global CSRF `OriginGuard` (`Sec-Fetch-Site`, `Origin` fallback)                                                                                                                                        | `common/origin.guard.ts`                                             | CWE-352                                                          |
| D29 | `SudoGuard` (recent re-auth) for destructive account changes; `AdminGuard` with the role only in the DB                                                                                                | `auth/session.guard.ts:33-58`                                        | CWE-269                                                          |
| D30 | Google ID token (RS256, iss, aud, exp, `email_verified`); Telegram HMAC + `timingSafeEqual` + 24 h; email code HMAC, 5 attempts, 15 min                                                                | `auth/google-id-token.ts`, `telegram-login.ts`, `email-challenge.ts` | CVE-2015-9235 (alg confusion) is not applicable: no JWT sessions |
| D31 | Global throttle (30/s, 150/min, 1500/h) in Redis with per-route overrides; Turnstile on email code and contact                                                                                         | `common/throttle.ts`, `auth/turnstile.ts`                            | CWE-307                                                          |
| D32 | No `sql.raw` fed by request text; Drizzle parameterizes                                                                                                                                                | grep `sql.raw`                                                       | CWE-89                                                           |
| D33 | HTML escaping in meta and OG, `<` escaped in JSON-LD                                                                                                                                                   | `spa/meta.ts:38-79`, `og-card.ts:28`                                 | CWE-79                                                           |
| D34 | Static path: safe decode, `..` rejected, `distDir + sep`                                                                                                                                               | `spa.controller.ts:147-163`                                          | CVE-2021-41773 class                                             |
| D35 | Generic 5xx body, stack only to log and Sentry                                                                                                                                                         | `common/all-exceptions.filter.ts:144`                                | CWE-209                                                          |
| D36 | Swagger off in production; public OpenAPI is a curated read-only subset                                                                                                                                | `env.ts:185`, `main.ts:62`                                           | Smaller attack surface                                           |
| D37 | CORS pinned to `PUBLIC_SITE_URL` in production                                                                                                                                                         | `main.ts:45-48`                                                      | Credentialed cross-origin reads                                  |
| D38 | JSON body 1 MiB, multipart 4 MB / 1 file, request timeout 60 s                                                                                                                                         | `main.ts:23-43`                                                      | CWE-770                                                          |
| D39 | Share uploads: magic bytes, EXIF stripped, sharp pixel limit                                                                                                                                           | `shares/helpers.ts:20-36`                                            | CVE-2023-4863, CVE-2016-3714                                     |
| D40 | `fastify` 5.12.7 / `@nestjs/platform-fastify` 11.2.7 via `pnpm.overrides` (finding #1, fixed 2026-10-13)                                                                                               | `pnpm-workspace.yaml:29-35`                                          | Known high advisories                                            |
| D58 | Recognize uploads: `image` field required, magic-byte type check (JPEG/PNG/WebP), client filename and MIME dropped, generic 502 bodies on ALPR, VIN OCR, Plate Recognizer, Pixabay and NHTSA           | `apps/api/src/recognize/read-upload.ts`                              |
| D59 | `fetchJson`: timeout over the whole exchange, byte cap, Zod parse; used by VIN decode, photos, safety ratings, Turnstile                                                                               | `common/fetch-json.ts`                                               | CWE-400, CWE-770, CWE-20                                         |
| D60 | Own throttle on `/api/photos` and `/api/safety/video`; `/api/market/go/:id` redirects only to listed source domains                                                                                    | `common/throttle.ts`, `market/carapis-parse.ts`                      | CWE-770, CWE-601                                                 |
| D57 | Sentry `beforeSend`/`beforeSendTransaction` drop body, query, cookies, Cookie/Authorization headers; plate, VIN, card and share paths, Referer, transaction and breadcrumb URLs become route templates | `apps/api/src/sentry-scrub.ts`, `instrument.ts`                      | CWE-532                                                          |

Open: 10.

### Layer 9 - Postgres and Redis

| ID  | Control                                                                                          | Where                            | Why it matters                                                                    |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------- |
| D41 | Internal network only, no published port                                                         | `docker-compose.prod.yml`        | Direct DB access                                                                  |
| D42 | `assertProductionEnv` refuses dev credentials                                                    | `env.ts:165-177`                 | Default-credential boot                                                           |
| D43 | Nightly dump to R2 (14 days), full dump after ingest, restore tested 2026-10-28, healthchecks.io | `infra/vps/backup.sh`            | Ransomware and loss                                                               |
| D44 | Redis: password, AOF, `noeviction`, no published port                                            | `docker-compose.prod.yml:87-107` | CVE-2025-49844 needs auth and network reach; both blocked. Keep the image patched |

Open: roles → 12 (timeouts done, step 11); Redis password on command line → 15; backup encryption → 20.

### Layer 10 - ALPR service (Python, `services/alpr`)

| ID  | Control                                                                                                           | Where                                           | Why it matters                          |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| D45 | Non-root uid 10001, read-only, internal network, 6 MB upload cap, `hmac.compare_digest` key check                 | `services/alpr/app.py:408-422`, `Dockerfile:28` | Image parsers are a classic RCE surface |
| D51 | `requirements.txt` hash-pinned (`pip-compile --generate-hashes`), Dockerfile `--require-hashes`, Dependabot `pip` | `services/alpr/requirements.in`, `Dockerfile`   | torchtriton dependency confusion (2022) |

Open: none.

### Layer 11 - Supply chain and CI

| ID  | Control                                                                                                                                                                                                                                                                       | Where                                                            | Why it matters                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| D46 | Frozen lockfile in CI and both Dockerfiles (`ci.yml`, `deploy-web.yml`, `apps/api/Dockerfile`, `scripts/Dockerfile`; checked 2026-11-25); the lockfile holds a sha512 per package and also pins pnpm itself (`@pnpm/exe`); `allowBuilds` (install scripts blocked by default) | `pnpm-workspace.yaml:7-16`                                       | event-stream (2018), ua-parser-js (2021)              |
| D47 | `pnpm audit --prod --audit-level=high` in CI, Dependabot npm/docker/actions                                                                                                                                                                                                   | `ci.yml:28`, `.github/dependabot.yml`                            | Log4Shell (CVE-2021-44228) is why SCA exists          |
| D48 | `permissions: contents: read`, `production` environment, pinned SSH host key, `umask 077` env files, 40-char SHA regex for rollback                                                                                                                                           | `.github/workflows`, `infra/ci/lib.sh`                           | Least privilege in CI                                 |
| D49 | No secret ever committed (history checked), `.gitignore` and `.dockerignore` cover env, keys, secrets                                                                                                                                                                         | `.gitignore`                                                     | Uber (2016) keys on GitHub                            |
| D52 | pnpm `minimumReleaseAge: 1440` (new releases wait 24 h)                                                                                                                                                                                                                       | `pnpm-workspace.yaml`                                            | Shai-Hulud worm, chalk/debug compromise (2025)        |
| D53 | Third-party Actions pinned to commit SHAs; Dependabot `cooldown` on every ecosystem (npm: 3 days, minor 5, major 14)                                                                                                                                                          | `.github/workflows`, `.github/actions`, `.github/dependabot.yml` | tj-actions/changed-files (CVE-2025-30066)             |
| D54 | Dependabot also covers `pip` (alpr), docker (`/scripts`, `/infra`); key globs in `.gitignore`                                                                                                                                                                                 | `.github/dependabot.yml`, `.gitignore`                           | Stale images and leaked keys                          |
| D55 | `security.yml`: gitleaks (full history), `trivy fs`/`config`, OSV-Scanner, Opengrep (SARIF), CodeQL per PR, push to main and weekly; `trivy image` weekly. Scanners are release binaries with a pinned SHA-256, `pnpm security:check` runs them locally                       | `.github/workflows/security.yml`, `infra/ci/security-check.mjs`  | Codecov uploader (2021), Toyota key (2022), Log4Shell |

Open: 24, 26, 30.

### Layer 12 - Accounts and people

| ID  | Control                      | Where                | Why it matters    |
| --- | ---------------------------- | -------------------- | ----------------- |
| D50 | VPS and CI use SSH keys only | `bootstrap.sh:36-45` | Password spraying |

Branch protection on `main` is a ruleset since 2026-11-26. The `production` environment reviewer is saved (2026-11-26). Secret scanning, push protection, dependency graph, Dependabot alerts and security updates are on (2026-11-26). Open: 2FA on every account, Dependabot malware alerts, `SECURITY.md` plus private vulnerability reporting → step 32.

## 5. Steps (open items)

Tick the box and add a `docs/plan-done.md` entry when a step is finished. "Verify" is the concrete check. Order (updated 2026-11-27; `+` = do in one PR or one deploy, `∥` = runs in parallel):
done: 1-9, 11, 21-23, 30, 33. Remaining, in order:

1. **Step 32 leftovers (H7 origin IP, H11 SSH, optional terraforming)** ∥ everything below; owner-only, no code.
2. **13 + 14 + 15**, then **16 + 17 + 18**: all infra config, one compose and Caddy deploy (13-15 touch `docker-compose.prod.yml`, 16-18 touch the Caddyfile). 17 needs a subdomain HTTPS check first.
3. **10**, then **19 + 20**: 10 is small API code; 19 and 20 are VPS work. **20 (backups) must be done before 12.**
4. **25 → 24 → 26**, then **27 + 28** (same ESLint and iframe pass), **29**. 25 gives the lynis baseline that 19 is verified against, so run it right after 19 on the VPS.
5. **12 (L)** last among the risky ones: role changes can break the app, so it needs the step 20 backup and a restore drill. **31** after that (needs a clean week of reports).

### A. Privacy and fail-closed config

### Step 1 - Strip the share token and scrub web telemetry [x] · S · 🤖 · layer 2

- **What:** the share link `/<plate>?p=<token>` keeps the bearer token in the address bar, and PostHog sends the full URL on every page view (`telemetry.ts:55`); Sentry's `beforeSend` drops only `query_string`. Remove `?p=` with `replaceState` after reading it; scrub token, plate and VIN from the URL in PostHog `before_send` and Sentry `beforeSend`/`beforeBreadcrumb`. Confirm the Sentry `request.url` claim while doing it (it was not verified).
- **Files:** `apps/web/src/routes/SearchRoute.tsx:253`, `apps/web/src/lib/telemetry.ts:27-64`, release version in `packages/shared/src/releases/<yyyy-mm>.ts`.
- **Why:** CWE-598 (sensitive data in a query string), CWE-359.
- **Alternatives:** token in `#fragment` (never sent to servers; breaks server-side OG previews that read `?p=`) · PostHog `property_denylist` (no code; misses Sentry and breadcrumbs).
- **Known limit:** the browser logs the URL at navigation, before JS runs, so the recipient device history keeps the original `?p=` entry (a `#fragment` is stored too). Only a server-side cookie + 302 redirect would keep it out of the visible history; not done.
- **Verify:** unit test for the scrubbers; local run with telemetry on, open a share link, DevTools network shows no token in PostHog/Sentry payloads.

### Step 2 - Scrub plates and VINs from API Sentry events [x] · S · 🤖 · layer 8 (bundle with step 1)

- **What:** `beforeSend` removes body, query string and cookies but not the path, so `/api/plate/:plate` and `/api/vin/:vin` reach Sentry on 5xx. Rewrite to route templates.
- **Files:** `apps/api/src/instrument.ts`.
- **Why:** CWE-532 (sensitive data in logs).
- **Alternatives:** Sentry server-side scrubbing rules (no code; data still leaves the VPS).
- **Verify:** unit test; a forced 5xx locally shows `/api/plate/:plate`.

### Step 3 - Fail-closed production secrets [x] · S · 🤖 · layer 8

- **What:** `assertProductionEnv` requires `TURNSTILE_SECRET_KEY` and `ALPR_API_KEY`. Today an unset Turnstile key passes every token (`auth/turnstile.ts:19`) and an unset ALPR key leaves ALPR open.
- **Files:** `apps/api/src/env.ts`, its test, `infra/` env docs.
- **Why:** CWE-636 (not failing securely).
- **Alternatives:** switch the feature off when the secret is unset (app still boots; silent feature loss).
- **Verify:** env test: production without either key throws.

### Step 4 - ALPR fails closed and hides its docs [x] · S · 🤖 · layer 10 (bundle with step 3)

- **What:** exit at startup when `ALPR_API_KEY` is unset; `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)`.
- **Files:** `services/alpr/app.py:37,408`; add a pytest.
- **Why:** CWE-636, CWE-200.
- **Verify:** pytest; `curl localhost:8088/docs` is 404.

### B. API input and output

### Step 5 - Recognize upload checks (local and VIN) [x] · S-M · 🤖 · layer 8

- **What:** recognize trusts the client MIME type, accepts any multipart field name, forwards the client filename and echoes upstream `err.message` in 502s (`local-recognize.service.ts:60`, same pattern in Pixabay and NHTSA). Reuse the magic-byte check from shares, require the field name, drop the filename, return generic 502 text.
- **Files:** `apps/api/src/recognize/read-upload.ts`, `local-recognize.service.ts`, `vin-recognize.service.ts`, `shares/helpers.ts` (reuse), `photos`, `nhtsa` services.
- **Why:** CVE-2023-4863 libwebp, CVE-2016-3714 ImageTragick, CWE-209.
- **Alternatives:** re-encode with sharp before forwarding (strongest, strips polyglots; CPU and latency) · `file-type` package (more formats; new dependency).
- **Verify:** tests: a text file renamed `.jpg` is rejected; 502 body is generic.
- **Done 2026-11-26:** `readUpload` requires the `image` field, sniffs the magic bytes (JPEG, PNG, WebP; the client MIME type and filename are dropped, `UploadedImage` has no `filename`) and answers 400 naming the rejected format (HEIC/HEIF, AVIF, GIF, BMP, TIFF) or the generic "Unsupported image format". The web `recognize.badImage` text now says only JPEG, PNG and WebP work (not HEIC, GIF or AVIF), ua/ru/en. The browser re-encodes to JPEG first, so only a file it cannot decode (HEIC in Chrome) reaches this 400. 502s from ALPR, VIN OCR, Plate Recognizer, Pixabay and NHTSA (ratings, recalls, complaints, video) are fixed strings; the upstream message goes to the server log. The shares route shares `readUpload`, so it gets the same field and type checks.

### Step 6 - Hostile-input tests [x] · S · 🤖 · layer 8 (bundle with step 5)

- **What:** missing tests: `<script>` and `"` in a plate through `renderMetaTags` title and description; `../` and encoded traversal against SPA static serving.
- **Files:** `apps/api/src/spa/meta.test.ts`, a new spa controller test.
- **Why:** CWE-79, CVE-2021-41773.
- **Verify:** tests pass, and fail when the escaping is removed.
- **Done 2026-11-26:** `meta.test.ts` (markup, quotes and `&` in title, description, image, og:url) and `spa.controller.test.ts` "hostile paths" (nine traversal variants: plain, encoded, double-encoded, backslash, NUL; malformed %-escapes are never 5xx; a `<script>` plate is not reflected). Checked by replacing `esc` with the identity: 4 tests fail.

### Step 7 - `fetchJson` helper (timeout, byte cap, Zod) [x] · M · 🤖 · layer 8

- **What:** one helper `fetchJson(url, schema, { timeoutMs, maxBytes })`. Today `vin/vin.service.ts:44` has no timeout, nothing caps response size (checklist rule 3), and recognize, `photos.service.ts:57`, `safety.service.ts:139`, `turnstile.ts:26` use plain `as` casts.
- **Files:** new `apps/api/src/common/fetch-json.ts`; migrate the callers above (cloud recognize is skipped).
- **Why:** CWE-400, CWE-770, CWE-20.
- **Alternatives:** `ky` or `got` with hooks (battle-tested; new dependency, Zod still manual) · undici `Agent` limits (no schema validation).
- **Verify:** tests: timeout, oversize body, schema failure each reject; existing service tests green.
- **Done 2026-11-27:** `common/fetch-json.ts` `fetchJson(url, schema, { timeoutMs, maxBytes, init })`: one `AbortSignal.timeout` over the connection and the body read, a `Content-Length` pre-check plus a streamed byte count (the reader is cancelled at the cap), JSON parse, `schema.safeParse`. It throws `FetchJsonError` (`kind`: network, timeout, status, too-large, invalid-json, schema; `status` for a non-ok answer) whose message never carries response content. Migrated: `vin.service` (NHTSA decode, which had no timeout at all; a failure still falls back to the registry rows), `photos.service` (a 429 still maps to 503), `safety.service` (the hand-written `interface`s became Zod schemas), `turnstile` (still fails closed). 2 MiB default cap (`DEFAULT_JSON_MAX_BYTES`), 64 KiB for Turnstile. **Not migrated:** cloud recognize (as planned), and the other `fetch` callers (`fx`, `losses`, `stocks`, `ria`, `nhtsa.service`, `carapis.provider`, `ukrainealarm`, `logs`, `mail`, `usage/*`, `safety-video` file download): they are outside this step's list; the video download still reads the whole body into memory with only a 30 s timeout (its URL is pinned to one NHTSA path pattern).

### Step 8 - Throttle the expensive routes [x] · S · 🤖 · layer 8

- **What:** `safety/video` (downloads a file and runs ffmpeg) and `photos` (spends Pixabay quota) only have the global limit. Add `@Throttle` values in `common/throttle.ts`.
- **Files:** `safety/safety.controller.ts:118`, `photos` controller, `common/throttle.ts`.
- **Why:** CVE-2016-1897/1898 show the ffmpeg attack surface; CWE-770.
- **Alternatives:** Cloudflare WAF rate rule (blocks at the edge; free plan has few rules).
- **Verify:** throttle test; follow the checklist "new `/api/*` endpoint" item.
- **Done 2026-11-27:** `PHOTOS_THROTTLE` (30/min per IP) on `GET /api/photos`; `SAFETY_VIDEO_THROTTLE` (6/min and 60/h per IP) on `GET /api/safety/video`. `throttle.test.ts` reads the decorator metadata off both handlers. A cached clip still counts against the cap (the throttler runs before the cache lookup).

### Step 9 - Host allowlist on the `/go/:id` redirect [x] · S · 🤖 · layer 8 (bundle with step 8)

- **What:** the redirect only checks `https:`. Add an allowlist of upstream hosts.
- **Files:** `apps/api/src/market/carapis-parse.ts:73,145`, `market.controller.ts:26-33`.
- **Why:** CWE-601 (open redirect).
- **Alternatives:** interstitial "leaving carsua.app" page (visible to users; extra click).
- **Verify:** test: an off-list host is refused.
- **Done 2026-11-27:** `LISTING_HOSTS` and `isListingUrl` in `market/carapis-parse.ts`; `GET /api/market/go/:id` answers 204 (the web falls back to a search link) unless the stored URL is https, has no credentials and its host is a listed domain or a subdomain of one (`evilauto.ria.com`, `auto.ria.com.evil.example` and `auto.ria.com@evil.example` are refused). The check runs at redirect time, so URLs already stored in the Postgres cache are covered. The list is built from the 17 source names in `MARKET_SOURCE_NAMES` and is **a best guess of each source's domain, not verified against live CarAPIS answers** (only `auto.ria.com` was in the fixtures): after deploy, open the listing link of one card per source and add any domain that answers 204.

### Step 10 - Origin fallback headers [ ] · S · 🤖 · layer 8

- **What:** if a request reaches the API without Caddy, HSTS and CSP are missing. Set a minimal HSTS and CSP in the Fastify `onSend` hook only when absent, so `csp/caddyfile-headers.test.ts` "no duplicates" stays green.
- **Files:** `apps/api/src/main.ts:34-42`.
- **Why:** defence in depth; origin is already behind mTLS (D13).
- **Alternatives:** `@fastify/helmet` (complete; duplicates Caddy, breaks the no-duplicates test).
- **Verify:** direct hit on the API port locally shows the headers; behind Caddy they are not doubled.

### C. Database

### Step 11 - Postgres timeouts and pool limits [x] · S · 🤖 · layer 9

- **What:** `new Pool({ connectionString })` has no `max`, `connectionTimeoutMillis`, `idleTimeoutMillis` or timeouts. Set them and `options: '-c statement_timeout=15000 -c idle_in_transaction_session_timeout=30000 -c lock_timeout=5000'`; ingest overrides through env.
- **Files:** `packages/db/src/client.ts:54-57`, ingest env.
- **Why:** CWE-400.
- **Alternatives:** `ALTER ROLE ... SET statement_timeout` after step 12 (enforced server-side; needs roles first) · PgBouncer (rejected in origin-hardening §5).
- **Verify:** test: `SELECT pg_sleep(60)` is cancelled; ingest still completes.
- **Done 2026-11-27:** `createDb(url, limits?)` takes `DbLimits` (`max`, connect and idle timeouts, `statement_timeout`, `idle_in_transaction_session_timeout`, `lock_timeout` via the libpq `options` string; `buildPgOptions` is unit-tested). Limits are **opt-in per caller**: only the API (`DbService`) passes them, from env `DB_POOL_MAX` 10, `DB_CONNECT_TIMEOUT_MS` 5000, `DB_IDLE_TIMEOUT_MS` 30000, `DB_STATEMENT_TIMEOUT_MS` 30000, `DB_IDLE_IN_TX_TIMEOUT_MS` 30000, `DB_LOCK_TIMEOUT_MS` 5000 (0 disables a timeout). Ingest and scripts call `createDb()` with no limits, so long `COPY`/`REFRESH` statements are unaffected and need no env override. **Statement timeout is 30 s, not the 15 s in "What":** on 2026-11-27 a cold-cache advanced search (`oper=215`, with and without `color`) took 8 s and 12 s in the browser; the same query is 25-70 ms warm (`EXPLAIN`: index scan, ~28k scattered pages of a 5.9 GB heap, 241-byte rows). The cold reads happen right after an ingest refresh rewrites `current_registration`. `pg_prewarm` was rejected: the heap is 5.9 GB of 11 GiB RAM shared with a 23 GB database, so it would evict everything else. Still to check after deploy: `SELECT pg_sleep(60)` through the API pool is cancelled, and no real endpoint hits 30 s.

### Step 12 - Least-privilege roles [ ] · L · 🤖👤 · layer 9

- **What:** today one superuser (`carplates`) serves api, ingest, migrations and `pg_dump`. Create `carsua_owner` (migrations), `carsua_app` (DML on `app.*`, SELECT on `registry.*`), `carsua_ingest` (DML on `registry.*`); `REVOKE CREATE ON SCHEMA public`; separate `DATABASE_URL`s; passwords set by a VPS runbook, never in SQL.
- **Files:** new `packages/db/migrations/NNNN_roles.sql` (table-level named FKs rule not relevant; no applied migration is edited), `deploy-api.yml`, `infra/vps/run-ingest.sh`, `docs/deploy.md`, PLAN.md "After deploy" boxes.
- **Why:** CVE-2019-9193 (`COPY ... FROM PROGRAM` runs OS commands for a superuser), CVE-2018-1058 (search_path).
- **Alternatives:** row-level security (overkill, single tenant) · read-only role for the API only (simpler; the API writes `app.*`).
- **Verify:** as `carsua_app`, `DROP TABLE` and `TRUNCATE registry.*` fail; app and ingest still work; **never run against a real-data DB without the row-count check in CLAUDE.md**.

### D. Containers and edge

### Step 13 - Network segmentation [x] · M · 🤖 · layer 6

- **What:** no `networks:` block today, so alpr (parses untrusted images) can reach Postgres and Redis. Add `edge` (caddy, api), `backend` (api, postgres, redis, ingest), `alpr_net` (api, alpr, `internal: true`).
- **Files:** `infra/docker-compose.prod.yml`, `docs/deploy.md`.
- **Why:** CWE-923 lateral movement.
- **Alternatives:** separate compose projects (more deploy complexity).
- **Verify:** `docker compose exec alpr nc -z postgres 5432` fails; `/healthz` and plate lookup work; blue/green still switches.
- **Done 2026-11-27 (code; deploy checks open in PLAN.md):** top-level `networks:` `edge` (caddy, api), `backend` (api, postgres, redis, ingest, loki, vector), `alpr_net` (`internal: true`: api, alpr). Loki and Vector sit on `backend` too (the api queries Loki). The implicit `default` network is gone, so the load-test recipe in `docs/deploy.md` now uses `carsua_backend`.

### Step 14 - Harden Caddy and Postgres containers [x] · M · 🤖 · layer 6

- **What:** Caddy and Postgres lack `cap_drop`, `no-new-privileges`, memory limits; nothing sets `pids_limit`; api is not `read_only`. Caddy: `cap_drop: [ALL]` + `NET_BIND_SERVICE`. Postgres: drop all, add back `CHOWN`, `SETUID`, `SETGID`, `FOWNER`, `DAC_READ_SEARCH`. api: `read_only` + tmpfs `/tmp`.
- **Files:** `infra/docker-compose.prod.yml`.
- **Why:** Kinsing cryptominer campaigns (binary drops), CWE-400 (fork bombs).
- **Alternatives:** rootless Docker (strongest; networking and port 443 friction).
- **Verify:** `docker compose config -q`; stack boots and passes healthchecks; `docker-bench-security` before and after.
- **Done 2026-11-27 (code):** every service now has `pids_limit` (caddy/api 512, postgres 1024, rest 256) and `no-new-privileges` + `cap_drop: [ALL]`. Caddy keeps `NET_BIND_SERVICE`, Postgres `CHOWN SETUID SETGID FOWNER DAC_READ_SEARCH`, api is `read_only` with tmpfs `/tmp` (the only runtime write path is the safety-video cache under `os.tmpdir()`). New `mem_limit`: caddy 512m, postgres 6g (shared_buffers 2 GB + 1 GB shm + 1 GB maintenance_work_mem; page cache is reclaimable). **Risk:** the capability sets and limits were validated with `docker compose config` only, not on the VPS; if Postgres fails to start, check `docker compose logs postgres` for `Operation not permitted` and add `DAC_OVERRIDE`.

### Step 15 - Pin image digests, hide the Redis password [x] · S-M · 🤖 · layer 6, 9

- **What:** base images are floating tags (`node:24-slim`, `python:3.12-slim`) and compose images are exact tags, none by digest. The Redis password is on a `sh -c` command line (`compose:93`). Pin digests (Dependabot bumps them); read the Redis password from a mounted file.
- **Files:** `apps/api/Dockerfile`, `scripts/Dockerfile`, `services/alpr/Dockerfile`, `docker-compose.prod.yml`.
- **Why:** CWE-494, tag mutability.
- **Alternatives:** exact tags only (readable; a tag can be repointed) · Compose `secrets:` for all secrets (hidden from `docker inspect`; app must read `*_FILE`).
- **Verify:** `docker inspect` does not show the Redis password; images build; Dependabot opens a digest PR.
- **Done 2026-11-27 (code):** `tag@sha256:<index digest>` on all three Dockerfile bases and on caddy, redis, postgres, loki, vector (digests read with `docker buildx imagetools inspect`, multi-arch index). Dependabot: the `docker` entry already covers the Dockerfile folders; a new `docker-compose` entry on `/infra` bumps tag and digest of the compose images. Redis: `deploy-api.yml` writes `env/redis.conf` (`requirepass <pw>`, mode 600) instead of `env/redis.env`; Redis starts as plain `redis-server /etc/redis/redis.conf ...` (no `sh -c`), the healthcheck reads the password from the file. **Not done:** the api still gets `REDIS_URL` with the password in `api.env`, so it stays visible in the api container env (Compose `secrets:` + `*_FILE` support would be a later step); Postgres and ALPR secrets are unchanged. A stale `env/redis.env` on the VPS can be deleted after the deploy.

### Step 16 - Caddyfile hardening [ ] · S · 🤖 · layer 7

- **What:** add `Cross-Origin-Resource-Policy: same-site`, `-Server`, global `admin off`, `request_body { max_size 5MB }`, a JSON access log with roll. Today there is no access log and the body limit is Fastify's alone.
- **Files:** `infra/Caddyfile`, `apps/api/src/csp/caddyfile-headers.test.ts`.
- **Why:** CVE-2023-44487 Rapid Reset (resource exhaustion class), CWE-770.
- **Alternatives:** Cloudflare Transform Rules for headers (config lives outside the repo).
- **Verify:** extended header test; `curl -sI` locally; reload Caddy, then passive check on live.

### Step 17 - HSTS `includeSubDomains; preload` [ ] · S · 👤🤖 · layer 7

- **What:** currently `max-age=31536000` only. Confirm every subdomain serves HTTPS, then add the flags; submit to hstspreload.org after a month of stable running.
- **Files:** `infra/Caddyfile:38`, header test.
- **Why:** sslstrip (2009), CWE-319.
- **Alternatives / con:** preloading is hard to undo; skip the preload flag if any subdomain may ever be plain HTTP.
- **Verify:** `curl -sI` shows the flags; hstspreload.org check is green.

### Step 18 - Single source for the Cloudflare IP list [ ] · M · 🤖 · layer 7

- **What:** `trusted_proxies` in the Caddyfile is hard-coded while the firewall refreshes daily, so they can drift. Let `cf-firewall.sh` write a Caddy snippet that the Caddyfile imports.
- **Files:** `infra/vps/cf-firewall.sh`, `infra/Caddyfile`, `deploy.md`.
- **Why:** drift loses the real client IP or lets it be spoofed.
- **Alternatives:** `caddy-cloudflare-ip` module (custom Caddy build) · **Cloudflare Tunnel** (no public origin IP at all, which also settles H7 and H11; adds a cloudflared container and full dependence on Cloudflare).
- **Verify:** change the snippet, reload, `req.ip` stays correct behind Cloudflare.

### E. VPS and backups

### Step 19 - Host hardening [ ] · M · 🤖👤 · layer 5, 6

- **What:** `restrict,command=` on the CI key in `authorized_keys`; `/etc/docker/daemon.json` (`no-new-privileges`, `live-restore`, `icc: false`, log options); unattended-upgrades `Automatic-Reboot "true"` at 04:00; auditd with basic rules; logrotate for `backup.log` and `cf-firewall.log`; sshd `LoginGraceTime`.
- **Files:** `infra/vps/bootstrap.sh`; owner re-runs the relevant parts on the VPS.
- **Why:** CVE-2024-6387 (`LoginGraceTime 0` mitigation), CVE-2022-0847 Dirty Pipe (kernel patches need a reboot), CWE-250 (docker group = root).
- **Alternatives:** userns-remap (container root ≠ host root; volume ownership pain) · Livepatch (no reboot; Ubuntu Pro, free on up to 5 machines).
- **Verify:** `sshd -T`, `docker info`, a forced CI deploy still works, `lynis` index rises (step 25).

### Step 20 - Encrypted, immutable backups [ ] · M · 🤖👤 · layer 9

- **What:** dumps go to R2 as plain `pg_dump -Fc` with no encryption, versioning or object lock. Encrypt with `age` (private key offline), turn on R2 versioning or object lock, do a decrypt-and-restore drill.
- **Files:** `infra/vps/backup.sh`, `docs/deploy.md`.
- **Why:** LastPass (2022), backups stolen from cloud storage.
- **Alternatives:** rclone crypt (transparent; key sits on the VPS) · gpg (clunky) · second provider such as Backblaze B2 (provider redundancy).
- **Verify:** a downloaded dump is unreadable without the key; restore into a scratch DB passes.

### F. Supply chain and CI

### Step 21 - Package-config hygiene [x] · S-M · 🤖 · layer 10, 11

- **What:** `minimumReleaseAge: 1440` (today 0, `pnpm-workspace.yaml:26`); add `*.pem`, `*.crt`, `id_*`, `ci_key` to `.gitignore`; Dependabot `pip` for `services/alpr`, docker for `/scripts` and `/infra`; hash-pinned `requirements.txt` (`pip-compile --generate-hashes`); check whether stable `onnxruntime-web` can replace the nightly `onnxruntime-web-dev` (`apps/web/package.json:31`).
- **Why:** Shai-Hulud npm worm (2025), chalk/debug compromise (2025), PyTorch nightly `torchtriton` dependency confusion (2022).
- **Alternatives:** Renovate `minimumReleaseAge` (richer grouping; replaces Dependabot) · Socket.dev (free tier only, not OSS).
- **Verify:** `pnpm install --frozen-lockfile`, ALPR image builds with `--require-hashes`, Dependabot config validates.
- **Done (2026-11-24):** `minimumReleaseAge: 1440`; key globs in `.gitignore`; Dependabot `pip` (`services/alpr`), docker `/scripts`, docker-compose `/infra`; `services/alpr/requirements.in` + hash-pinned `requirements.txt` (regenerate: `docker run --rm -v "$PWD/services/alpr:/w" -w /w python:3.12-slim sh -c "pip install pip-tools && pip-compile --generate-hashes --strip-extras -o requirements.txt requirements.in"`), Dockerfile uses `--require-hashes`. **`onnxruntime-web-dev` stays:** transformers.js 4.3.2 pins that exact nightly and mixing it with stable breaks the wasm ABI (plan-done CARSUA-2P); revisit when transformers.js pins a stable release.

### Step 22 - Pin Actions to commit SHAs [x] · S · 🤖 · layer 11

- **What:** `actions/checkout@v7`, `docker/build-push-action@v7` and the composite actions use tags. Pin to SHAs with the tag in a comment; Dependabot's `github-actions` ecosystem keeps them current. **Scope:** third-party actions first (`docker/*`, scanner and ZAP actions from steps 23-24, composite actions that call them); `actions/*` (GitHub-maintained) is optional. Add a Dependabot `cooldown` (e.g. `default-days: 3`) to the `github-actions` entry in `.github/dependabot.yml`, the Actions counterpart of `minimumReleaseAge` (step 21), so a bump PR does not arrive the day a release is published.
- **Files:** `.github/workflows/*`, `.github/actions/*/action.yml`, `.github/dependabot.yml`.
- **Why:** CVE-2025-30066 tj-actions/changed-files (tags repointed), Ultralytics (2024, Actions cache poisoning).
- **Alternatives:** `pinact` or `ratchet` CLI (automates pinning) · forking the Actions (maintenance).
- **Limit:** a SHA guarantees the code cannot change after pinning, not that it is safe. Resolve the SHA from the official repo's release tag (`git ls-remote https://github.com/<owner>/<repo> <tag>`), never from a fork or a link someone sent, and skim the diff in each Dependabot bump PR before merging. It also does not cover what an action pulls internally (unpinned dependencies, floating Docker images).
- **Verify:** `grep -rn "uses:" .github | grep -v "@[0-9a-f]\{40\}"` is empty for third-party actions; CI green.
- **Done (2026-11-25):** third-party actions pinned (`docker/setup-buildx-action`, `docker/login-action`, `docker/build-push-action` in `build-image/action.yml`; `pnpm/action-setup` in `ci.yml`, `deploy-web.yml`), SHAs resolved with `git ls-remote` from the official repos (`pnpm/action-setup` v6 is an annotated tag: the dereferenced commit is pinned). `actions/checkout` (v7.0.1) and `actions/setup-node` (v7.1.0) pinned too on 2026-11-25 (all workflows). Dependabot `github-actions` has `cooldown: default-days: 3`. Steps 23-24 must pin their actions the same way.

### Step 23 - `security.yml` workflow [x] · M · 🤖 · layer 11

- **What:** per PR, to `main` and weekly: gitleaks (full history once), `trivy fs` and `trivy config` (fail on HIGH and CRITICAL), OSV-Scanner, Opengrep with OWASP and Node rules (SARIF to the Security tab; repo is public). Weekly: `trivy image` on api, alpr, ingest from GHCR. CodeQL (repo is public). Add a root `pnpm security:check` running the local equivalents.
- **Files:** `.github/workflows/security.yml`, root `package.json`.
- **Why:** Codecov bash uploader (2021), Toyota key on GitHub (2022), Log4Shell.
- **Alternatives:** Grype instead of Trivy · SonarQube Community (needs a server) · GitHub secret scanning (free on public repos; cloud-side only).
- **Verify:** a planted test secret on a branch fails gitleaks; a known-vulnerable dev dependency fails OSV; run `pnpm security:check` locally.
- **First CI run (PR #270, 2026-11-25):** ✅ gitleaks, trivy fs and config, CodeQL (js/ts, python). ❌ **OSV-Scanner**: 5 advisories in `pnpm-lock.yaml` (zod 4.6.0 → 4.6.6 is High 8.2; minimatch 10.2.6 → 11.0.1; glob 11.1.0 → 14.0.2; esbuild 0.18.20 → 0.25.0; serialize-javascript 7.1.2 → 7.1.3), so `pnpm audit` in CI may fail too. ❌ **Opengrep**: 6 ERROR findings, all reviewed as accepted dev tooling: `spawn-shell-true` in `infra/ci/security-check.mjs`, `scripts/src/{derived-refresh,ingest-full,run-job,tunnel}.ts` (static args, `shell` needed on Windows) and `subprocess.run` in `services/alpr/test_app_config.py` (test). Plan: inline `nosemgrep` with a reason per site, not a directory exclude. ❌ **CI lint** failed on `security-check.mjs` (`no-undef`): fixed by adding `infra/ci/*.mjs` to the node-globals block in `eslint.config.mjs`. ⏭ `trivy image` skipped on PRs by design. All checks green on PR #270 after the fixes below, so the step is `[x]`. **Fixes (same day):** (1) `pnpm audit --prod --audit-level=high` reports nothing: all five packages are dev or build-time only (zod 4.6.0 via `eslint-plugin-react-hooks`; esbuild 0.18.20 via drizzle-kit's legacy `@esbuild-kit`; glob, minimatch and serialize-javascript via `workbox-build`/`vite-plugin-pwa`, plus minimatch via `eslint-plugin-import-x`), so `--prod` skips them by design. A plain `pnpm audit` finds all five, so it was not feed lag; OSV scans the whole lockfile including dev deps. The app's own zod is 4.6.7 (not affected; GHSA-mrhx-c7xc-m3w5 is a memory exhaustion on oversized constrained collections, and the vulnerable copy only parses eslint rule options). (2) Added `pnpm.overrides` in `pnpm-workspace.yaml` (zod ^4.6.7, minimatch ^11.0.5, glob ^14.0.4, esbuild ^0.25.12, serialize-javascript ^7.1.3); lint, type-check, 2721 tests, web build with PWA generateSW all pass, `pnpm audit` and `--prod` both clean. (3) Opengrep: inline `nosemgrep: <rule-id> - <reason>` at each of the 6 sites. (4) `actions/checkout` (v7.0.1) and `actions/setup-node` (v7.1.0) pinned to commit SHAs in all workflows (step 22). (5) **Severity baseline (all dependency scanners):** fixable High/Critical (CVSS >= 7.0) blocks the PR, Medium/Low only warns. `pnpm audit` runs without `--prod` (dev and build-time deps run in CI too), trivy keeps `HIGH,CRITICAL --ignore-unfixed`, OSV goes through `infra/ci/osv-gate.mjs` (osv-scanner has no severity flag; unknown severity blocks). (6) Opengrep keeps `nosemgrep`-waived findings in the SARIF, so the workflow drops results with `suppressions` (jq) before upload; otherwise the Security-tab alert stays open and "Code scanning results / Opengrep" fails although the scan passes. Confirmed: all PR #270 checks green (only `trivy image` skipped on PRs, by design).

### Step 24 - ZAP baseline workflow [ ] · M · 🤖 · layer 8, 2

- **What:** weekly and `workflow_dispatch`. CI starts Postgres with `db:seed` (synthetic data only) and the API serving the built SPA, then runs `zaproxy/action-baseline` against localhost. `.zap/rules.tsv` ignores header rules Caddy owns. Report kept as an artifact. Never targets carsua.app.
- **Files:** `.github/workflows/zap-baseline.yml`, `.zap/rules.tsv`.
- **Why:** OWASP Top 10 classes, passive only.
- **Alternatives:** Nuclei (fast templates; more CVE-oriented than app-oriented).
- **Verify:** manual dispatch produces a report; no finding on the SPA or API is new noise.

### Step 25 - Host audit cron [ ] · S · 🤖👤 · layer 5, 6

- **What:** `infra/vps/host-audit.sh` runs `lynis audit system --quick --cronjob` and `docker-bench-security` monthly, saves reports under `/opt/carsua/audit/`, diffs the Hardening Index against the last run, pings healthchecks.io. Owner records the first baseline and the waiver list.
- **Why:** drift detection against CIS.
- **Alternatives:** OpenSCAP + CIS profile (formal; heavy).
- **Verify:** first run produces a report; second run shows a diff line.

### Step 26 - Release integrity [ ] · S-M · 🤖 · layer 11

- **What:** stop pushing `:latest` to GHCR; add `actions/attest-build-provenance` and a Syft SBOM to `build-image/action.yml`. 👤 optional: private GHCR (needs a pull token on the VPS; packages are public today, `deploy.md:123`).
- **Why:** SolarWinds (2020, build tampering).
- **Alternatives:** cosign keyless signing with verification on the VPS (deploy rejects unsigned images; more scripting).
- **Verify:** `gh attestation verify` on a built image; prod compose still pins by SHA.

### G. Frontend guards

### Step 27 - ESLint security rules [ ] · S-M · 🤖 · layer 2

- **What:** `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`, and a local `jsx-no-target-blank` rule (`eslint-plugin-react` does not support ESLint 10, see `eslint.config.mjs:112`). Fix whatever they flag. Also closes security-checklist finding #9 guard.
- **Why:** CWE-95, CWE-1022.
- **Alternatives:** `@eslint-react/eslint-plugin` `dom/no-unsafe-target-blank` (check ESLint 10 support first).
- **Verify:** `pnpm lint` fails on a planted `eval` and on a `target="_blank"` without `rel`.

### Step 28 - Sandbox the iframes [ ] · S · 🤖 · layer 2 (bundle with step 27)

- **What:** only `routes/play/ExternalGameModal.tsx:60` is sandboxed. Add `sandbox` and `referrerpolicy="strict-origin-when-cross-origin"` to YouTube, Maps, Model360, Model3d, RegionMap, LiveBackground; check each embed by hand since `sandbox` can break them.
- **Why:** CWE-1021 (clickjacking, embed abuse).
- **Alternatives:** click-to-load facade, e.g. lite-youtube (privacy and speed; one extra click).
- **Verify:** manual embed walk (section 8d item 6).

### Step 29 - Opt-in "clear this device" on sign-out [ ] · M · 🤖 · layer 1

- **What:** a checkbox in the sign-out dialog that also clears history, favorites and the offline cache (today these survive deliberately, `SignOutDialog.tsx:51-62`). Needs i18n keys in the matching pack and a release version bump.
- **Why:** shared-device privacy, CWE-922.
- **Alternatives:** always clear (users lose offline data) · a "don't save history" toggle.
- **Verify:** component test; manual: after sign-out with the box ticked, IndexedDB `carplates.*` stores are empty.

### Step 30 - `SECURITY.md` and `security.txt` [x] · S · 🤖 · layer 11

Done 2026-11-26 (`SECURITY.md`, `apps/web/public/.well-known/security.txt`, Expires 2027-11-26: renew yearly). The `security@carsua.app` mailbox works (step 32). Verified live: 200, `text/plain`, not rewritten to `index.html`.

- **What:** `SECURITY.md` at the root and `apps/web/public/.well-known/security.txt` (Contact, Expires, Preferred-Languages, Canonical). Today only `ai-catalog.json` and `ard.json` live in `.well-known`.
- **Why:** RFC 9116.
- **Alternatives:** a bug-bounty platform (overkill).
- **Verify:** `/.well-known/security.txt` is served by the SPA fallback and not rewritten to `index.html`.

### Step 31 - Trusted Types [ ] · M · 🤖 · layer 2 (later)

- **What:** `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'` through the Caddyfile and the existing `/api/csp-report` sink; enforce after a clean week.
- **Why:** DOM XSS, CWE-79.
- **Alternatives:** skip it: React already escapes and CSP blocks inline scripts; the gain is mostly for third-party code.
- **Verify:** Sentry shows no violations from first-party code over a week.

### H. Owner-only

### Step 32 - Dashboards and accounts [ ] · S each · 👤 · layers 2, 3, 4, 12

- [x] Cloudflare DNSSEC on (CVE-2008-1447 Kaminsky), done 2026-11-26: Cloudflare signs the zone (algorithm 13, key tag 2371); the registrar is **Squarespace** (DNS → DNSSEC → add the DS record there; the Squarespace DNS Settings page is inactive because the nameservers are Cloudflare's). Verified at dnssec-analyzer.verisignlabs.com. Before ever leaving Cloudflare DNS, remove the DS record at Squarespace first, or the domain fails validation.
- [x] CAA records in Cloudflare DNS, done 2026-11-26 (`@`, flags 0, tag `issue`, CA in the "CA domain name" field): `letsencrypt.org` (Universal edge cert), `sectigo.com` (Cloudflare backup edge cert), `pki.goog`, `ssl.com`. Cloudflare also serves its own extra CAA records (comodoca.com, digicert.com, `issuewild`), which the dashboard flags with a harmless warning. Verify (no `dig` on Windows): `curl -s -H "accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=carsua.app&type=CAA"`. Still to watch: the next edge-cert renewal (Universal expires 2027-01-25).
- [ ] Change the origin IP (H7), then test the IPv6 lockdown from outside.
- [ ] Decide H11 (SSH over Cloudflare Tunnel or Tailscale).
- [x] Least-scope Cloudflare purge token, done 2026-11-26: custom token, only `Zone > Cache Purge > Purge`, zone `carsua.app` only, stored as the `CF_API_TOKEN` secret (used by `.github/actions/cf-purge`); the old token was replaced. If the token has an expiry, the purge fails after it, so keep a rotation reminder.
- [ ] Optional: cf-terraforming export of the zone (use a separate read-only token, never the purge token; keep the output out of git).
- [x] Google Cloud: HTTP-referrer restriction on the Maps embed key (`lib/maps.ts:10,26`), done 2026-11-26: new key `maps-embed-web`, restricted to the Maps Embed API only and to the referrers `https://carsua.app/*` and `https://*.carsua.app/*`; set as the repo variable `VITE_GOOGLE_MAPS_EMBED_KEY` and the web deploy re-run. The existing YouTube key is separate (YouTube Data API v3 only).
- [x] 2FA with hardware keys or TOTP and stored recovery codes, verified 2026-11-26 on GitHub, Cloudflare (security key + TOTP + email), Squarespace, Contabo (TOTP), Google Cloud, Sentry, PostHog, Resend (0ktapus phishing, 2022). R2 and Google Cloud have no separate login: they sit behind the Cloudflare and Google account 2FA (R2 S3 keys and GCP API/service-account keys are separate credentials, scope them and keep them in `secrets/`). Backup codes are stored in Google Drive and OneDrive. Squarespace has no own 2FA (login is Google) and its "Account recovery" is off because it requires a phone number and Ukrainian numbers are not supported; recovery goes through the Google account.
- [x] 2FA leftovers, done 2026-11-26: GitHub preferred method is the authenticator app and SMS is removed; Telegram BotFather is covered by the personal Telegram account (the bots live there), which has Two-Step Verification on and a passkey. Open hygiene: 15 active Telegram sessions and 5 connected websites are worth pruning.
- [x] GitHub: branch protection on `main`, done 2026-11-26 as the ruleset `production-rule` (active, empty bypass list): restrict deletions, block force pushes, PR required (0 approvals, solo), required status checks from GitHub Actions: `check`, `gitleaks`, `trivy fs and config`, `osv-scanner`, `opengrep SAST`, `codeql (javascript-typescript)`, `codeql (python)`, `sonarqube cloud`. Required names are the **job** names, not "Workflow / job". `trivy image` runs on schedule only, so it is not required. Direct pushes to `main` are now blocked. Verified on a real PR (all checks passed, merge unlocked).
- [x] GitHub: required reviewer on the `production` environment, saved 2026-11-26: reviewer `Krak86`, self-review allowed (solo), deployment branches limited to `main`. Deploys now pause on "Waiting for review" (Review deployments, tick `production`, Approve and deploy). Not yet confirmed by a real deploy; check that "Allow administrators to bypass" is off if the approval must be mandatory. A `workflow_dispatch` deploy from `stage` is rejected by the branch limit.
- [x] GitHub: secret scanning (Secret Protection) and push protection on, verified 2026-11-26 in Settings, Advanced Security. Also on: dependency graph, Dependabot alerts, Dependabot security updates (grouped security updates off: `dependabot.yml` controls grouping), Copilot Autofix. Left off on purpose: the AI Scan options and Agentic autofix (they use AI credits; CodeQL, opengrep and Sonar already cover that). These overlap gitleaks but do not replace it: push protection blocks before the push, gitleaks is the CI gate and catches custom patterns.
- [x] `SECURITY.md` written (step 30), 2026-11-26.
- [x] GitHub: private vulnerability reporting on, done 2026-11-26 (CWE requirement off, daily limit 10, no trusted reporters).
- [x] GitHub: Dependabot malware alerts on, done 2026-11-26 (free; Advanced Security page also shows dependency graph and Dependabot alerts on, automatic dependency submission disabled).
- [x] Cloudflare Email Routing (free), done 2026-11-26: rule `security@carsua.app` → personal Gmail (destination verified), test mail delivered. `SECURITY.md` and `security.txt` list this address. Gotchas: the wizard keeps an old root `v=spf1 -all` and marks routing "Syncing / DNS misconfigured" until it is deleted and Cloudflare's own `v=spf1 include:_spf.mx.cloudflare.net ~all` is added ("Add missing records"); keep the root SPF exactly that value while Email Routing is on (spoofing stays covered by `_dmarc` `p=reject`). The catch-all is disabled (Drop). The Activity log lagged and stayed empty although mail arrived. The destination page takes the real inbox, not the `security@` address. To reply as `security@carsua.app` from Gmail, send through Resend SMTP (DKIM must align with DMARC `p=reject`).

### I. Docs

### Step 33 - Doc close-out [x] · S · 🤖

- Done with this wiki: pointer from `security-checklist.md`, deleted the superseded `security-hardening-plan-2026-11.md`, `[ ]` boxes in PLAN.md. Open from then on: tick each step here and add a `docs/plan-done.md` entry when a step ships. Security-checklist finding #9 is stale (the lint guard is step 27).

## 6. CVE and incident index

"Verified" = the ID exists and the NVD record matches the summary (fetched 2026-11-24). **⏳ = not yet checked: NVD rate-limited the check, so treat as unverified until re-run.**

| Reference                                               | Year            | Summary                                                                                                                                                                                                                                                                                                                                                                                               | Used by      | Verified                                                                                        |
| ------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| CVE-2018-6341                                           | 2018            | React DOM server did not escape attribute names, XSS                                                                                                                                                                                                                                                                                                                                                  | D5           | ✅                                                                                              |
| CVE-2025-55182                                          | 2025            | React Server Components pre-auth RCE, "React2Shell"                                                                                                                                                                                                                                                                                                                                                   | D11          | ✅                                                                                              |
| CVE-2024-6387                                           | 2024            | OpenSSH sshd signal-handler race, "regreSSHion"                                                                                                                                                                                                                                                                                                                                                       | D16, step 19 | ✅                                                                                              |
| CVE-2024-3094                                           | 2024            | Backdoor in xz/liblzma 5.6.0 and 5.6.1                                                                                                                                                                                                                                                                                                                                                                | D17          | ✅                                                                                              |
| CVE-2021-3156                                           | 2021            | sudo heap overflow, root escalation                                                                                                                                                                                                                                                                                                                                                                   | D19          | ✅                                                                                              |
| CVE-2019-5736                                           | 2019            | runc `/proc/self/exe` overwrite, container escape                                                                                                                                                                                                                                                                                                                                                     | D20          | ✅                                                                                              |
| CVE-2024-21626                                          | 2024            | runc leaked file descriptor, container escape                                                                                                                                                                                                                                                                                                                                                         | D20          | ✅                                                                                              |
| CVE-2025-29927                                          | 2025            | Next.js middleware auth bypass via a header (in CISA KEV)                                                                                                                                                                                                                                                                                                                                             | D24          | ✅                                                                                              |
| CVE-2015-9235                                           | 2018 (not 2015) | jsonwebtoken RS/HS algorithm confusion                                                                                                                                                                                                                                                                                                                                                                | D30          | ✅                                                                                              |
| CVE-2022-21449                                          | 2022            | Java ECDSA "Psychic Signatures"                                                                                                                                                                                                                                                                                                                                                                       | D30          | ⚠ ID exists, NVD text is generic and does not mention ECDSA; drop it if not confirmed elsewhere |
| CVE-2021-41773                                          | 2021            | Apache httpd path traversal                                                                                                                                                                                                                                                                                                                                                                           | D34, step 6  | ⏳                                                                                              |
| CVE-2023-4863                                           | 2023            | libwebp heap overflow                                                                                                                                                                                                                                                                                                                                                                                 | D39, step 5  | ⏳                                                                                              |
| CVE-2016-3714                                           | 2016            | ImageMagick "ImageTragick"                                                                                                                                                                                                                                                                                                                                                                            | D39, step 5  | ⏳                                                                                              |
| CVE-2025-49844                                          | 2025            | Redis Lua use-after-free RCE, "RediShell"                                                                                                                                                                                                                                                                                                                                                             | D44          | ⏳                                                                                              |
| CVE-2021-44228                                          | 2021            | Log4Shell                                                                                                                                                                                                                                                                                                                                                                                             | D47, step 23 | ⏳                                                                                              |
| CVE-2016-1897, CVE-2016-1898                            | 2016            | FFmpeg HLS local file disclosure / SSRF                                                                                                                                                                                                                                                                                                                                                               | step 8       | ⏳                                                                                              |
| CVE-2019-9193                                           | 2019            | PostgreSQL `COPY FROM PROGRAM` (disputed: documented superuser feature)                                                                                                                                                                                                                                                                                                                               | step 12      | ⏳                                                                                              |
| CVE-2018-1058                                           | 2018            | PostgreSQL search_path privilege escalation                                                                                                                                                                                                                                                                                                                                                           | step 12      | ⏳                                                                                              |
| CVE-2023-44487                                          | 2023            | HTTP/2 Rapid Reset                                                                                                                                                                                                                                                                                                                                                                                    | step 16      | ⏳                                                                                              |
| CVE-2022-0847                                           | 2022            | Linux "Dirty Pipe"                                                                                                                                                                                                                                                                                                                                                                                    | step 19      | ⏳                                                                                              |
| CVE-2025-30066                                          | 2025            | tj-actions/changed-files compromise                                                                                                                                                                                                                                                                                                                                                                   | step 22      | ⏳                                                                                              |
| CVE-2008-1447                                           | 2008            | DNS cache poisoning, "Kaminsky"                                                                                                                                                                                                                                                                                                                                                                       | step 32      | ⏳                                                                                              |
| Incidents (public reporting, no CVE; not NVD-checkable) |                 | Firesheep 2010 (D1) · British Airways Magecart 2018 (D3) · Polyfill.io takeover 2024 (D4) · event-stream 2018, ua-parser-js 2021 (D46) · Uber keys on GitHub 2016 (D49) · SolarWinds 2020 (26) · Codecov uploader 2021 (23) · Toyota key on GitHub 2022 (23) · LastPass 2022 (20) · 0ktapus 2022 (32) · Shai-Hulud and chalk/debug 2025, torchtriton 2022 (21) · Ultralytics 2024 (22) · Kinsing (14) |              | n/a                                                                                             |

CWE references (CWE-79, 89, 20, 209, 250, 284, 307, 352, 400, 494, 532, 598, 601, 636, 693, 770, 923, 1004, 1021, 1022) are classes, not dated events.

## 7. Cadence

- **Per PR:** CI gates (`pnpm audit`, step 23 scanners, Vitest, lint).
- **Weekly:** `trivy image` on built images, ZAP baseline, Dependabot.
- **Monthly:** Lynis and docker-bench (step 25), CSP reports in Sentry, live header review (Observatory, securityheaders.com, SSL Labs).
- **Quarterly:** `pentest-lab.md` probes and a ZAP active scan on the local stack, backup restore drill, outside port scan of the origin.
- **Twice a year:** rollback and redeploy drill, account 2FA and GitHub settings audit.

## 8. Tests left after the steps are done

### 8a. Automated, Vitest, every PR

Existing: `origin.guard`, `caddyfile-headers`, `csp.controller`, `throttle`, `throttle-storage`, `meta`, `og-card`, `catalog-text`, `shares/*` (magic bytes, EXIF), `all-exceptions.filter`, `email-challenge`, `google-id-token`, `telegram-login`, `session-cookie`.

| Step  | New test                                                      |
| ----- | ------------------------------------------------------------- |
| 1-2   | telemetry scrubbers remove token, plate and VIN               |
| 3     | `assertProductionEnv` rejects a missing Turnstile or ALPR key |
| 4     | pytest: ALPR exits without a key, `/docs` is 404              |
| 5     | recognize rejects wrong magic bytes, 502 body is generic      |
| 6     | hostile-plate meta escaping, SPA path traversal               |
| 7     | `fetchJson` timeout, byte cap, schema failure (done)          |
| 8-9   | throttle decorators present, redirect allowlist (done)        |
| 10    | fallback headers only when absent                             |
| 11    | pool options (`client.test.ts`, done)                         |
| 12    | integration: app role cannot `DROP` or `TRUNCATE`             |
| 16-17 | extended `caddyfile-headers` assertions                       |
| 27    | the lint run itself                                           |

### 8b. Automated, CI scanners

Per PR: gitleaks, `trivy fs` and `trivy config`, OSV-Scanner, Opengrep, `pnpm audit`, CodeQL; SonarQube Cloud quality scan (`quality.yml`, not a security gate). Weekly: `trivy image`, ZAP baseline, Dependabot.

### 8c. Recurring on the VPS (automated, owner reviews)

Monthly `host-audit.sh` diff; nightly backup pings (healthchecks.io); CSP reports in Sentry; UptimeRobot.

### 8d. Manual, still needed

1. `pentest-lab.md` probes plus a ZAP **active** scan on the local stack (quarterly). Covers business logic: IDOR on share tokens and account endpoints, auth flows, sudo mode.
2. Backup restore drill with age decryption (quarterly).
3. Outside `nmap` of the origin, IPv4 and IPv6: only 443, only for Cloudflare (after step 32 H7, then quarterly).
4. Origin-bypass check: `curl` straight at the origin IP must fail without Cloudflare's mTLS (after every Caddy change).
5. Passive live header and TLS checks: Observatory, securityheaders.com, SSL Labs, hstspreload.org (monthly and after deploys).
6. Embed walk after steps 28 and 31: YouTube, Maps, 3D models, Disqus, Telegram login, Turnstile.
7. Account 2FA, recovery codes and GitHub settings review (every six months).
8. Rollback and redeploy drill (twice a year).
9. Lynis findings triage; record accepted waivers in this wiki.

### 8e. Not tested on purpose (accepted risk)

DDoS and load tests against prod (Cloudflare absorbs; never load-test prod); social engineering and phishing; provider-side compromise (Contabo, Cloudflare, GitHub); physical security; third-party script internals (PostHog, Disqus, Google; limited by CSP); a formal external pentest or bug bounty (optional, once there is a budget).

### 8f. Test inventory

| Test                           | Layer | Type            | Frequency                   | Owner         | Added by                    |
| ------------------------------ | ----- | --------------- | --------------------------- | ------------- | --------------------------- |
| Vitest security suites         | 2, 8  | unit            | per PR                      | CI            | existing, steps 1-12, 16-17 |
| pytest ALPR fail-closed        | 10    | unit            | per PR                      | CI            | step 4                      |
| gitleaks, Trivy, OSV, Opengrep | 11    | CI scan         | per PR                      | CI            | step 23                     |
| `trivy image`                  | 6, 11 | CI scan         | weekly                      | CI            | step 23                     |
| ZAP baseline                   | 2, 8  | CI DAST         | weekly                      | CI            | step 24                     |
| Lynis, docker-bench            | 5, 6  | VPS cron        | monthly                     | owner reviews | step 25                     |
| pentest-lab, ZAP active        | 2, 8  | manual          | quarterly                   | owner         | existing                    |
| Restore drill                  | 9     | manual          | quarterly                   | owner         | step 20                     |
| Origin nmap, mTLS bypass       | 3, 4  | manual          | quarterly, per Caddy change | owner         | step 32                     |
| Live header and TLS checks     | 3, 7  | manual, passive | monthly                     | owner         | existing                    |
| 2FA and GitHub audit           | 12    | manual          | six-monthly                 | owner         | step 32                     |
