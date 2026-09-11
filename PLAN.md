# carplates-v2 — roadmap

Rebuild of `carsua.app`. The 2019 app was a GitHub-Pages SPA reading Azure Cosmos
DB; that DB is gone, so plate search is dead (VIN still worked — it calls NHTSA
directly). This version puts the registry data in Postgres and the external-API
calls behind our own API.

## Locked decisions

| Area      | Choice                                                                                              | Note                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Repo      | single pnpm monorepo                                                                                | `apps/{web,api}`, `packages/{shared,db}`, `scripts/`                                                     |
| Runtime   | Node 24 LTS · pnpm 12.3.4                                                                           | not Node 26 (LTS only Oct 2026)                                                                          |
| Language  | TypeScript 5.9                                                                                      | **not 7.x** — `typescript-eslint` peer caps at `<6.1`                                                    |
| DB        | `postgres:18.6`                                                                                     | full-history table + materialized `current_registration` view                                            |
| ORM       | Drizzle 0.45.2 (pinned)                                                                             | **not 1.0.0-rc** — kit/zod satellites still on 0.4x. Revisit when npm `latest` is 1.x.                   |
| API       | NestJS 11 + Fastify + `nestjs-zod`                                                                  | **not 12** — `nestjs-zod` peer is 10/11. Bump when it supports 12.                                       |
| Web       | Vite 8 · React 19 · React Router 8 (declarative) · TanStack Query · Zustand · Tailwind v4 · i18next |                                                                                                          |
| Lint      | ESLint 10 flat config                                                                               | `eslint-plugin-react` dropped (calls removed `context.getFilename`); `react-hooks` covers the essentials |
| Analytics | PostHog Cloud, EU, free tier                                                                        | anonymous events only                                                                                    |
| Errors    | Sentry Cloud, free Developer tier                                                                   | official dashboard                                                                                       |
| i18n      | i18next, `localStorage` + `navigator.language`                                                      | ua/ru/en                                                                                                 |

## Version pins — why not `latest`

Everything is on `latest` **except** the five below. Each is held back for a
concrete reason with a revisit trigger — not caution for its own sake. Re-check
by re-reading this section before bumping.

| Package                | `latest` (2026-09)                                                | We use                                         | Why held back                                                                                                                                                                                                                                                                                                | Revisit when                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **typescript**         | `7.0.2`                                                           | `~5.9.3`                                       | `typescript-eslint@8.70` peer-requires `typescript >=4.8.4 <6.1.0`. TS 7 (and even 6.1) breaks **all** type-aware linting (`no-floating-promises`, the parser itself).                                                                                                                                       | `typescript-eslint` declares TS 7 support (watch its peerDeps / release notes).                                                                          |
| **@nestjs/core** & co. | `12.0.1`                                                          | `^11.2.3`                                      | `nestjs-zod@5.5.0` (latest, nothing newer) peer-requires `@nestjs/common ^10 \|\| ^11` and `@nestjs/swagger ^7 \|\| ^8 \|\| ^11` — no Nest 12. `nestjs-zod` is core to the design (one Zod schema → validation pipe **and** OpenAPI).                                                                        | `nestjs-zod` ships a release listing `@nestjs/* ^12` in peerDeps. Then bump all `@nestjs/*` together.                                                    |
| **drizzle-orm**        | `0.45.2` is the `latest` **tag**; `1.0.0-rc.4` is on the `rc` tag | `0.45.2` (exact)                               | We're on the actual latest **stable**. Not the RC: the maintainers haven't promoted v1 to `latest` (their own signal); `drizzle-kit` + `drizzle-zod` still target 0.4x; the v1 stream ran 23 betas + ≥5 RCs and still iterates. v1's headline features (RQB v2, RLS, generated columns) are irrelevant here. | npm `latest` points at `1.x` **and** `drizzle-kit` + `drizzle-zod` have stable v1 releases. Then follow `/docs/upgrade-v1`; our Drizzle surface is tiny. |
| **vitest**             | `5.0.0`                                                           | `^4.1.11`                                      | 5.0.0 shipped as a same-window `.0`. 4.1.11 is mature and already supports Vite 8 (`vite: ^6 \|\| ^7 \|\| ^8` peer) and Node 24. Same "stable over shiny" call as Node 24-not-26.                                                                                                                            | 5.x has a few patch releases and the plugin ecosystem (coverage, ui) has caught up. Low urgency.                                                         |
| **node**               | `26.8.2` (Current)                                                | `24.x` (`24.21.0` is the newest LTS "Krypton") | 26 only becomes LTS in Oct 2026; "entering LTS" ≠ ecosystem-ready — native deps and CI images take months. Conservative for an unattended VPS. Upgrading is a one-line `.nvmrc` / Dockerfile change.                                                                                                         | 26 has been LTS for a few months and `node:26-alpine` is everywhere.                                                                                     |

**Not held back — clarifications so nobody "fixes" them:**

- **pnpm** — we _are_ on `latest` (`12.3.4`, pinned in `packageManager`). This
  machine's global launcher was broken (pnpm 10's self-management shim can't hand
  off to pnpm 12's layout, and pnpm 10 can't read a pnpm-12 lockfile); it was
  repointed at 12.3.4 directly. See `.claude/memory/pnpm-launcher-fix.md`.
- **@eslint/js** — `^10.0.1` **is** its latest. It versions independently from
  the `eslint` core package (`10.10.0`). Don't "align" it to `^10.10.0` — that
  version doesn't exist.
- **eslint-plugin-react** — `latest` is `7.37.5`; we **removed it**, not pinned
  it. 7.37.x calls `context.getFilename()`, removed in ESLint 10, so it crashes
  the linter. `eslint-plugin-react-hooks@7` (ESLint-10-native, incl. the React
  Compiler rules) covers what matters. Re-add only if a patched
  `eslint-plugin-react` ships and its extra rules are wanted.
- **tsconfig `incremental`** — deliberately unset (not a version thing): with
  per-package `tsc` its `.tsbuildinfo` lived outside `dist/`, so `rm -rf dist`
  left a stale cache and tsc silently emitted nothing.

Everything else (React 19.3, React Router 8.3, Vite 8.2, Tailwind 4.3, TanStack
Query 5, Zustand 5, i18next 26, `@sentry/*` 10, `posthog-js`, `drizzle-kit`
0.31, `pg` 8, `fastify` 5, `csv-parse` 7, `unzipper`, `iconv-lite`, `tsx`,
`zod` 4, `globals` 17, `eslint` 10, `typescript-eslint` 8, `vite`/`vitest`
plugins) is on `latest`.

## Phase 1 — local dev stack ✅ DONE

Plate + VIN search running end-to-end on one machine.

- `packages/shared`: `normalizePlate` / `denormalizePlate` / `isVin` /
  `classifyQuery` (ported from the v1 homoglyph logic), `REGIONS` + `regionName`,
  Zod schemas. 13 tests.
- `packages/db`: Drizzle schema in a `registry` PG schema — `registrations`
  (one row per registration action, dedupe unique index with `NULLS NOT
DISTINCT`), materialized `current_registration` (`DISTINCT ON (plate)`),
  `ingested_resources`. Forward-only SQL migrator (`migrations/*.sql`) — the
  matview DDL can't be expressed in drizzle-kit.
- `apps/api` (NestJS 11 + Fastify):
  - `GET /api/plate/:plate` — normalize → `current_registration` → DTO + `historyCount`; typed 404
  - `GET /api/plate/:plate/history` — every action, newest first
  - `GET /api/vin/:vin` — proxy NHTSA vPIC, bounded in-memory cache
  - `GET /api/docs` — Swagger (nestjs-zod), env-gated
  - SPA host + per-plate / per-VIN `<meta>` injection into `index.html` (active when `WEB_DIST_DIR` is set)
- `apps/web` (Vite 8): search field, plate result card (summary + expandable
  detail), VIN table, drawer sidebar (Search / About / Language). Routes `/`,
  `/:query`, `/about`. `React.lazy` for About + Sidebar. Telemetry wired but
  dynamic-imported and inert unless enabled.
- `scripts`:
  - `seed.ts` — ~1000 deterministic synthetic rows (incl. `ВЕ7116АА`,
    `АА1234ВС`, and `КА0001АА` with 3 registration actions)
  - `ingest.ts` — CKAN `package_show` → per-year ZIP → stream-parse (UTF-8 by
    default, `;`-delimited, **header-name-driven column mapping** — see
    "2026 plate removal" below) → batched insert/upsert → refresh view →
    record in `ingested_resources`. Flags: `--year`, `--limit`, `--file`,
    `--dry-run`, `--encoding <utf8|win1251>`, `--archive <dir>`, `--backfill-plates`.
  - `transform.ts` — `buildLayout` resolves a file's header row to a column
    layout by name (throws if none match); `mapRecord` uses that layout, so
    field order never has to match across years.
  - `backfill.ts` — `backfillPlates()`: reconstructs `plate` for rows the
    registry published without one, via an exact `(vin, d_reg, oper_code)`
    match first, a VIN-latest-plate fallback second (flagged `plate_inferred`).
- `infra/docker-compose.yml` — local Postgres only. Note: `postgres:18+` mounts
  the volume at `/var/lib/postgresql` (not `/data`).

**Not in Phase 1:** CI, GitHub repo, VPS, deploy, OG images, real full ingest.

### 2026 plate removal (ГСЦ МВС order №67/ОД, 2026-06-29)

The source layout has changed almost every year, and the header row is the
only reliable way to tell one from another — verified against the real
resources, not just the samples:

| Years     | Columns | Plate column | VIN | oper_code                                         | Date format  | Encoding |
| --------- | ------- | ------------ | --- | ------------------------------------------------- | ------------ | -------- |
| 2013-2019 | 19      | `N_REG_NEW`  | no  | separate column (redundant prefix in `oper_name`) | `YYYY-MM-DD` | UTF-8    |
| 2020      | 19      | `N_REG_NEW`  | no  | separate column                                   | `YYYY-MM-DD` | UTF-8    |
| 2021-2022 | 20      | `N_REG_NEW`  | yes | separate column                                   | `DD.MM.YYYY` | UTF-8    |
| 2023-2025 | 20      | `N_REG_NEW`  | yes | separate column                                   | `DD.MM.YY`   | UTF-8    |
| 2026      | 17      | **none**     | yes | fused: `CD.OPER_CODE\|\|'-'\|\|CD.OPERAS`         | `DD.MM.YY`   | UTF-8    |

The 2026-09-01 republish of the year-to-date resource dropped `N_REG_NEW`
(and `REG_ADDR_KOATUU`, `DEP_CODE`), reordered `KIND;BODY;PURPOSE` to
`KIND;PURPOSE;BODY`, and added `POWER_KWT` (engine power in kW — the only
engine figure a pure EV has, since its `CAPACITY` is empty). Reason: **ГСЦ МВС
order №67/ОД (2026-06-29)** stopped publishing the plate number; a business
coalition (OTP Bank, PrivatBank, RIA, RST.UA) has asked the ministry to
rescind it, so this may reverse. Because the change was retroactive — the
whole year-to-date file was rewritten, not just new rows — the January-2026
resource snapshot (`reestrTZ2026`, last-modified 2026-05-08) is the _only_
surviving source of Jan-Apr 2026 plates; data.gov.ua replaces resources in
place, so that snapshot cannot be re-downloaded once superseded.

Design: `plate` is nullable (`CHECK (plate IS NOT NULL OR vin IS NOT NULL)`
instead of a second table, so a rollback of the order just needs a re-ingest +
re-run of `--backfill-plates`, not a migration). Measured recovery, joining the
two 2026 snapshots on `(vin, d_reg, oper_code)`: **46.6%** of post-order rows
get an authoritative plate back from the January archive; a further **34.5%**
link by VIN to a plate already in 2024-2025 data (flagged `plate_inferred`,
since the vehicle may have been re-plated since). `--archive <dir>` exists
specifically so this kind of loss doesn't recur — see the backup policy note
in Phase 4, which this pulls forward to "do it now" rather than "do it later."

## Phase 2 — RIA "similar cars" proxy

`GET /api/ria/similar?brand&model&kind&year` runs the whole `developers.ria.com`
sequence server-side; the `api_key` leaves the client. The ~4700 lines of
hardcoded brand→id matrices from the v1 app move server-side, ideally as a
`ria_marks` table refreshed from RIA's own `/auto/categories/{id}/marks`. Web:
lazy-loaded card list under the plate result, mounted only after the plate query resolves.

## Phase 3 — Platesmania

Proxy endpoint injecting `PLATES_MANIA_KEY` (needs the key first). Uses
`denormalizePlate` (Cyrillic→Latin). Lazy-loaded card list.

### Phase 3+ — plate image recognition

v1 camera/upload → platerecognizer.com via a proxy. Needs `@fastify/multipart`,
a camera/upload UI, and the `changeSymbols1toI` quirk. Own the ML later.

### Phase 3+ — crash-test ratings (research task)

NHTSA Safety Ratings. **Research the current endpoint** (v1 pointed at
`one.nhtsa.gov/webapi/...`, now under `api.nhtsa.gov/SafetyRatings/`), how it
keys (year/make/model path walk vs VIN), rate limits, and whether it joins to the
registry brand/model or the NHTSA-decoded values. Same free provider as the VIN decoder.

## Phase 4 — VPS / production

- Prod `docker-compose`: Caddy (auto-TLS + **coarse per-IP rate limit**, see
  below) · Redis (RIA + VIN cache, throttler store) · api · web · ingest-cron
- GHCR image build + SSH deploy workflow (GitHub Actions, free for public repos)
- Monthly CKAN ingest cron on the VPS (`ingest.ts`, self-checks `ingested_resources`)
- OG image endpoint `GET /og/:plate.png` — `satori` + `resvg` (**never
  Puppeteer**), cached long, keyed by plate; wired into the meta-injection host
- Telemetry switched on for real (env flags + keys)
- Full-history ingest of all 16 CKAN resources

### Backup policy (Phase 4)

The DB is fully derived and read-only — every row rebuildable by re-running
`ingest.ts`. Recovery is _re-ingest_, not _restore_.

- **Primary:** archive each downloaded source ZIP to R2/B2 at ingest time (~1.2
  GB now, +~110 MB/year). data.gov.ua replaces the current-year resource in
  place — this is the only guard against the portal altering/removing data.
  Already needed once in Phase 1 (see "2026 plate removal" above), so
  `ingest.ts --archive <dir>` exists from Phase 1 on, writing to a local dir
  until this graduates to R2/B2 here.
- **Secondary:** `pg_dump -Fc` once after each successful monthly ingest, keep 2-3.
- **No nightly job.**
- ⚠️ **The first user-writable table (Phase 5) flips this to nightly `pg_dump
--schema=app` + WAL archiving / PITR immediately.**

### Rate-limit policy (Phase 4/5, starting points — tune from PostHog)

Threat: a scraper enumerating plates to dump the registry; login brute-force;
blowing the rate-limited RIA key.

**Edge — Caddy `rate_limit`, per IP, `429` + `Retry-After`:** all paths 120/60s;
`/api/*` 60/60s **and** 1000/1h; `/og/*` 300/60s.

**App — `@nestjs/throttler`, tracker keyed on `userId` when authed:** global
`short` 10/1s, `medium` 60/60s, `long` 600/1h; `/api/plate/:plate` 100/60s;
`/api/vin/:vin` 30/60s; `/healthz` + `/api/auth/me` skip; `/og/*` skip (Caddy
owns it). (P2) `/api/ria/similar` 20/60s per IP **+ a global 5000/day Redis
counter** protecting the shared key. (P5) `/api/auth/login|register` **5/15min
keyed on the body email** + 20/15min per IP.

## Phase 5 — accounts (login + favorites + search history), conditional

Additive to the Nest + Postgres stack; no rewrite.

- **DB:** new `app` schema — `users`, `sessions`, `favorites (user_id, plate,
created_at)`, `search_history (user_id, query, kind, found, created_at)`. Same
  instance; split to its own DB only if user data becomes commercially critical.
- **API:** `AuthModule` (argon2 + httpOnly session cookie; Google OAuth via
  Passport later, matching v1), `FavoritesModule`, `HistoryModule`, session
  `CanActivate` guard, `@nestjs/throttler` on login (account-keyed).
- **Web:** login/register forms, `useSession()` query, protected `/favorites` +
  `/history`, favorite toggle on the result card (v1 had the UI + a 50-item cap).
  Auth is server state, not Zustand.
- **Knock-ons:** backup policy flips (above); PostHog `identify()` becomes real
  (drop anonymous-only); EU cookie-consent surface; account deletion + data export.
- **Cheaper interim:** recent searches in `localStorage` (no account), like v1.

## Later, conditional

SSR for `/:plate` only if organic search traffic matters · region as a real
indexed column if region filtering is needed · Drizzle v1 upgrade per the
trigger above · NestJS 12 bump when `nestjs-zod` supports it · TypeScript 7 when
`typescript-eslint` supports it · self-hosted GlitchTip if Sentry's free tier is outgrown.
