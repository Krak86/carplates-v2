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
- **Open (not yet done): VinResult's history section is mislabeled.** Its
  "Registration history" timeline is titled `vin.registryTitle` ("State
  registry data") while `ResultCard`'s identical section is titled
  `result.historyTitle` ("Registration history") — same component, same data,
  different name. Also, `registry.plate` (the VIN's current known plate) is
  fetched by `/api/vin/:vin` but never shown anywhere on the VIN page, unlike
  the plate page which headlines its VIN. Fix agreed in principle, not yet
  applied — see TODO below.

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

### Phase 3+ — crash-test ratings (research task)

NHTSA Safety Ratings. **Research the current endpoint** (v1 pointed at
`one.nhtsa.gov/webapi/...`, now under `api.nhtsa.gov/SafetyRatings/`), how it
keys (year/make/model path walk vs VIN), rate limits, and whether it joins to the
registry brand/model or the NHTSA-decoded values. Same free provider as the VIN decoder.

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
- **Car images by year/trim/color** — show a representative photo, ideally
  matching the registered color. **RESEARCH**: is there a free/affordable
  stock-photo API keyed by make/model/year(/trim/color), or does this need
  on-the-fly generation (cost, consistency, licensing of generated images)?
  Candidate: [pixabay.com's image search API](https://pixabay.com/api/docs/)
  (free tier, needs its own API key in env — never commit one) — coverage for
  arbitrary make/model/year queries and rate limits are unverified; scope
  where a result would even go on the page before wiring it up.
- **Car brand logos** — **RESEARCH**: use an existing logo service/CDN
  (rate limits, licensing, coverage of Ukrainian-market brands) vs. bundle our
  own logo asset set (upkeep, storage, redistribution rights). Candidate
  sources: [carlogos.org](https://www.carlogos.org/car-brands/) (site, no API —
  scraping/ToS concern, same class of issue as Platesmania) or the
  [car-logos-dataset](https://github.com/filippofilip95/car-logos-dataset)
  GitHub repo (bundle-able SVGs, check its license before redistributing).
  If bundled, would need a `brand → logo asset` lookup, likely seeded into a
  small static table the way `plate_regions` was for stats.
- **Vehicle body-shape / silhouette images** — NHTSA vPIC serves per-body-class
  silhouette PNGs at `vpic.nhtsa.dot.gov/decoder/images/{bodyClassId}/{n}.png`
  (e.g. images 1-16 under body class 5). **RESEARCH**: map the registry's free-text
  `body`/`kind` strings to vPIC's body-class ids (no such mapping exists in this
  codebase today), confirm the image set is stable/complete enough to rely on
  and whether hot-linking vs. mirroring locally is acceptable, before building a
  `body → image` lookup table (same seed-a-static-table pattern as above).
- **Fuel-type icons** — show an icon per fuel type on the result card.
  **RESEARCH first**: the registry's `fuel` column is free text with no fixed
  enum in this codebase (unlike `body`/`kind`/`color`, which already have
  `stats_by_*` rollups) — enumerate the actual distinct values in the real
  dataset (e.g. `SELECT DISTINCT fuel FROM registry.registrations`) before
  picking/drawing an icon set, since Ukrainian-source values won't map 1:1 to
  a generic fuel-type icon library.
- **Vehicle-kind icons** — same pattern as fuel-type icons above, for the
  `kind` field (legkovyi/vantazhnyi/etc.) instead of `fuel`. `stats_by_kind`
  already has the real distinct values and counts (`GET /api/stats`) — reuse
  that instead of a fresh `DISTINCT` query, then pick/draw icons for the ones
  that actually occur. The "?" breakdown popover itself is already live on
  `kind` (see Phase 1.5 above) — this item is just the per-value icon set.
- **Auth with Google** — Phase 5 already specs Passport Google OAuth; open
  question is scope beyond syncing history/favorites to the cloud — what
  else should be account-gated (cross-device sync, data export, change
  alerts on a saved plate/VIN)?
- **Use more of the NHTSA vPIC decoder surface** — beyond the plain VIN
  decode already wired up (`GET /api/vin/:vin`), e.g. Manufacturer detail
  lookups (`vpic.nhtsa.dot.gov/decoder/Manufacturer/Details/{id}`) and related
  endpoints under `vpic.nhtsa.dot.gov/decoder/VinDecoder` (which also accepts
  a `ModelYear` param the plain decode endpoints don't). Same free provider,
  just more of its surface — scope which fields are worth showing. (The
  `decodevin` vs `DecodeVinExtended` question specifically is resolved, see
  Phase 1.5 above — this item is about the *other* decoder endpoints.)
- **Ukraine average fuel prices** — integrate price-per-fuel-type data,
  e.g. from [serg-ill/ukraine-fuel-prices](https://github.com/serg-ill/ukraine-fuel-prices)
  (scrape-derived dataset, not a live API — check its update cadence and
  license before depending on it). **RESEARCH**: where this would surface in
  the UI (per-result estimated fill-up cost? a standalone page?) before
  scoping the integration.

### Parked — no free API token (same class as Platesmania)

- ⛔ RIA "similar cars" — see Phase 2, blocked on a `developers.ria.com` key.
- ⛔ Platesmania — see Phase 3, no free token, scraping ruled out.
- ⛔ **Vehicle history/images from other countries, by VIN** — e.g.
  `copart.com`, `bid.cars` auction listings for imported vehicles. No free
  API token surveyed yet for any provider; scraping these sites is the same
  ToS/legal no-go as Platesmania, not a fallback. Revisit if a free/affordable
  token turns up for one of these or a similar provider.

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
