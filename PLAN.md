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

Everything is on `latest` **except** the six below. Each is held back for a
concrete reason with a revisit trigger — not caution for its own sake. Re-check
by re-reading this section before bumping.

| Package                | `latest` (2026-09)                                                | We use                                         | Why held back                                                                                                                                                                                                                                                                                                | Revisit when                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **typescript**         | `7.0.2`                                                           | `~5.9.3`                                       | `typescript-eslint@8.70` peer-requires `typescript >=4.8.4 <6.1.0`. TS 7 (and even 6.1) breaks **all** type-aware linting (`no-floating-promises`, the parser itself).                                                                                                                                       | `typescript-eslint` declares TS 7 support (watch its peerDeps / release notes).                                                                          |
| **@nestjs/core** & co. | `12.0.1`                                                          | `^11.2.3`                                      | `nestjs-zod@5.5.0` (latest, nothing newer) peer-requires `@nestjs/common ^10 \|\| ^11` and `@nestjs/swagger ^7 \|\| ^8 \|\| ^11` — no Nest 12. `nestjs-zod` is core to the design (one Zod schema → validation pipe **and** OpenAPI).                                                                        | `nestjs-zod` ships a release listing `@nestjs/* ^12` in peerDeps. Then bump all `@nestjs/*` together.                                                    |
| **drizzle-orm**        | `0.45.2` is the `latest` **tag**; `1.0.0-rc.4` is on the `rc` tag | `0.45.2` (exact)                               | We're on the actual latest **stable**. Not the RC: the maintainers haven't promoted v1 to `latest` (their own signal); `drizzle-kit` + `drizzle-zod` still target 0.4x; the v1 stream ran 23 betas + ≥5 RCs and still iterates. v1's headline features (RQB v2, RLS, generated columns) are irrelevant here. | npm `latest` points at `1.x` **and** `drizzle-kit` + `drizzle-zod` have stable v1 releases. Then follow `/docs/upgrade-v1`; our Drizzle surface is tiny. |
| **vitest**             | `5.0.0`                                                           | `^4.1.11`                                      | 5.0.0 shipped as a same-window `.0`. 4.1.11 is mature and already supports Vite 8 (`vite: ^6 \|\| ^7 \|\| ^8` peer) and Node 24. Same "stable over shiny" call as Node 24-not-26.                                                                                                                            | 5.x has a few patch releases and the plugin ecosystem (coverage, ui) has caught up. Low urgency.                                                         |
| **node**               | `26.8.2` (Current)                                                | `24.x` (`24.21.0` is the newest LTS "Krypton") | 26 only becomes LTS in Oct 2026; "entering LTS" ≠ ecosystem-ready — native deps and CI images take months. Conservative for an unattended VPS. Upgrading is a one-line `.nvmrc` / Dockerfile change.                                                                                                         | 26 has been LTS for a few months and `node:26-alpine` is everywhere.                                                                                     |
| **@tanstack/react-table** | `9.2.4`                                                        | `^8.21.3`                                      | v9 (added 2026-09, Phase 1.5 stats table) is a ground-up rewrite — feature-based internals, no top-level `useReactTable`/`getCoreRowModel`/`getSortedRowModel` (moved under `./legacy`). v8's headless sort/filter API is the one this codebase's usage is built against and is well-established.        | v9's docs/ecosystem (examples, Stack Overflow, this model's training data) catch up to the new API — re-verify against its actual docs before bumping, not from memory.                        |

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
  - `ingest.ts` — CKAN `package_show` → per-resource ZIP, processed
    **chronologically by year** (tiebroken by `created` for same-year
    duplicates like 2022's three republishes) → stream-parse (UTF-8 by
    default, `;`-delimited, **header-name-driven column mapping** — see
    "2026 plate removal" below) → batched insert/upsert → refresh view →
    record in `ingested_resources`. Flags: `--year`, `--limit`, `--file`
    (accepts a raw `.csv` or a `.zip`, downloaded or local), `--after
    <YYYY-MM-DD>` (skip rows before this `d_reg` — e.g. rows already covered
    by an archived snapshot), `--dry-run`, `--encoding <utf8|win1251>`,
    `--archive <dir>`, `--backfill-plates`. The already-ingested check
    compares `last_modified` as a timestamp, not text — Postgres and CKAN
    serialize it differently, so a naive string compare never matches.
  - `ingest-full.ts` (`pnpm ingest:full`) — one command for the full real
    dataset: `ingest.ts` (all years) → downloads and ingests the archived
    pre-redaction 2026 snapshot (see below; best-effort, warns and continues
    if unreachable) → `ingest.ts --backfill-plates`.
  - `transform.ts` — `buildLayout` resolves a file's header row to a column
    layout by name (throws if none match, case-insensitive); `mapRecord` uses
    that layout, so field order — or case — never has to match across years.
  - `backfill.ts` — `backfillPlates()`: reconstructs `plate` for rows the
    registry published without one, via an exact `(vin, d_reg, oper_code)`
    match first, a VIN-latest-plate fallback second (flagged `plate_inferred`),
    then dedupes rows the two ingested sources now both cover. Runs inside one
    transaction that drops/recreates the dedupe indexes — holds an exclusive
    lock on `registrations` for its full multi-minute duration; nothing else
    can query that table until it commits.
- `infra/docker-compose.yml` — local Postgres only. Note: `postgres:18+` mounts
  the volume at `/var/lib/postgresql` (not `/data`).

**Not in Phase 1:** CI, GitHub repo, VPS, deploy, OG images. (A real full local
ingest — all 13 years + 2026 recovery, ~25M rows, ~20 GB — was run and verified
during Phase 1 to prove the pipeline; it's a one-machine dev-DB exercise, not
the Phase 4 monthly-cron-on-a-VPS story.)

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
whole year-to-date file was rewritten, not just new rows — plates are gone
from the live resource for the entire 2026 year-to-date, not just rows added
after the order.

**Recovery source.** `data.gov.ua` replaces a resource's file in place, so the
plated version is gone from the documented CKAN API (`package_show`) — but the
resource's revision history is still browsable on its dataset page (not part
of the CKAN API, undocumented, and it has 502'd during portal maintenance at
least once), and each entry there links to that exact revision's file. Reading
that history: the last revision that still has `N_REG_NEW` populated is dated
**May 1, 2026** (internal filename `reestrtz01.05.2026.csv`); the very next
recorded revision, **June 23, 2026**, is already in the redacted 17-column
layout — so the actual cutover on `data.gov.ua`'s side happened sometime in
that window, ahead of the order's own 2026-06-29 effective date. `pnpm
ingest:full` downloads that May 1 revision directly
(`ingest-full.ts`'s `ARCHIVE_2026_URL`) rather than shipping the file in the
repo — nothing to keep in sync, but it means that one URL is the sole recovery
path; if `data.gov.ua` ever prunes that revision for real (not just
maintenance), this becomes unrecoverable everywhere the file wasn't manually
archived. `ingest-full.ts` treats the download as best-effort: a failure
(down, 502, network) logs a warning and the run continues without 2026 plate
recovery rather than aborting.

Design: `plate` is nullable (`CHECK (plate IS NOT NULL OR vin IS NOT NULL)`
instead of a second table, so a rollback of the order just needs a re-ingest +
re-run of `--backfill-plates`, not a migration). Measured recovery on the full
13-year history (2026-09-21 run), joining the May 1 archive against the live
redacted resource on `(vin, d_reg, oper_code)`: of 1,335,868 rows the live
resource published without a plate, **41.9% (560,369)** get an authoritative
plate back from the archive; a further **27.8% (371,269)** link by VIN to a
plate seen anywhere else in the 13-year history (flagged `plate_inferred`,
since the vehicle may have been re-plated since) — **69.8% total recovery**,
404,230 rows remain plateless. `--archive <dir>` still exists for archiving
*live* CKAN downloads during a regular `ingest.ts` run (see the backup policy
note in Phase 4) — it's just not how the 2026 recovery file itself is kept,
per the above.

## Phase 1.5 — client-side & reporting additions (no accounts needed)

Doable now, independent of Phases 2-5; each is additive and doesn't block the others.

- **Local search history (IndexedDB) ✅ DONE (2026-09-22)** — client-side only
  (`apps/web/src/lib/history-db.ts`, on top of the tiny `idb.ts` wrapper), no
  API/DB changes. Stores kind/value/label/timestamp per lookup (upserted on
  revisit); `HistoryRoute` groups entries by calendar month (`routes/history/helpers.ts`)
  into collapsible sections, each with per-record delete; a header "clear all"
  clears the whole store. Upgrades the Phase 5 "cheaper interim"
  (`localStorage`) — keep the record shape close to the future
  `search_history` table so a Phase 5 migration is a straight copy, not a
  rewrite.
- **Favorites (IndexedDB) ✅ DONE (2026-09-22)** — same pattern
  (`apps/web/src/lib/favorites-db.ts`): a star toggle on the result card
  (`FavoriteButton.tsx` / `use-favorite-toggle.ts`) add/removes client-side, a
  `FavoritesRoute` lists them. No API/DB changes. Superseded by Phase 5's
  `favorites` table when accounts land.
- **Registry statistics — step A ✅ DONE (2026-09-23), step B ✅ DONE (2026-09-23)**
  (scoped 2026-09-23, two-step delivery — table first, map second, each
  independently shippable). Figures confirmed against the real full 13-year
  dataset after a from-scratch re-ingest (2026-09-23 recovery — see
  CLAUDE.md's data-safety rule for why one was needed): **24,721,694** total
  rows, **16,723,888** distinct plates, **6,456,049** distinct VINs,
  **404,230** still plateless — an exact match to the original 2026-09-21
  figures, confirming the ingest pipeline is fully deterministic.

  **DB.** `COUNT(DISTINCT ...)` live over 24M+ rows is too slow for a request
  path — never computed on read. Seven narrow matviews
  (`migrations/0002_stats_rollups.sql`) refreshed at the end of every
  `ingest.ts` / `ingest-full.ts` / `backfill.ts` phase, alongside the existing
  `current_registration` refresh:
  - `registry.stats_summary` — one row: totals (as above)
  - `registry.stats_by_year` — by `d_reg` year (~14 rows)
  - `registry.stats_by_region` — by plate-prefix → `registry.plate_regions`
    (a static lookup table mirroring `REGIONS` from `@carplates/shared`,
    seeded by the migration itself — join-then-group so
    `COUNT(DISTINCT ...)` is computed once per real region, not summed across
    a region's two historical prefixes; ~27 rows)
  - `registry.stats_by_body`, `stats_by_kind`, `stats_by_color` — one
    dimension each (~10-30 rows each)
  - `registry.stats_by_region_year` — the one 2D rollup worth materializing
    (region × year, ~27 × 14 ≈ 380 rows), for the map + year-range filter
    combination. Deliberately not a full region × year × body × color × kind
    cube (would be 700k+ mostly-empty rows) — add another 2D slice only when
    a concrete UI need shows up, not preemptively.

  Measured on the real dataset: all seven combined are **~144 KB** —
  negligible against the ~14 GB base tables and the ~7 GB
  `current_registration` matview (21 GB database total). No new database,
  same instance/schema per the Phase 5 precedent (split only if commercially
  critical, which derived read-only data never is).

  **API.** `GET /api/stats` (`apps/api/src/stats/`), no query params — all
  seven rollups are small enough to return in one response and filter/sort
  client-side, so there's nothing to parameterize server-side. Thin
  controller, logic in `stats.service.ts`, response validated by one Zod
  schema (`statsResponseSchema` in `@carplates/shared`) per the
  `plate.dto.ts`/`vin.dto.ts` pattern. Default metric on first load:
  **distinct plates** (most intuitive "how many vehicles" figure for a
  general audience; distinct VINs and total records stay selectable, not
  default).

  **Web — step A (table) ✅ DONE:** `/stats` route
  (`routes/stats/StatsRoute.tsx`, `React.lazy` per the existing pattern in
  `App.tsx`), registered as a static path (matches before the `/:query`
  catch-all), linked from the sidebar nav and a "View statistics" link (with
  a 📊 icon, next to "View search history") on the search page. Filters
  (dimension tab, initial sort metric) live in URL search params
  (`useSearchParams`), not Zustand — this is server state, not client UI
  state. The whole `/api/stats` payload fetched once via TanStack Query
  (`queryOptions()`, `staleTime: Infinity` — this data only changes on the
  monthly ingest cron, never "live"). Sort/filter client-side with
  **TanStack Table** (pinned to `^8`, not the just-released `9.x` — see the
  version-pins table above); wrapped in **TanStack Virtual** once a
  flattened view passes the 50-row virtualization threshold
  (`stats_by_region_year` at ~380 rows needs it; the 1D tables don't).
  Also fixed in passing: `ingest.ts` now skips re-downloading a CKAN
  resource ZIP that's already cached in `scripts/.data/` (keyed by resource
  id + `last_modified`, so a changed resource still re-downloads) — a real
  gap found while re-ingesting for recovery, not specific to stats.

  **Web — step B (map) ✅ DONE:** oblast-level choropleth over
  `stats_by_region`, same `/stats` route as step A — a `view=table|map` tab
  (`StatsRoute.tsx`), scoped to `dim=region` only (switching to `map` forces
  `dim=region`; switching dimension away from `region` drops `view` back to
  `table`), plus a metric switcher (`distinctPlates`/`distinctVins`/`totalRows`,
  reusing `stats.column.*` labels) that now also re-sorts the table, not just
  the map fill. Library: `react-simple-maps` v5 + `d3-geo` (MIT, no API
  key/tile server — 27 polygons don't justify Leaflet/Mapbox GL). Boundary
  data: geoBoundaries.org Ukraine ADM1, simplified with `mapshaper` (761 KB →
  43 KB) and bundled as a static asset (`apps/web/public/ukraine-adm1.geojson`,
  fetched once via TanStack Query, `staleTime: Infinity`) — **license is
  ODC-ODbL-1.0 (OpenStreetMap/Wambacher), not CC-BY-4.0** as originally
  guessed above; attribution is rendered under the map. A static lookup
  (`region-geography.ts`, `shapeISO` → the exact `REGIONS` Ukrainian string,
  regression-tested 1:1 against `REGIONS`) matches map polygons to rollup
  rows. AR Crimea and Sevastopol render as ordinary regions, matching how
  `REGIONS` already treats those plate prefixes — no special-casing.

  **Gotcha hit and fixed:** geoBoundaries' source rings (shapefile-derived)
  are wound clockwise, the opposite of what `d3-geo` expects (RFC 7946
  counter-clockwise) — `d3.geoArea()` on every feature came back ≈4π (i.e.
  "the whole sphere minus a hole") instead of a small fraction, and every
  `<Geography>` path silently grew a second subpath tracing the full clip
  rectangle, painting one solid color block over the whole SVG instead of
  Ukraine's outline. Fixed by reversing every ring's point order once at prep
  time (no separate rewind dependency needed — no holes in this dataset, so
  reversal is unconditional and safe). Caught by actually opening the page in
  a browser, not by type-check/lint/tests, which all stayed green throughout.

  One metric encoded as choropleth fill at a time (sequential single-hue blue
  ramp — steps documented in the project's `dataviz` skill palette, dark mode
  flips which end recedes into the surface, per-cell hover tooltip + keyboard
  focus parity via `aria-label`, gradient legend with min/max). Exact numbers
  via hover tooltip rather than printed on-shape. A bubble/circle overlay is
  deferred unless a later need arises to compare two metrics at once — fill
  alone is the default, to avoid redundant double-encoding of one number.

  **Follow-up polish ✅ DONE (2026-09-23):** the `view=table|map` toggle moved
  to its own top row and picked up a "segmented control" style (gray track,
  white active pill) shared with the metric switcher — visually distinct from
  the dimension tabs' filled-blue-pill style, so the three control groups
  read as separate clusters at a glance. Dimension chips collapse to `By
  region` only while `view=map` (the other five aren't applicable to the
  map). Dimension/metric buttons got emoji icons (🗺️🧭📅🚙🚚🎨 /
  🏷️🆔📋 — same plain-emoji convention as the rest of the app, not an icon
  library). All tab/toggle buttons transition color on change, and the
  table/map content itself fades in (`animate-fade-in` in `global.css`,
  `prefers-reduced-motion`-aware) on every dimension/metric/view change. The
  table's scroll height changed from a flat `max-h-[70vh]` to a
  viewport-adaptive `clamp()` (separate mobile/desktop constants, tuned
  against measured chrome height so it lands within ~20-30px of the viewport
  bottom on both) with a `min-height` floor — not applied to the map, which
  stays aspect-ratio-bound. A `yearRange`/`yearBoundaryLabel` helper pair
  (unit-tested) now prints the dataset's actual coverage under the title
  ("Covers registrations from 2013 to September 2026") — the current
  calendar year gets its month appended, since `byYear` has no month
  breakdown and this year's total is never actually complete yet.
- **Plate lookup by camera/photo ✅ DONE (2026-09-22)** — moved up from Phase
  3+ below; see that section, kept in place to avoid duplicating the design
  notes.
- **Registration history as a timeline ✅ DONE (2026-09-23)** — the
  show/hide history toggle on `ResultCard` (and the equivalent list on
  `VinResult`) is now a static "Registration history" label (with a clock
  icon) whose expand state is a rotating chevron, not text that swaps between
  "Show"/"Hide". `RegistrationActionsList.tsx` was replaced by
  `RegistrationTimeline.tsx`: a shipping-tracker-style vertical timeline —
  a point per action, connected by a line with an up-chevron between each
  pair (the API returns history newest-first and that's still the display
  order, latest on top, so the arrows point up — the direction the dates
  actually run in, oldest at the bottom). The most recent action's point is
  filled/highlighted. Each step now also shows the oblast, derived per-step
  via `regionName(action.plate)` from `@carplates/shared` (re-plating can
  move a vehicle between regions across its history, so this is computed per
  action, not once for the whole card) — falling back to a new
  `result.regionUnknown` string for plateless (2026+ order) rows or
  unrecognized/foreign prefixes, rather than going blank. No new city-level
  data: `regAddrKoatuu` is a raw KOATUU code with no lookup table in this
  codebase, so the department (`dep`) link to Google Maps search remains the
  closest thing to a city/office location.
- **Plate-page "more details" now shows the full VIN history + VIN decode, one fetch ✅ DONE (2026-09-23)** —
  `ResultCard` used to hide 7 registration fields behind a local-only expand
  (no fetch) and fetch `/api/plate/:plate/history` separately behind a second
  "Registration history" toggle. Two problems: all registration fields are
  free (already in the initial `/api/plate/:plate` payload) so hiding any of
  them behind a click bought nothing, and plate-scoped history is
  incomplete — `plate.service.ts`'s `identityFilter` only matches the exact
  plate string (plus plateless rows sharing its VIN), so a car re-plated at
  some point in its history has earlier plates invisible on this page. Fix:
  every registration field now shows immediately, and the two toggles merged
  into one "More details" button that, when a VIN is known, fetches
  `/api/vin/:vin` — `vin.service.ts`'s `lookupRegistry` filters purely on
  `WHERE vin = :vin` with no plate condition, so it already returns every
  plate the car ever wore, plus the NHTSA decode fields, in one request. Falls
  back to the old plate-scoped fetch only when the current registration has
  no VIN. `VinDecodeFields.tsx` extracted from `VinResult.tsx` so both the
  standalone `/vin/:vin` page (left unchanged) and this new inline section
  share the same field-list markup instead of duplicating it.
- **NHTSA `decodevin` vs `DecodeVinExtended` — researched, not switching (2026-09-23)** —
  compared both endpoints for a real VIN: identical field set except
  `DecodeVinExtended` adds 4 NCSA crash-statistics crosswalk fields (`NCSA
  Make`/`Model`/`Body Type`/`Note`) that duplicate `Make`/`Model` in a form
  meant for matching against crash databases, not end users. `/api/vin/:vin`
  already forwards every non-empty field from `decodevin`, and the UI already
  renders all of them — no gap to close, so staying on the plain endpoint.
- **Result card visual polish — width, type scale, hover states, icons ✅ DONE (2026-09-23)** —
  `ResultCard`/`VinResult` widened `max-w-xl` → `max-w-2xl` (matching
  `SearchField`/`SearchRoute`'s header, bumped the same way) and moved one
  step up Tailwind's default type scale (`text-sm`→`text-base` body/rows,
  `text-lg`→`text-xl` titles, `text-xs`→`text-sm` secondary lines) across
  `ResultCard`, `VinResult`, `VinDecodeFields`, and `RegistrationTimeline` —
  no custom `@theme` font-size tokens exist here, so staying on the built-in
  scale keeps it consistent with the rest of the app rather than introducing
  arbitrary px values. Cards gained a `hover:shadow-md` lift; every row
  (`ResultCard`'s field rows, `VinDecodeFields`, `RegistrationTimeline`'s
  history items) now bleeds to the card edges on hover with a shared
  `hover:bg-[var(--color-border)]/40` treatment. The "More details" toggle's
  clock SVG was replaced with a ⚙️ emoji (this app's plain-emoji icon
  convention — see the stats dimension/metric icons — not a custom icon set);
  the freed-up 🕘 now sits on both "Registration history" headings
  (`ResultCard`'s expanded section and `VinResult`'s `vin.registryTitle`), and
  🆔 was added next to every "VIN decode" heading. The dynamic count line
  ("Registration actions: {{count}}") was replaced with a fixed
  `result.historyLabel` string ("Registration / VIN history") across all
  three locales — `historyCount` stays in the API payload/schema, just
  unrendered now. Doesn't touch the still-open `vin.registryTitle` /
  `result.historyTitle` text mismatch below — only the icon was harmonized,
  the label text itself is unchanged.
- **Fuel-type icon + breakdown popover on the result card, "By fuel" stats dimension ✅ DONE (2026-09-23)** —
  `fuel` is free text from the source registry, not a fixed enum. Querying the
  live 24.7M-row `registry.registrations` table turned up **16 distinct raw
  values**: 5 base fuels (`БЕНЗИН`, `ДИЗЕЛЬНЕ ПАЛИВО`, `ГАЗ`, `ЕЛЕКТРО`,
  `ВОДЕНЬ`), 6 hybrid/bi-fuel combos written as "X АБО Y" / "X, Y АБО Z" / "X
  ТА Y", and 5 unknown/absent/garbage markers (`NULL` — a literal string from
  some year's ingest, distinct from a true empty value —, `ВІДСУТНЄ`, `НЕ
  ВИЗНАЧЕНО`, `.`, and a genuinely blank value).

  `ResultCard`'s fuel row now shows an icon next to the value
  (`ResultCard.helpers.ts`'s `getFuelIcon`/`isKnownFuel`), matched by keyword
  (⛽🛢️💨🔋💧) rather than an exact-value map — a combo stacks every icon it
  contains, and any future source spelling still resolves correctly. A "?"
  button (`FuelInfoButton.tsx`) opens a popover listing every fuel type from
  the registry with its count, highlighting the current record's value;
  known fuels sort by count, the five unknown/absent markers collapse into
  one "not specified" row at the bottom (summed count). Opens on hover (with
  a 1s grace period before closing, so moving the pointer onto the panel to
  scroll it doesn't dismiss it — verified with `vi.useFakeTimers()`, not
  timing-sensitive browser automation) or on click (pins it open, e.g. for
  touch, and matches the panel's own explicit close (✕) button); the
  hover/pin state split matters because a real click always fires
  `mouseenter` first, so a naive single-flag toggle would immediately
  re-close itself.

  **DB/API.** New `registry.stats_by_fuel` matview
  (`migrations/0003_stats_by_fuel.sql`), same footing as the other six
  `stats_by_*` rollups from the step-A rollup above — refreshed by the same
  `refreshStats()`, exposed as `byFuel` on the existing `GET /api/stats`
  response. No new endpoint: the popover just triggers its own (lazy,
  `enabled: <popover open>`) fetch of the already-`staleTime: Infinity`
  `/api/stats` query.

  Reusing that same rollup, `/stats` also gained a "By fuel" dimension tab
  (`STATS_DIMENSIONS`/`DIMENSION_ICONS` in `routes/stats/types.ts`,
  `dimensionRows()` in `helpers.ts`) — `StatsTable`/`StatsRoute` are
  dimension-agnostic, so this needed no other changes. Its unknown/absent
  values collapse into one dash row here too, for the same reason, with one
  disclosed caveat: `totalRows` sums exactly (`count(*)` is additive) but
  `distinctPlates`/`distinctVins` are each already an exact `COUNT(DISTINCT
  ...)` *within* one fuel value, so summing them across the merged values is
  an upper bound, not exact — a plate that wore more than one unknown-fuel
  spelling across its registration history is counted once per spelling. An
  exact figure would need a dedicated rollup grouped by a normalized fuel
  expression; not worth it for an informational stats page. Also widened the
  `/stats` page (`max-w-4xl` → `max-w-6xl`) so all 7 dimension tabs fit on
  one row instead of wrapping.
- **"?" breakdown popover extended to body/kind/color ✅ DONE (2026-09-23)** —
  `body`/`kind`/`color` already had their own `stats_by_*` rollups (unlike
  `fuel`, which needed the source-value research above), so `FuelInfoButton`
  was generalized into `FieldInfoButton.tsx` (`dimension: 'body' | 'kind' |
  'color' | 'fuel'`, picking its rollup/known-filter/icon-getter from a small
  per-dimension config table) and wired onto `ResultCard`'s body, colour and
  vehicle-kind rows the same way it was already wired onto fuel. Per-value
  **icons for `kind` (the "Vehicle-kind icons" backlog item below) were
  skipped** — unlike fuel's 16 already-enumerated values, `kind`'s real
  distinct values haven't been enumerated/mapped to icons yet, and a wrong
  guess is worse than no icon; the popover lists plain text + counts for
  body/kind/color, same as the fuel popover did before it got icons.
- **Vehicle photos (Pixabay) ✅ DONE (2026-09-24)** — resolves the "Car images
  by year/trim/color" backlog research item below. `GET
  /api/photos?brand=&model=&year=` (`apps/api/src/photos/`) proxies Pixabay's
  image search (`pixabay.com/api/docs`), gated by `pixabayEnabled(env)` (inert,
  503, without `PIXABAY_API_KEY` — same pattern as
  `plateRecognizerCloudEnabled`), with `category=transportation`,
  `orientation=horizontal`, `safesearch=true`. Results (id, previewURL,
  webformatURL, pageURL, tags, user) are trimmed to a `VehiclePhotosResponse`
  Zod schema and cached in a bounded in-memory `Map` keyed by the `brand model
  year` query string — same shape as `VinService`'s VIN cache, since stock
  photos for one query don't change day to day. Web: `VehiclePhotos.tsx` sits
  below `ResultCard`'s history section, collapsed by default and titled "What
  it might look like" (ua: "Як це може виглядати") — deliberately not "Photo
  of this car", since Pixabay is queried by brand/model/year only and returns
  generic stock photos, not the specific registered vehicle. Only fires its
  (`staleTime: Infinity`) query once expanded, mirroring `FieldInfoButton`'s
  on-demand-fetch pattern. A small hand-rolled prev/next carousel (no library
  added, none existed in the repo) cycles `webformatURL` images with a
  position counter and a Pixabay attribution line.
- **Vehicle-kind icon (animated, colored) + brand logo on the result card ✅ DONE (2026-09-24)** —
  resolves the "Vehicle-kind icons", "Vehicle body-shape / silhouette images",
  and "Car brand logos" backlog research items below.

  **Kind/color enums.** Unlike `fuel`, both `kind` and `color` turned out to be
  small closed sets in the real data — `SELECT DISTINCT kind`/`color FROM
  registry.current_registration` returned exactly **13** and **14** raw values
  respectively (two of the 14 are alternate registry spellings of "orange").
  `resolveVehicleKind`/`resolveVehicleColor` (`packages/shared/src/vehicleKind.ts`,
  `vehicleColor.ts`) exact-match these onto a canonical `VehicleKind` (13) /
  `VehicleColor` (11) union — safe to exact-match, unlike fuel's keyword
  approach, since the source vocabulary is fully enumerated. `VEHICLE_COLOR_HEX`
  / `VEHICLE_COLOR_SHADOW_HEX` hold a hand-picked lit/shadow hex pair per color.

  **Shapes.** Only 5 body silhouettes exist (sedan/bus/truck/motorcycle/trailer,
  user-supplied artwork), ported into `apps/web/src/assets/vehicleShapes.tsx` as
  inline React/SVG (not `<img>` — dynamic per-vehicle coloring and the wheel
  animation both need the SVG in the DOM). `VehicleKindIcon.tsx` maps all 13
  kinds onto the closest of the 5 (e.g. `moped`/`quad`/`tricycle`/`motoTricycle`
  → motorcycle, `specialized`/`special` → truck, `undetermined` → sedan) — no
  1:1 art for the other 8. The body/shadow fill in each shape is
  `var(--vehicle-body-color)` / `var(--vehicle-body-shadow-color)`, set inline
  per instance from the vehicle's resolved color; wheels/windows stay a fixed
  neutral tone, like real trim/glass. Two `prefers-reduced-motion`-aware
  animations (`global.css`): `animate-vehicle-sheen` (a brightness/saturation
  pulse on the whole icon) and `animate-vehicle-wheel-spin` (rotates each
  wheel's rim+hub+a small off-center highlight dot — without that dot two
  concentric circles are rotationally symmetric and a "spinning" wheel would
  look perfectly static). The spin needed no per-wheel coordinate math:
  `transform-box: fill-box; transform-origin: center` rotates around each
  wheel `<g>`'s own bounding-box center, which is already the rim's center.
  Placed in the header next to brand/model, stretched to the full title+plate
  block height via flexbox's natural cross-axis stretch + `aspect-square` — an
  earlier attempt using `height: 100%` directly fed back into a ~370px icon,
  because percentage height against an auto-height flex parent is ambiguous;
  swapping to stretch-derived height fixed it outright. `VehicleKindIcon`
  deliberately ships no default size classes — `cn()` here is plain `clsx`
  (no `tailwind-merge` dedup in this repo), so a built-in `h-*`/`w-*` could
  never be reliably overridden by a caller's `className`.

  **Brand logos.** Sourced from the MIT-licensed
  [car-logos-dataset](https://github.com/filippofilip95/car-logos-dataset)
  (logos themselves remain trademarks of their owners) — its own listing
  (~650 files) is too large to fetch in one pass (GitHub's contents API,
  its search API, and jsDelivr's flat-file listing all hit the same
  content-size ceiling partway through), and `git clone`/`curl` to fetch it
  in bulk were denied by the sandbox, so each logo was instead pulled
  individually from its raw GitHub URL (a plain fetch doubles as an existence
  check — a wrong guess just 404s). **91 logos, 6.3 MB total**
  (`apps/web/public/logos/`, static — served on demand per result, never
  bundled into the JS) — every brand in the real ingest's top-volume tier plus
  every other globally-recognized car/heavy-truck/bus manufacturer guessable
  by name; not literal 650-file completeness, which would mostly add defunct
  1900s-1930s coachbuilders with ~zero chance of ever matching a Ukrainian
  registration. The dataset is cars/trucks only — confirmed no logos exist for
  motorcycle-only marques (Yamaha, Kawasaki, Harley-Davidson, Ducati, Piaggio
  all 404). `brandLogoUrl()` (`packages/shared/src/brandLogo.ts`) splits the
  registry's raw `"BRAND  MODEL"` string on its double-space separator (single
  space is a legitimate multi-word brand like "LAND ROVER"), and maps Cyrillic
  legacy names to their modern export slug (ВАЗ→lada, ЗАЗ→zaz, ГАЗ→gaz,
  УАЗ→uaz). `BrandLogo.tsx` renders nothing on no match or an image load
  error (`onError`) rather than a broken-image icon; `mix-blend-mode: multiply`
  drops the source PNGs' flat white background against the light card surface
  without needing pre-processed transparent assets.
- **Manufacturer/brand breakdown + year filter on the stats page ✅ DONE (2026-09-24)** —
  user-requested addition, not a pre-scoped backlog item: "By manufacturer"
  (LEXUS/PEUGEOT/HONDA/...) and "By manufacturer and year" dimensions on
  `/stats`, same footing as every other `stats_by_*` rollup. Two new matviews
  (`migrations/0004_stats_by_brand.sql`) mirroring the `region`/`region_year`
  pair exactly: `registry.stats_by_brand` (one row per raw `brand` value,
  all-years total) and `registry.stats_by_brand_year` (brand × year 2D
  rollup — 122,199 rows on the real dataset, well inside the "add a 2D slice
  only when a concrete UI need shows up" budget from the step-A rollup design
  above). Refreshed by the same `refreshStats()`, exposed as `byBrand`/
  `byBrandYear` on the existing `GET /api/stats` response — no new endpoint.
  Web: `brand`/`brandYear` added to `STATS_DIMENSIONS`, `dimensionRows()` in
  `helpers.ts` flattens both the same way `region`/`regionYear` already do;
  `brandYear` reuses `StatsTable`'s existing global-filter text box for the
  "filter to one year" ask (type e.g. `2020`) rather than adding a dedicated
  year picker — same UX `regionYear` already shipped, kept consistent instead
  of introducing a second filtering pattern.

  **Data characteristic, not a bug:** `brand` is unnormalized free text —
  36,321 distinct raw values on the real 24.7M-row dataset (typos/OCR/encoding
  variants), unlike `body`/`kind`/`color`'s small enumerated sets. Not merged
  or normalized (unlike `fuel`'s unknown-value collapsing) since the top
  values by volume are already the real manufacturers (VOLKSWAGEN, RENAULT,
  ВАЗ, MERCEDES-BENZ, SKODA, TOYOTA, FORD, ...) and the table's sort/filter
  already surfaces them; revisit only if the long tail turns out to matter for
  some concrete use. Also noticed, pre-existing and unrelated to this change:
  `distinct_vins` is 0 for 2019-2020 rows across every dimension — those two
  years' source data has no VINs at all (confirmed against `stats_by_year`),
  not something this rollup introduced.
- **Plate-history now shows plate reassignment, not just the current vehicle's
  own VIN history ✅ DONE (2026-09-24)** — user-requested, found while
  looking up plate `ВЕ8388СХ`/`BE8388CX`: the state registry reassigns a
  plate to a different vehicle after the previous one leaves it (here, a
  2014 Nissan Rogue → a 2026 Mazda CX-5), and `ResultCard.tsx` was hiding
  that. `plate.service.ts`'s `history()` already matched raw `plate = X`
  regardless of `vin` (`identityFilter`, unchanged), so `/plate/:plate/history`
  already returned all reassignment rows — the gap was purely client-side:
  `ResultCard` picked *either* VIN-scoped history *or* plate-scoped history
  once a VIN was known, never both, so the VIN-only branch (correctly, for a
  *different* reason — following one vehicle across the plates it wore)
  silently dropped the earlier, different vehicle's rows. Fix: both queries
  now run whenever the history panel is expanded and render as two sections,
  `result.historyTitle` ("Registration history (by plate)") and
  `result.historyTitleVin` ("Registration history (by VIN)") — same data
  source as before, just no longer mutually exclusive.
  `RegistrationTimeline.tsx` takes a new optional `currentVehicle` prop
  (`{ brand, model }`) and labels any row whose brand/model differs from it
  (e.g. "NISSAN ROGUE (2014)") — `Registration` already carried
  brand/model/makeYear per row, so no schema change. No DB/API changes.
- **Brand-logo watermark on the result card ✅ DONE (2026-09-24)** —
  user-requested decorative polish, not a pre-scoped backlog item.
  `BrandLogo.tsx` gained a `variant="watermark"` mode: the same brand PNG
  used inline next to the title, rendered instead full-card-width at its
  native aspect ratio (`h-auto` + `object-contain` — no crop, no stretch),
  pinned to the card's top edge. `mix-blend-multiply` plus a low opacity
  drawn from a CSS custom property (`--watermark-opacity`, `global.css`) keep
  it reading as a faint tint rather than a logo; the property (and the
  animation's duration, below) are deliberately kept in `global.css`, not
  Tailwind arbitrary values in the component, so both stay one obvious edit
  away while tuning. It breathes continuously — `animate-watermark-breathe`
  (`global.css`, `prefers-reduced-motion`-aware) loops `scale(1) →
  scale(1.06) → scale(1)` — rather than a one-shot entrance, since it's a
  permanent backdrop, not a transient UI element; no hover interaction (tried
  brightening on hover, reverted — user wanted a static, testable opacity
  instead). It sits behind in-flow content via `-z-10`, inside `ResultCard`'s
  `Card`, now also `isolate overflow-hidden` so the negative z-index stays
  scoped to the card and the top corners clip the banner instead of it
  spilling past them. `alt=""` + `aria-hidden` keeps it out of the
  accessibility tree — the existing inline `BrandLogo` next to the title
  remains the one screen readers see.
- **Crash-test safety ratings (NHTSA), reversing the earlier "parked" call ✅ DONE (2026-09-24)** —
  the Phase 3+ research below had parked this on "ratings only exist for
  US-market trims NHTSA actually crash-tested... a large share of vehicles
  registered in Ukraine are Euro/JP/Korea-spec or grey imports... low value
  for the effort." Revisited after confirming several genuinely common
  Ukrainian-fleet nameplates — Toyota Corolla/Camry/RAV4, Honda Civic/CR-V,
  Ford Focus/Escape, Mazda6, VW Tiguan (pre-2018, same platform globally) —
  do have real NHTSA data; shipped as an "if available" section, not a
  guarantee, gated on nothing but the make/model/year already resolved
  elsewhere.

  **API.** `GET /api/safety?make=&model=&year=` (`apps/api/src/safety/`)
  two-step-walks `api.nhtsa.gov/SafetyRatings` (modelyear/make/model →
  `VehicleId` per US-tested trim, then `VehicleId` → the full rating) — same
  free/no-key/public-domain provider as vPIC, but a different host
  (`NHTSA_SAFETY_RATINGS_BASE_URL`, separate from `NHTSA_BASE_URL`). Returns
  `ratings: []`, not a 404, when nothing matches — absence is the expected
  common case here, not an error. Captures every field NHTSA returns,
  including several easy to miss on a first pass: side-pole rating,
  rollover-risk percentage + dynamic-tip-test result, ESC/FCW/LDW equipment
  flags, a secondary/legacy combined-side-barrier sub-score, and
  investigation count alongside complaints/recalls.

  **Model-name matching, found via a real bug report.** A "no data for my
  2016 Mazda6, but it's a real US import" report traced to an exact-string
  miss: the Ukrainian registry (and vPIC's own decode) store Mazda's numeric
  models bare (`"6"`), while NHTSA indexes them as `"Mazda6"` — Mazda's own
  naming convention. `SafetyService.findVariants()` now retries with
  normalized candidates on an empty result — a Mazda-specific `N` → `MazdaN`
  (2/3/5/6) mapping, then a generic "strip to the leading word" fallback for
  trim-suffixed registry values (`"3 MPS"`, `"Focus Titanium"`) — trying the
  raw value first so the common (exact-match) case costs nothing extra.

  **Crash-test video, transcoded.** NHTSA's clips are `.wmv` — confirmed
  directly in Chrome (`canPlayType('video/x-ms-wmv')` is empty, real playback
  throws `MEDIA_ERR_SRC_NOT_SUPPORTED`) that no modern browser can decode
  them, so linking straight to the file would just be a broken inline
  player. `GET /api/safety/video?url=` (`safety-video.service.ts`) validates
  the URL against a strict `static.nhtsa.gov/crashTest/videos/...wmv` regex
  (no open transcoding proxy / SSRF surface), downloads it, transcodes to mp4
  via a directly-spawned `ffmpeg-static` binary (new dependency; its
  postinstall binary download needed allowlisting in `pnpm-workspace.yaml`'s
  `allowBuilds`), and caches the result in the OS temp dir — deliberately
  outside the repo tree, since `apps/api` runs under `tsx watch` and writing
  into a watched directory would restart the server on every transcode.
  `CrashVideoModal.tsx` points a plain `<video>` at that endpoint; each
  variant also keeps a plain "download the original file" link alongside it,
  since the transcode is a nice-to-have, not the only way to get the clip.

  **Web.** `SafetyRatings.tsx` sits below the registration history,
  collapsed by default (fetch-on-expand, mirroring `VehiclePhotos`), one row
  per NHTSA-tested trim with a brand-logo placeholder (falling back to plain
  text only if no logo is bundled either) when NHTSA has no crash photo for
  that trim. An "Overall" headline number leads each summary — deliberately
  *not* a naive average of Overall+Front+Side+Rollover+SidePole, since
  Overall is already NHTSA's own computed combination of Front/Side/Rollover
  and averaging it back in with its own components would double-count them;
  with more than one matching trim, the headline is the mean of just the
  independent trims' own Overall figures, with Front/Side/Rollover/SidePole
  averages kept as smaller supporting detail underneath. Two "?" info
  popovers (`InfoPopover.tsx`, a static-content sibling of `FieldInfoButton`)
  explain the rating categories and list which brands this can plausibly
  cover (current/discontinued US-market brands vs. examples that never sold
  there — Lada, ZAZ, Renault, Škoda, etc.) — both portal-rendered to
  `document.body` with viewport-clamped positioning, needed after the first
  version's inline-positioned popovers were silently clipped by an ancestor's
  `overflow: hidden` (`ResultCard`'s watermark-clipping wrapper, and
  `SafetyRatings`' own collapse-animation wrapper) with no way to scroll to
  the missing content.

  **Recalls** (the sibling `api.nhtsa.gov/recalls` endpoint) stays parked —
  see Phase 3+ below, reasoning unchanged.
- **Open (not yet done): VinResult's history section is mislabeled.** Its
  "Registration history" timeline is titled `vin.registryTitle` ("State
  registry data") while `ResultCard`'s identical section is titled
  `result.historyTitle` ("Registration history") — same component, same data,
  different name. Also, `registry.plate` (the VIN's current known plate) is
  fetched by `/api/vin/:vin` but never shown anywhere on the VIN page, unlike
  the plate page which headlines its VIN. Fix agreed in principle, not yet
  applied — see TODO below.
- **Vehicle-color ambient background glow (card + page-wide) ✅ DONE (2026-09-25)** —
  user-requested decorative polish, not a pre-scoped backlog item. Same idea as
  the brand-logo watermark above, but tinted by the vehicle's own color instead
  of its brand: `packages/shared/src/vehicleColor.ts` already had
  `resolveVehicleColor`/`VEHICLE_COLOR_HEX` (used for the vehicle-kind icon);
  gained `fallbackVehicleColor(seed)`, a deterministic hash-based pick from
  `VEHICLE_COLORS` for when the registry's own color is unrecognized/null, so
  a given plate/VIN still gets a consistent (not flickering-on-rerender) color
  instead of no glow at all.

  `ResultCard` and `VinResult` each render a blurred `radial-gradient` behind
  their card content (`-z-20`, `-inset-12`, `blur-3xl`), and `SearchRoute`
  renders a second, page-wide one (`BackgroundGlow.tsx`, `fixed inset-0 -z-10`)
  behind everything — both reuse the same `animate-glow-breathe` utility
  (`global.css`, aliases the existing `watermark-breathe` keyframes, so no new
  keyframes needed) for a slow 10s pulse, plus a `transition-[background]`
  crossfade so color changes never hard-cut. On the default route (no search
  yet, no vehicle color to show), `use-random-vehicle-color.ts` instead cycles
  a fresh random pick from all `VEHICLE_COLORS` every 10s — paused (an
  `enabled` flag) once a real search result is driving the color, so the
  interval isn't running pointlessly in the background.

  **Readability gotcha, found live.** The card's colored backdrop can reduce
  text contrast for some hues, so each field's key/value text got its own
  small `bg-[var(--color-surface)]/20` chip (sized to the text, not the full
  row) rather than a full-row background — applied to `ResultCard`'s `Row`,
  `RegistrationTimeline`'s date/plate line, and `VinDecodeFields`'s `dt`/`dd`
  (shared by both `ResultCard`'s VIN-decode panel and `VinResult`). The first
  version added `backdrop-blur-sm` to those chips for extra smoothing, which
  broke `FieldInfoButton`'s popover: `backdrop-filter` creates a new CSS
  stacking context, which trapped the popover's `z-10` inside its own row's
  context — later rows (each also now a stacking context) then painted on top
  of it regardless of z-index. Fixed by dropping the blur and keeping only the
  translucent color.

  `PhotoThumbnail` (the "search by photo" preview) also grew from a fixed
  128px strip to 256/384px and from `max-w-xl` to `max-w-2xl` (matching the
  search field and result card width) in the same pass.

  **Follow-up (2026-09-25): the card's own glow now tracks the cursor.**
  Previously fixed at a `radial-gradient(ellipse at top left, ...)`; now
  `ResultCard` and `VinResult` each attach a shared `useCursorGlow` hook
  (`apps/web/src/hooks/useCursorGlow.ts`) via `Card`'s new optional `ref`
  prop. The hook listens on `window` (`pointermove`, not scoped to the card's
  own `onMouseMove`), computes the pointer position relative to the card's
  `getBoundingClientRect()`, and writes it straight to `--glow-x`/`--glow-y`
  custom properties on the DOM node — no `setState`, so pointer movement never
  triggers a React re-render. The gradient background reads
  `radial-gradient(ellipse at var(--glow-x, 0%) var(--glow-y, 0%), ...)`,
  falling back to the original top-left corner before the first pointer
  event (touch devices, initial paint). Window-level (not card-scoped)
  tracking was a deliberate choice — confirmed with the user — so the glow
  keeps drifting toward the cursor even outside the card's own boundaries,
  rather than resetting the moment the pointer leaves it. The existing
  `transition-[background]` crossfade shortened from 1000ms to 300ms
  `ease-out` so it reads as the glow trailing the cursor rather than the slow
  color-change pulse it was tuned for originally. `BackgroundGlow.tsx` (the
  separate fixed, page-wide glow behind everything on `SearchRoute`) is
  untouched — still centered at a static `50% 30%`.

## Phase 2 — RIA "similar cars" proxy — **not started, blocked on a token**

`GET /api/ria/similar?brand&model&kind&year` runs the whole `developers.ria.com`
sequence server-side; the `api_key` leaves the client. The ~4700 lines of
hardcoded brand→id matrices from the v1 app move server-side, ideally as a
`ria_marks` table refreshed from RIA's own `/auto/categories/{id}/marks`. Web:
lazy-loaded card list under the plate result, mounted only after the plate query resolves.
Needs a free/low-cost `developers.ria.com` API key first — see backlog below.

## Phase 3 — Platesmania — **skipped for now**

Was: a proxy endpoint injecting `PLATES_MANIA_KEY`, using `denormalizePlate`
(Cyrillic→Latin), lazy-loaded card list. **Parked**: no free API tokens are
available for platesmania.com, and scraping the site directly instead of
using an API isn't a viable substitute (ToS risk, fragile against markup
changes, no stable auth story). Revisit only if a free/affordable token
becomes available.

### Plate image recognition (camera/upload) ✅ DONE (2026-09-22)

v1 idea (camera/upload → platerecognizer.com via a proxy) implemented for
real, ahead of Phases 2/3: `apps/api/src/recognize/` — `POST
/api/recognize/plate/cloud` proxies Plate Recognizer's Snapshot API
(`guides.platerecognizer.com/docs/snapshot/getting-started`) via
`@fastify/multipart`, gated by `plateRecognizerCloudEnabled(env)` (inert
without `PLATE_RECOGNIZER_CLOUD_TOKEN`) and a per-process monthly request
budget (`PLATE_RECOGNIZER_MONTHLY_BUDGET`, resets on the 1st — revisit with
Redis/DB persistence once there's more than one API process). Web:
`CameraCaptureDialog` + `CameraSearchButton` + `PhotoSearchButton`
(`SearchField.tsx`), client-side image shrink (`lib/image.ts`) before upload,
`use-plate-recognition.ts` navigates to the top candidate's plate result on
success. **On-premise SDK ruled out** — same per-lookup licensing as the
cloud API (no cost win) for photos we're already comfortable sending to
Plate Recognizer's cloud; not pursuing it.

### Phase 3+ — recalls — **researched, parked (2026-09-24)**

Crash-test *ratings* (`api.nhtsa.gov/SafetyRatings`) graduated out of this
section and shipped for real — see Phase 1.5 above ("Crash-test safety
ratings (NHTSA), reversing the earlier 'parked' call") for what changed and
why the original pessimism below turned out to be too broad-brush (it holds
for grey-import/Euro-only-spec vehicles, but not for the many
globally-sold-platform nameplates actually common in Ukraine's fleet).

**Recalls** (`api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=`,
same free provider, separate from SafetyRatings) still has the same
make/model/year key and the same US-market caveat — a recall campaign may not
apply to a non-US-spec unit sharing the model name, and unlike a star rating
(where a shared global platform genuinely shares its crashworthiness), a
recall is about a specific parts/build defect that may simply not exist on a
non-US production run. Per-recall fields: `Component`, `Summary`,
`Consequence`, `Remedy`, `NHTSACampaignNumber`, `ReportReceivedDate`,
`parkIt`/`parkOutSide`/`overTheAirUpdate` flags. **Decision: still skip** —
the mismatch risk here is sharper than it was for ratings, since a recall
presented as applicable when it isn't is actively misleading (not just
"missing data"), not merely low-value. Revisit only alongside a real accuracy
story for matching recalls to non-US-spec vehicles, not just a shared model
name.

## Backlog (2026-09-22)

Snapshot of what's actually next, split from what still needs a decision
before it's buildable. Not a phase — items here get folded into Phases 2-5
above once scoped, or dropped if research says no.

### Actual — ready or in progress

- ✅ Local search history in IndexedDB, grouped/collapsible by month/year,
  per-record delete + clear-all — done, see Phase 1.5.
- ✅ Add/remove favorites in IndexedDB — done, see Phase 1.5.
- ✅ Find plate by camera/photo (Plate Recognizer Snapshot API) — done, see
  "Plate image recognition" under Phase 3.
- ⏳ RIA "similar cars" proxy (free token) — Phase 2, blocked on getting a
  `developers.ria.com` API key; otherwise unchanged from that section's design.
- ⛔ Platesmania — **skipped**, see Phase 3: no free token, scraping ruled out.
- ✅ Registry statistics page, step A (table) and step B (map) — both done,
  see Phase 1.5.
- ✅ Manufacturer/brand breakdown + year filter on the stats page — done, see
  Phase 1.5.
- ✅ Vehicle-kind icon (animated, colored by registry color) + brand logo on
  the result card — done, see Phase 1.5.
- ⏳ **VinResult history section rename + show current plate** — small,
  unblocked fix identified 2026-09-23 (see Phase 1.5 "Open" note above):
  retitle its timeline from `vin.registryTitle` to `result.historyTitle` for
  consistency with `ResultCard`, and surface `registry.plate` /
  `registry.plateInferred` as a headline line (mirroring how `ResultCard`
  headlines its VIN link) since the data already comes back from
  `/api/vin/:vin` and is currently unused on that page.

### To discuss / research

- **Show key "test drive" facts for a looked-up car** — surface curated
  specs/review highlights (not just registry fields) for the car's
  make/model/year. Needs a data source: is there a free API, or does this
  require licensing/curating content ourselves?
- **Car images by year/trim/color ✅ DONE (2026-09-24)** — see Phase 1.5
  "Vehicle photos (Pixabay)" above. Implemented via
  [pixabay.com's image search API](https://pixabay.com/api/docs/) keyed on
  brand/model/year only, not trim/color — Pixabay's search doesn't support
  that granularity, so shown photos are illustrative for the make/model, not
  matched to the registered vehicle's actual color or trim.
- **Car brand logos ✅ DONE (2026-09-24)** — see Phase 1.5 "Vehicle-kind icon
  (animated, colored) + brand logo" above. Went with bundling from
  car-logos-dataset (MIT-licensed, not carlogos.org — that site states no
  reuse license at all), not a live logo service/CDN — a `brand → logo asset`
  lookup (`brandLogoUrl()` in `@carplates/shared`) matching bundled static
  files, same pattern as `plate_regions` for stats.
- **Vehicle body-shape / silhouette images ✅ DONE (2026-09-24)** — see Phase
  1.5 above. **Not** NHTSA vPIC in the end: those per-body-class PNGs
  (`vpic.nhtsa.dot.gov/decoder/images/{bodyClassId}/{n}.png`) turned out to be
  an undocumented, unofficial asset path (no stated mapping from image index
  to body class, no ToS, inconsistent styling between images) keyed to
  NHTSA's own body-class taxonomy — which the Ukrainian registry's `kind`
  values don't share, so using them wouldn't have avoided building a
  `kind → shape` mapping anyway. Used 5 user-supplied SVG silhouettes instead,
  recolored per-vehicle via CSS custom properties.
- **Fuel-type icons** — show an icon per fuel type on the result card.
  **RESEARCH first**: the registry's `fuel` column is free text with no fixed
  enum in this codebase (unlike `body`/`kind`/`color`, which already have
  `stats_by_*` rollups) — enumerate the actual distinct values in the real
  dataset (e.g. `SELECT DISTINCT fuel FROM registry.registrations`) before
  picking/drawing an icon set, since Ukrainian-source values won't map 1:1 to
  a generic fuel-type icon library.
- **Vehicle-kind icons ✅ DONE (2026-09-24)** — see Phase 1.5 "Vehicle-kind
  icon (animated, colored) + brand logo" above.
- **Auth with Google** — Phase 5 already specs Passport Google OAuth; open
  question is scope beyond syncing history/favorites to the cloud — what
  else should be account-gated (cross-device sync, data export, change
  alerts on a saved plate/VIN)?
- **Use more of the NHTSA vPIC decoder surface — researched, nothing left worth adding (2026-09-24)** —
  full endpoint catalog enumerated from `vpic.nhtsa.dot.gov/api/`: Decode
  (`DecodeVin`, `DecodeVinValues` flat, `DecodeVinExtended`,
  `DecodeVinValuesExtended`, `DecodeWMI`, `DecodeVINValuesBatch`), Manufacturer
  (`GetAllManufacturers`, `GetManufacturerDetails/{id}`,
  `GetWMIsForManufacturer/{id}`), Make (`GetAllMakes`,
  `GetMakeForManufacturer`, `GetMakesForManufacturerAndYear`,
  `GetMakesForVehicleType`), Model (`GetModelsForMake(Id)`,
  `GetModelsForMake(Id)Year`), reference (`GetVehicleTypesForMake(Id)`,
  `GetVehicleVariableList`, `GetVehicleVariableValuesList`), misc
  (`GetEquipmentPlantCodes`, `GetParts`, `GetCanadianVehicleSpecifications`).
  Checked the two candidates that looked promising against a real VIN:
  - `GetManufacturerDetails/{id}` — company-registry metadata (address,
    contact info, `DBAs`, `ManufacturerTypes`, `VehicleTypes` GVWR ranges,
    `PrimaryProduct`) about the *manufacturer as a company*, not the car. No
    end-user value on a result card, none of it overlaps or extends the
    per-VIN decode fields.
  - `DecodeVinValues` (flat single-object shape) — same ~95 fields
    `DecodeVin` already returns, just reshaped from variable/value pairs into
    one object. No new data (this is on top of the already-resolved
    `decodevin` vs `DecodeVinExtended` comparison from Phase 1.5).
  - Everything else in the catalog (Make/Model/vehicle-type/WMI/plant-code
    lookups) is reference data for *building* a decoder, not for enriching a
    single VIN's result — not applicable here.
  **Conclusion: not pursuing further vPIC surface.** `/api/vin/:vin` already
  forwards the richest endpoint (`DecodeVin`) and the UI already renders every
  non-empty field. Crash-safety/recall data from the separate
  `api.nhtsa.gov/SafetyRatings` and `/recalls` APIs was a different topic,
  researched separately for a different reason (US-market-only relevance, not
  decoder coverage) — ratings shipped, see Phase 1.5's "Crash-test safety
  ratings" entry; recalls are still parked, see "Phase 3+ — recalls" below.

### Parked — no free API token (same class as Platesmania)

- ⛔ RIA "similar cars" — see Phase 2, blocked on a `developers.ria.com` key.
- ⛔ Platesmania — see Phase 3, no free token, scraping ruled out.
- ⛔ **Vehicle history/images from other countries, by VIN** — e.g.
  `copart.com`, `bid.cars` auction listings for imported vehicles. No free
  API token surveyed yet for any provider; scraping these sites is the same
  ToS/legal no-go as Platesmania, not a fallback. Revisit if a free/affordable
  token turns up for one of these or a similar provider.
- ⛔ **Ukraine average fuel prices — researched, parked (2026-09-24)** —
  wanted price-per-fuel-type data (e.g. estimated fill-up cost on a result
  card). [serg-ill/ukraine-fuel-prices](https://github.com/serg-ill/ukraine-fuel-prices)
  turned out not to be a usable data source at all: it's a Home Assistant
  custom component (Python) that scrapes 12 gas-station-network sites plus
  Minfin hourly, with no hosted API and no dataset files — using it means
  reimplementing its scraping, not consuming an API. Went to the underlying
  source instead (`index.minfin.com.ua/ua/markets/fuel/`): its A-95/A-92/diesel/LPG
  averages are licensed from **Консалтингова група А-95** (`a95.ua`) per the
  page's own schema.org `creator` attribution — a commercial market-research
  firm whose product *is* this price data. Checked a95.ua directly: no public
  API, no free tier, no listed licensing terms, contact-them-only access.
  `robots.txt` doesn't block the page, but that's a weak signal against a
  paid third party's commercial dataset republished with attribution, not
  Minfin's own open data. **Decision: skip scraping** — same ToS/licensing
  risk class as Platesmania and the Copart/bid.cars entry above (no free
  API, scraping licensed commercial data as the only alternative). Revisit
  if A-95 Consulting Group offers a free/affordable API or data license
  (contact: a95@a95.ua), or if a genuinely open fuel-price source turns up
  (e.g. a state statistics service, or networks that publish their own
  prices under an open license).

## Phase 4 — VPS / production

### VPS sizing (starting point)

`registry` schema is 13.9 GB (24.7M rows in `registrations`) as of 2026-09,
growing by roughly the ~110 MB/year the backup policy below already assumes
for archived source ZIPs — the DB grows at a similar rate (one monthly ingest
of deltas, not a re-ingest of the full history). Containers to fit: Postgres,
`api`, `web` (served by `api`), Redis, Caddy, and a monthly `ingest-cron` job
that runs occasionally and holds an exclusive lock on `registrations` for
minutes.

| Resource | Spec       | Why                                                                                                                                                          |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU      | 4 vCPU     | Normal traffic is light indexed lookups; `ingest-cron` is I/O-bound not CPU-bound, but spare cores keep it from starving API traffic during its run           |
| RAM      | 8 GB       | Only `current_registration` (the hot-path matview) needs to stay resident, not the full 14GB — 8GB covers Postgres `shared_buffers` + OS page cache + Redis + Node without swapping during ingest's index rebuild |
| Disk     | 80 GB NVMe | 14GB DB + WAL + 2-3 `pg_dump -Fc` backups + archived source ZIPs (~1.2GB, +110MB/year) + Docker images/logs, with years of headroom                          |
| Network  | default    | Indexed point-lookups; bandwidth isn't the bottleneck                                                                                                        |

Roughly a Hetzner CPX32 / DigitalOcean 4vCPU-8GB class box. A 2 vCPU / 4GB /
40GB box would also run fine day-to-day and only feel tight during the
monthly ingest — not an architectural commitment, resize later based on
PostHog-observed load.

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
