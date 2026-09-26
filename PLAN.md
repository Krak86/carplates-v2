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

| Package                   | `latest` (2026-09)                                                | We use                                         | Why held back                                                                                                                                                                                                                                                                                                | Revisit when                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **typescript**            | `7.0.2`                                                           | `~5.9.3`                                       | `typescript-eslint@8.70` peer-requires `typescript >=4.8.4 <6.1.0`. TS 7 (and even 6.1) breaks **all** type-aware linting (`no-floating-promises`, the parser itself).                                                                                                                                       | `typescript-eslint` declares TS 7 support (watch its peerDeps / release notes).                                                                                         |
| **@nestjs/core** & co.    | `12.0.1`                                                          | `^11.2.3`                                      | `nestjs-zod@5.5.0` (latest, nothing newer) peer-requires `@nestjs/common ^10 \|\| ^11` and `@nestjs/swagger ^7 \|\| ^8 \|\| ^11` — no Nest 12. `nestjs-zod` is core to the design (one Zod schema → validation pipe **and** OpenAPI).                                                                        | `nestjs-zod` ships a release listing `@nestjs/* ^12` in peerDeps. Then bump all `@nestjs/*` together.                                                                   |
| **drizzle-orm**           | `0.45.2` is the `latest` **tag**; `1.0.0-rc.4` is on the `rc` tag | `0.45.2` (exact)                               | We're on the actual latest **stable**. Not the RC: the maintainers haven't promoted v1 to `latest` (their own signal); `drizzle-kit` + `drizzle-zod` still target 0.4x; the v1 stream ran 23 betas + ≥5 RCs and still iterates. v1's headline features (RQB v2, RLS, generated columns) are irrelevant here. | npm `latest` points at `1.x` **and** `drizzle-kit` + `drizzle-zod` have stable v1 releases. Then follow `/docs/upgrade-v1`; our Drizzle surface is tiny.                |
| **vitest**                | `5.0.0`                                                           | `^4.1.11`                                      | 5.0.0 shipped as a same-window `.0`. 4.1.11 is mature and already supports Vite 8 (`vite: ^6 \|\| ^7 \|\| ^8` peer) and Node 24. Same "stable over shiny" call as Node 24-not-26.                                                                                                                            | 5.x has a few patch releases and the plugin ecosystem (coverage, ui) has caught up. Low urgency.                                                                        |
| **node**                  | `26.8.2` (Current)                                                | `24.x` (`24.21.0` is the newest LTS "Krypton") | 26 only becomes LTS in Oct 2026; "entering LTS" ≠ ecosystem-ready — native deps and CI images take months. Conservative for an unattended VPS. Upgrading is a one-line `.nvmrc` / Dockerfile change.                                                                                                         | 26 has been LTS for a few months and `node:26-alpine` is everywhere.                                                                                                    |
| **@tanstack/react-table** | `9.2.4`                                                           | `^8.21.3`                                      | v9 (added 2026-09, Phase 1.5 stats table) is a ground-up rewrite — feature-based internals, no top-level `useReactTable`/`getCoreRowModel`/`getSortedRowModel` (moved under `./legacy`). v8's headless sort/filter API is the one this codebase's usage is built against and is well-established.            | v9's docs/ecosystem (examples, Stack Overflow, this model's training data) catch up to the new API — re-verify against its actual docs before bumping, not from memory. |

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
_live_ CKAN downloads during a regular `ingest.ts` run (see the backup policy
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
...)` _within_ one fuel value, so summing them across the merged values is
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

  **Standalone refresh, for a new matview against an already-seeded DB ✅
  DONE (2026-09-25).** Every `stats_by_*` matview is created `WITH NO DATA`
  (see `refreshStats()` in `packages/db/src/client.ts`), so a fresh
  `pnpm db:migrate` leaves a newly-added one empty until something refreshes
  it — normally `ingest`/`ingest:full`/`db:seed`, which all call
  `refreshCurrentRegistration()` + `refreshStats()` as their last step. That's
  fine for a from-scratch setup, but adding _another_ stats dimension to a DB
  that's already holding a real ~hours-long ingest (like `stats_by_brand`
  the day before this one) had no good option — re-running `ingest:full`
  just to populate one new matview would mean hours for zero new rows.
  `scripts/src/refresh-stats.ts` (`pnpm db:refresh-stats`) closes that gap: a
  thin CLI that calls exactly those same two functions directly against
  whatever's already in `registrations`, touching no source data — seconds,
  not hours. The one-time migration checklist for a new stats matview is now:
  write the migration + add its `REFRESH MATERIALIZED VIEW` line to
  `refreshStats()` → `pnpm db:migrate` → `pnpm db:refresh-stats`.

- **Plate-history now shows plate reassignment, not just the current vehicle's
  own VIN history ✅ DONE (2026-09-24)** — user-requested, found while
  looking up plate `ВЕ8388СХ`/`BE8388CX`: the state registry reassigns a
  plate to a different vehicle after the previous one leaves it (here, a
  2014 Nissan Rogue → a 2026 Mazda CX-5), and `ResultCard.tsx` was hiding
  that. `plate.service.ts`'s `history()` already matched raw `plate = X`
  regardless of `vin` (`identityFilter`, unchanged), so `/plate/:plate/history`
  already returned all reassignment rows — the gap was purely client-side:
  `ResultCard` picked _either_ VIN-scoped history _or_ plate-scoped history
  once a VIN was known, never both, so the VIN-only branch (correctly, for a
  _different_ reason — following one vehicle across the plates it wore)
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
  _not_ a naive average of Overall+Front+Side+Rollover+SidePole, since
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

- **Euro NCAP crash-test ratings, alongside NHTSA ✅ DONE (2026-09-25)** —
  requested by the user directly after the NHTSA feature shipped, precisely
  because NHTSA only covers US-spec cars while Euro NCAP tests the EU-spec
  cars that actually dominate Ukraine's fleet (Skoda, Renault, VW, Kia...).

  **No public API — scraped and persisted, not proxied live.** Unlike NHTSA/
  vPIC/Pixabay (all live-fetch-and-cache), Euro NCAP has nothing to call
  per-request: `robots.txt` blocks `/api/` and there is no documented JSON
  endpoint. `scripts/src/euroncap.ts` discovers every
  `/assessments/{make}/{model}/{id}/` URL from `sitemap.xml` (~500 pages, all
  server-rendered Next.js — confirmed the same component markup holds back to
  at least a 2018-tested car, so one parser covers the whole history) and
  parses each with `scripts/src/euroncap-parse.ts` (cheerio, new dependency)
  into `registry.euroncap_ratings` (`packages/db/migrations/0005_*.sql`) via
  `INSERT ... ON CONFLICT DO UPDATE`. Every fetch is cached to
  `scripts/.data/euroncap/` and throttled to 1 req/1.5s with an identifying
  User-Agent; a re-run without `--refresh` makes no network requests at all.
  **Re-scrape cadence: monthly, not "every few months"** — checked whether
  Euro NCAP publishes any advance schedule of upcoming releases (a "calendar"
  to poll instead of guessing a cadence): they don't. Results ship in batches
  through the year announced only via their news feed after the fact, with no
  fixed interval and no forward-looking list — recent batches have landed only
  weeks apart. Since a re-run's network cost is already near-zero (only
  genuinely new assessments hit the network; everything cached is skipped),
  there's no reason to wait longer than monthly. Still no cron for this yet
  (Phase 1 has none at all) — a manual `pnpm ingest:euroncap` for now.

  **CSV export/import for zero-scrape project setup ✅ DONE (2026-09-25)** —
  `scripts/.data/euroncap/` (the HTML cache) is gitignored, so a fresh clone
  or a new VPS had no way to get real Euro NCAP data without re-running the
  ~20-minute scrape from scratch. `euroncap.ts` now also takes `--export-csv
<path>` (dump `registry.euroncap_ratings` to CSV, `images`/`youtube_ids`
  JSON-encoded into their cells) and `--from-csv <path>` (load one back via
  the same `upsert()` the scraper uses — no network, no cheerio parsing),
  mirroring the `--file` local-CSV escape hatch `ingest.ts` already has for
  CKAN data. A `.gz` path is transparently gzipped/gunzipped (`node:zlib`, no
  new dependency); a plain `.csv` path is written/read as-is. The actual
  current scrape is committed at `scripts/seed-data/euroncap-ratings.csv.gz`
  (499 rows, ~117 KB gzipped, ~870 KB uncompressed) and loads via
  `pnpm ingest:euroncap:csv` in seconds. After any real re-scrape, re-run
  `pnpm export:euroncap:csv` and commit the refreshed file so the next
  zero-project setup stays current — nothing enforces that yet (no cron, no
  CI, consistent with everything else in Phase 1), it's a manual habit for
  now.

  **Media: numbers scraped, media referenced, nothing rehosted** — a
  deliberate line drawn with the user before building. Euro NCAP's crash
  photos/videos are their own produced/copyrighted media, not raw government
  data like NHTSA's, so: carousel images stay as `data-cdn.euroncap.com` URLs
  and are hotlinked (`referrerPolicy="no-referrer"`), never downloaded;
  crash videos are YouTube embeds — the id is scraped and played via
  `youtube-nocookie.com/embed/`, YouTube's own sanctioned embedding, not
  proxied/transcoded like NHTSA's `.wmv` clips. The per-test PDF link is not
  in the static HTML (JS-driven download) so `reportPdfUrl` is usually null;
  every rating always links out to the official `euroncap.com` report page.
  Every image URL and YouTube id is regex-validated both when scraped
  (`euroncap-parse.ts`) and in the shared Zod schema
  (`euroNcapRatingSchema` in `packages/shared/src/schemas.ts`), so a mangled
  scrape can't inject an arbitrary hotlinked URL.

  **Matching key shared with the scraper — and a real "+" vs "-" bug found
  after the first full scrape.** `packages/shared/src/vehicleKey.ts` adds
  `makeKey`/`modelKey`. First cut: `makeKey` reused `brandLogoUrl`'s
  `BRAND_SLUG_BY_NAME` table (now exported as `brandSlug`) and kept its
  hyphenated form (`mercedes-benz`), on the assumption Euro NCAP's own URL
  slugs used the same separator. They don't: Land Rover, Alfa Romeo, Lynk &
  Co and Changan Deepal (16 ratings across the first full 499-assessment
  scrape) use `+` instead (`land+rover`, `alfa+romeo`, `lynk+-+co`), so
  `brandSlug`'s `land-rover` never matched the scraper's raw `land+rover`.
  Fix: `makeKey` now strips to `[a-z0-9]` only, same as `modelKey`, so both
  sides collapse to the same key (`landrover`) regardless of which
  separator Euro NCAP happened to use for that brand. Caught by comparing
  `SELECT DISTINCT make, make_key FROM registry.euroncap_ratings` against
  what `makeKey()` computes for the equivalent registry brand string —
  worth re-running that check after any full re-scrape picks up new brands.
  `modelKey` strips a model string to `[a-z0-9]` only, and the scraper calls
  the _same_ function on the URL's model slug when writing a row, so the
  write key and `EuroNcapService`'s query key can never drift apart by
  construction. `EuroNcapService.ratings()` (`apps/api/src/safety/`) does a
  prefix match (`registry model key LIKE stored_key || '%'`) since the
  registry's model is usually more specific than Euro NCAP's own ("CLA 250"
  vs "cla"), keeping only the longest-matching prefix so a short unrelated
  key never beats the real one. `selectApplicableAssessmentId()` (unit
  tested standalone) then picks the newest non-Safety-Pack generation
  published no later than one year after the car's model year.

  **Web.** `SafetyRatings.tsx` is now a shell with two tabs — Euro NCAP
  (default, the EU-spec-relevant one) and NHTSA (moved into
  `NhtsaRatings.tsx` unchanged) — each fetching only while the section is
  open _and_ that tab is active. `EuroNcapRatings.tsx` shows the applicable
  generation's stars/percentages/photo-strip/video button up top, other
  tested generations (retests, Safety Pack variants, older gens) as compact
  rows below, and flags an expired (6-year-old) rating or a missing
  generation match. `YouTubeModal.tsx` mirrors `CrashVideoModal.tsx`'s shell
  but embeds instead of transcoding. The "which cars does this cover"
  explainer moved from a per-tab popover (NHTSA only, initially) to one
  combined popover at the `SafetyRatings` section-header level covering
  both sources at once — visible before the viewer even expands the
  section or picks a tab, and there's now exactly one place this caveat is
  written down instead of two copies that could drift apart. Euro NCAP's
  half is a short paragraph (broad EU-spec coverage by brand, but only
  specific tested trims/generations); NHTSA keeps its
  current/discontinued/uncovered brand lists, since "which US brands even
  exist" is a real, brand-level caveat there in a way it isn't for Euro
  NCAP.

  **Also, while in there:** the translucent chip background already used
  for field label/value pairs (`bg-[var(--color-surface)]/20`, added with
  the vehicle-color glow work) got extended to everything else sitting bare
  on that ambient glow — the search subtitle, search-by-photo/camera
  buttons, the region text next to a plate, and every toggle/nav link
  (history, ratings, photos, the three bottom links) — so they stay
  readable regardless of the glow's color underneath.

- **Crash-test ratings beyond NHTSA/Euro NCAP — researched, not started
  (2026-09-25).** Both existing sources skew toward specific fleets: NHTSA
  is US-spec only, Euro NCAP is EU-spec. Ukraine's actual used-import mix
  leans heavily JDM (Japan) and Korea-spec Hyundai/Kia, plus a fast-growing
  Chinese-EV segment (BYD, Chery, Omoda, Xpeng... already showing up as
  brands in the Euro NCAP scrape). Researched the other major bodies to
  see which are worth a third/fourth scraper, ranked by scrape-friendliness
  and actual relevance to that import mix — none started yet, in priority
  order:

  1. **JNCAP (Japan, run by NASVA) — scraper built and verified against real
     markup (2026-09-25).** The best-case scraper of the bunch, arguably
     easier than Euro NCAP's: `nasva.go.jp/mamoru/en/` runs a full
     **English**-language mirror of the results catalog, no JS rendering,
     URL-filterable per-vehicle detail pages at `assessment_car/detail/{id}`.
     NASVA also publishes a downloadable Excel of all historical results as a
     fallback/cross-check against the scrape. Same shape as the Euro NCAP
     work: discover URLs (paginate the list endpoint instead of a sitemap),
     parse each detail page with cheerio into `registry.jncap_ratings`
     (migration `0006_jncap_ratings.sql`), `makeKey`/`modelKey` reused
     unchanged for matching, a `JncapService`
     (`apps/api/src/safety/jncap.service.ts`) + third `SafetyRatings` tab
     (`JncapRatings.tsx`) — full stack wired end to end (schema, API,
     `GET /api/safety/jncap`, web tab, i18n in all three locales,
     `pnpm ingest:jncap`/`ingest:jncap:csv`/`export:jncap:csv`).

     **The list-discovery URL guessed from AI-summarized research was wrong
     — caught by an actual dry-run.** `assessment_car/list/{page}?...&testfy=
{year}` (a bare year) 404s into NASVA's own "site renewed" notice for
     every single year; real browser automation (chrome-devtools MCP, since
     this sandbox has no raw-HTTP network access) against the live site's own
     search form showed `testfy` is a coded value, not a year — `2025S` for
     FY2020+'s combined "Vehicle safety performance" round, `2019A`/`2019P`
     (Preventive/Collision run as two separate rounds) for FY2014-2019, `P`-
     only before Preventive testing existed (FY2003-2013, with real gaps —
     no 2004-2006, 2008). `jncap.ts`'s `KNOWN_TESTFY_CODES` hardcodes this
     confirmed list. This is also the answer to "maybe geo-blocked/needs a
     VPN?" raised when the first dry-run found 0 assessments: no — the
     response was NASVA's own generic moved-page notice, not a block, and a
     real browser from the same network reached the real content fine once
     the query value was fixed.

     **The parser (`scripts/src/jncap-parse.ts`) was rewritten against three
     real captured detail pages spanning JNCAP's three distinct eras** —
     `fixtures/jncap-mini-countryman-269.html` (FY2025, current combined
     scheme), `fixtures/jncap-cx5-81.html` (FY2017/2018, transitional era —
     see below), `fixtures/jncap-ad-44.html` (FY2007, legacy) — replacing the
     earlier label-guessing draft entirely. Confirmed stable anchors:
     `td.modelname`/`td.brandname`/`th[scope="row"]` for the vehicle-info
     table (identical across all three eras), `dl.dl_car` > `dt`/`dd` for the
     per-test breakdown (also identical across all three), and a
     `.score_rank` block (first two `strong.font_b` = rank + percentage) for
     Preventive/Collision/Emergency-call sections in the modern scheme —
     deliberately scoped to `.score_rank` specifically rather than "any
     `strong.font_b` in the section", since an older-era section has no
     rank/percentage there at all and would otherwise misread an unrelated
     per-test level number as a percentage. Real, non-obvious quirks caught
     along the way: (1) legacy pre-2014 assessments used a **6-star** scale,
     not 5 (a real FY2007 Nissan AD scored a bare "6") — `jncapRatingSchema.
stars`'s zod bound widened to 0-6 accordingly, `formatStars` (apps/web)
     already falls back to the raw number for anything it can't render as 5
     glyphs; (2) JNCAP's own `model` text bakes the brand name in for some
     brands ("MINI COUNTRYMAN", not "COUNTRYMAN") but not others ("AD", not
     "Nissan AD") — `parseAssessment` strips a leading brand-name repeat
     before computing `modelKey` only, so it still prefix-matches a registry
     car stored as brand "MINI" / model "COUNTRYMAN"; the stored/displayed
     `model` value keeps JNCAP's own full text unchanged; (3) a genuine
     **third page shape** exists for FY2014-2019 (`categoryFallback` in
     jncap-parse.ts) — Preventive and Collision ran as separate, non-
     combinable programs with no unified "overall" percentage, expressed as
     a points fraction ("187.3 / 208 points") rather than a clean "%", with
     Preventive graded on an "ASV+++"-style scale rather than a letter, and
     Collision's own "rank" in this era is itself just a star count (no
     letter/text grade at all — correctly left null rather than invented).

     **A real full scrape has been run — and confirmed exhaustive, not just
     "what the search happened to find."** 88 real assessments are live in
     `registry.jncap_ratings` (84 from FY2013 onward — the user's actual
     ask, since Ukraine's registry only has plates since 2013 — plus 4 older
     ones from 2003/2007/2009 that came along for free), parsed with zero
     failures. Exported to `seed-data/jncap-ratings.csv.gz`
     (`pnpm export:jncap:csv`) for zero-scrape project setup, same as Euro
     NCAP's. Mechanically: the browser (chrome-devtools MCP) fetched pages —
     this sandbox has no raw-network Bash access — caching them exactly
     where `jncap.ts` expects, then the real, tested `pnpm ingest:jncap` did
     the parsing/DB-writing (added a new `--ids-file <path>` flag: skip
     discovery, parse exactly the ids in a JSON array — useful generally,
     not just for this).

     **Investigated why this is so much smaller than Euro NCAP's 499, since
     that gap looked suspicious rather than merely "Japan tests fewer
     cars."** Confirmed via NASVA's own official Excel archive (the
     `car_download.html` cross-check PLAN.md already flagged) that JNCAP's
     live-searchable site is genuinely incomplete as a historical record: the
     Excel's "2003" sheet alone lists ~20 real vehicles (Mira, Alto Lapin,
     Wagon R, Colt, RX-8, Legacy, an original Odyssey, AD Van...), but the
     live search for that exact year surfaced only 1. The site's own model
     dropdown added only 4 more ids beyond what the search found (270-273,
     the newest additions) — not the missing history. **Conclusively ruled
     out "just probe harder"**: brute-force fetched every `/assessment_car/
detail/{id}` from 1-290 not already known — zero additional real pages
     found across all of it. So the ~88-92 live ids are the _entire_
     scrapeable universe; older/retired models have no web page left at all.
     Even if they did, it wouldn't matter for ratings: the Excel only has
     identifying metadata (name/grade/manufacturer/release date/type-approval
     code) — no star rating, no percentage, no test-level breakdown — so it
     can't supply real crash-safety scores regardless.

     **One more real quirk found and fixed along the way**: a 2-seat
     commercial vehicle (no rear seat to assess — e.g. a kei truck) is
     explicitly exempt from JNCAP's combined rating. Its "Overall evaluation"
     cell is a bare year ("2025"), not "★★★★☆ (FY 2025)" — `YEAR_RE` needed a
     `BARE_YEAR_RE` fallback (scoped to "the whole cell is just a 4-digit
     year") so the test year still gets captured for `selectApplicableAssessmentId`'s
     matching even with no stars/percentage at all — both correctly null,
     not a gap. Fixture: `fixtures/jncap-carry-270.html`.

  2. **C-NCAP (China, run by CATARC) — shipped 2026-09-25.** The plan's own
     guess ("static server-rendered HTML, Euro-NCAP-shaped") was wrong, caught
     by an actual dry-run the same way JNCAP's `testfy` URL guess was: live
     research found `c-ncap.org.cn` is a clean **JSON API**,
     `POST /api/crashSearch` (form-encoded `pageNumber`/`pageSize`/`type=1`),
     one call returns all ~600+ records with a full score breakdown already
     inline — no detail-page fetch, no cheerio, mechanically simpler than
     Euro NCAP or JNCAP. Full stack wired end to end: schema
     (`registry.cncap_ratings`, migration `0007_cncap_ratings.sql`), a
     `CncapService` (`apps/api/src/safety/cncap.service.ts`) reusing the same
     `prefixQuery`/`selectApplicableAssessmentId` shape as Euro NCAP/JNCAP,
     `GET /api/safety/cncap`, a fourth `CncapRatings.tsx` tab, i18n in all
     three locales, `pnpm ingest:cncap`/`ingest:cncap:csv`/`export:cncap:csv`.

     **Two real protocol eras, confirmed against the full dump, not
     guessed**: 2006-2018 reports a single raw-points score (`"56.300"`, no
     fixed maximum, not comparable across years) with one sub-score (乘员保护,
     occupant protection); 2018-onward reports a clean percentage
     (`"89.7%"`) across three sub-scores (occupant, 行人保护\VRU保护
     pedestrian/VRU, 主动安全 active safety). `score_unit` (`'pct' | 'points'`)
     records which shape a row is; the UI always shows the unit and never
     converts one to the other. **C-NCAP has no star rating, images, or video at
     all** — confirmed both from the live table UI (no star icons anywhere)
     and from the API itself (`carImage`/`brandImage` are `null` on every one
     of the 601 records, no video/PDF field exists at all; the only image
     URLs present are generic per-category icons shared across every car, not
     real crash photos) — unlike Euro NCAP/JNCAP, which both have a photo
     carousel and video. `CncapRatings.tsx` has no media section at all as a
     result — there's genuinely nothing to show, not an oversight.

     **Everything is Chinese-only, and unlike brand names, model names
     couldn't be machine-translated reliably.** `carName` combines brand+model
     with no separator and no consistent rule (a joint-venture prefix, a
     sometimes-dropped brand — `鹏G3` means Xiaopeng G3). Brand names are a
     small bounded set (~124, from `/api/brandList`) but 349 of 601 model
     names are pure Chinese with zero Latin fallback (福特福克斯 = "Ford
     Focus", 大众帕萨特 = "VW Passat") — not a lookup-table problem, a real
     translation problem. Solved with a curated, committed
     `carId -> {make, model}` table (`scripts/src/cncap-names.ts`, 601
     entries), spelled the way this app's own registry spells each car,
     verified with read-only queries against `registry.current_registration`
     during authoring (confirmed real conventions along the way: GAC/FAW
     store the sub-brand in the model field — `GAC`/`TRUMPCHI GS8`, not a
     `TRUMPCHI` brand row; Great Wall/Haval/Ora are three separate registry
     brands even though two are GWM sub-brands; Voyah's "梦想家" is spelled
     `DREEMER` in the registry, a genuine baked-in misspelling matched
     as-is). A `carId` with no entry is skipped with a warning at ingest
     time, not guessed — new C-NCAP results (~20-30/year) need a table entry
     added before they show up in the app.

     A real full ingest has been run: 601/601 records upserted, 0
     untranslated, confirmed matching 723 distinct real registry brand/model
     pairs (BYD Song Plus → BYD/SONG prefix match, Zeekr 7X, Haval H6 across
     both eras, ...) and verified end-to-end in the browser (a real Zeekr 7X
     plate renders the 2025 percentage-era card; a real Haval H6 plate
     renders the 2018/2012 points-era cards with "pts", not "%", and the
     applicable/other-generations split working correctly). Exported to
     `seed-data/cncap-ratings.csv.gz` for zero-fetch project setup, same as
     the other two sources.
  3. **KNCAP (Korea, MOLIT/KoROAD) — shipped 2026-09-26, bigger and easier
     than the earlier guess suggested.** `car.go.kr/sd/kncap/list.do` turned
     out **not** to be the data source at all — it's a static informational
     blurb that links out to a wholly separate site, `kncap.org`, via a
     "KNCAP로 이동하기" link. Confirmed via a real browser session
     (chrome-devtools MCP, initially assumed necessary for the same
     network-access workaround JNCAP/C-NCAP needed — turned out unnecessary
     for the actual ingest, see below): `kncap.org` is a clean JSON API,
     `POST /ncs/KncapResult/selectInitList.json`, one call returning every
     currently-listed assessment with the full score breakdown already
     inline (crash/pedestrian/accident-prevention percentages **and** stars,
     plus an overall 1-5 tier and, for some cars, a 0-100 overall score) —
     mechanically simpler than Euro NCAP/JNCAP, closer to C-NCAP's one-call
     design, and richer per-row than either. Full stack wired end to end:
     schema (`registry.kncap_ratings`, migration `0008_kncap_ratings.sql`), a
     `KncapService` (`apps/api/src/safety/kncap.service.ts`) reusing the same
     `prefixQuery`/`selectApplicableAssessmentId` shape as Euro NCAP/JNCAP/
     C-NCAP, `GET /api/safety/kncap`, a fifth `KncapRatings.tsx` tab, i18n in
     all three locales, `pnpm ingest:kncap`/`ingest:kncap:csv`/`export:kncap:csv`.

     **Scoped to the "current results" catalog only (2021-2026, 52 real
     assessments after excluding one junk/test row) — a real historical
     (pre-2021) corpus exists but recovering it is a separate, unbuilt
     follow-up.** The visible list's own "과거 데이터 포함" (include old
     data) checkbox and every `CHKOLD` value tried (`Y`/`ALL`/`1`/`true`)
     make no difference to what `selectInitList.json` returns — 2021 is the
     hard floor for that endpoint. But it's a real ceiling on the endpoint,
     not on the data: individual detail pages
     (`GET /ncs/KncapResultDetail/initView.jsp?DETAIL_IDX=&DETAIL_YEAR=`) for
     id/year combinations **not** in that 53-row list still return real,
     fully populated records — confirmed live for a 2020 BMW 320d (idx 100),
     a 2020 Kia Sorento (idx 101), a 2018 Hyundai Palisade (idx 97), a
     2017/2018 VW Polo (idx 41), and others back to at least idx 9 (idx 1-3
     confirmed empty, so 4-9 is roughly the real floor). The true year is
     baked into the page itself (a `var data = {...}` JSON blob and a
     `<p class="title">YYYY COMPANY MODEL</p>` line, both independent of
     whatever `DETAIL_YEAR` was passed to unlock the record), so a future
     scraper wouldn't need to guess it — but `DETAIL_YEAR` itself doesn't
     resolve consistently to a single real year per idx (a legacy-era record
     matched a narrow band like 2013/2017/2018 only; a mid-era one matched
     every year 2017 through 2026), so recovering this needs a real
     idx×year sweep with several candidate anchor years per idx, not a clean
     single-dimension enumeration like JNCAP's. Sample density (idx 4-130,
     partial sweep) suggests the true historical corpus could run close to
     the observed max idx (492) — Euro NCAP/JNCAP territory, not the ~50 the
     "current results" list alone suggests. Not started.
     - **License is explicit and stricter than the other three sources**:
       공공누리 제3유형 (KOGL Type 3 — attribution required, **no derivative
       works/modification**), stated directly on the results page — cited in
       `kncap.ts`'s own file comment; nothing here alters published figures.
     - **Model/brand names stay Korean even in English-locale mode** —
       toggling `top_changeLocale('US')` switches the intro page to an
       English variant (`initMainUS.jsp`) but the results list/detail data
       (`COMPANY_NAME`, `BRAND_NAME`, `CAR_TITLE`) is unaffected, still
       Korean. `make`/`model` come from a curated `idx -> {make, model}`
       table (`scripts/src/kncap-names.ts`, 52 entries for the shipped
       2021-2026 corpus), verified against the real registry the same way
       `cncap-names.ts` was — but unlike C-NCAP's fully-Chinese data, many
       KNCAP model names are already Latin/alphanumeric (`EV6`, `K8`, `iX2`,
       `GLB250`) since Korean marketing names for foreign-brand cars are
       often just the English name spelled out; only Korean-brand and
       Korean-phonetic model names (`아이오닉5` → "Ioniq 5", `투싼` →
       "Tucson") needed real translation — a lighter burden than C-NCAP's
       601-entry table, though a full historical recovery would scale this
       table back up toward that size.
     - **A trim/powertrain qualifier in KNCAP's own name is deliberately
       dropped to the base nameplate** (`캐스퍼 일렉트릭` "Casper Electric" →
       `Casper`, `XC40 리차지` "XC40 Recharge" → `XC40`) — `KncapService`'s
       prefix match needs the *stored* key to be the shorter, more generic
       one, so keeping the qualifier would silently stop matching a registry
       row that only has the bare nameplate. The one exception splits the
       other way (`폴스타2` → model `"2"`, not `"Polestar 2"`): Polestar's own
       naming omits repeating the brand.
     - **One junk/test row exists in production** (`IDX 492`,
       `COMPANY_NAME: "테스트"`) — filtered out by having no entry in
       `kncap-names.ts`, not a special-cased check, same mechanism
       C-NCAP uses for an untranslated `carId`.
     - **The sandbox's assumed "no raw-network Bash access" constraint
       (true for Euro NCAP/JNCAP/C-NCAP) didn't hold for this one** — a
       plain `pnpm ingest:kncap` (real `fetch`, no browser) reached
       `kncap.org` directly and completed the real ingest, 52 upserted, 1
       untranslated (the known junk row) — no cached-then-copied-in HTML
       workaround was needed here. Verified live in the browser for a real
       plate (`ВС0594YВ`, a real 2022 Hyundai Ioniq 5 — 2021 KNCAP rating
       applicable, ★★★★★/★★★★☆/★★★★★ crash/pedestrian/accident-prevention,
       Class 1/5, working "Full KNCAP report" link out to the source detail
       page) and a multi-generation case (`СВ1464YА`, a Tesla Model 3 with
       both a 2021 and a 2025 KNCAP rating — applicable/other-generations
       split correct), in both English and Ukrainian, at 1280px, 375px, and
       320px widths.
     - **Five-tab bar, addressed with a scroll, not a redesign** — the tab
       list gained `overflow-x-auto` and each tab switched from `flex-1` to
       `shrink-0` so a narrow viewport can scroll the tab strip instead of
       squeezing five labels unreadably thin; at every width actually tested
       (down to 320px) all five still fit on one row with no scrolling
       needed, so the earlier note about a sixth source (KNCAP) being where
       a dropdown/select rethink "should actually happen" turned out
       unnecessary here — revisit only if a sixth source ever ships.
  4. **IIHS (US, insurance-industry-funded, distinct from NHTSA) — low
     priority for this fleet.** Methodologically genuinely additive, not
     redundant with NHTSA (Good/Acceptable/Marginal/Poor across small-
     overlap frontal, side, headlights, crash-prevention tests, plus "Top
     Safety Pick" awards — a car can rate well on one scale and not the
     other), but `iihs.org/ratings` is category/search-driven rather than
     a clean paginated list like JNCAP's, and US-spec vehicles are already
     a minor slice of Ukraine's import mix even before adding a _second_
     US source. Revisit only after JNCAP/C-NCAP ship.
  5. **ANCAP (Australia/NZ) — skip, confirmed redundant.** Signed an MOU
     with Euro NCAP in 1999 and aligned protocols by 2018; for any vehicle
     sold in both markets, ANCAP now directly reuses Euro NCAP's own
     crash-test data and star rating rather than re-testing. The only
     unique data is AU/NZ-market vehicles never sold in Europe — a narrow
     slice that partially overlaps JDM imports, but not enough to justify
     a fourth-ish scraper on its own. Not worth building unless a specific
     gap vehicle turns up later.

  **Design note for whichever ships next:** the tab bar in `SafetyRatings.tsx`
  was extended to four tabs for C-NCAP (`px-2`/`whitespace-nowrap` keeps all
  four on one row down to phone width), then to five for KNCAP by adding
  `overflow-x-auto` to the tab list and switching each tab from `flex-1` to
  `shrink-0` — verified down to 320px with all five still fitting on one row,
  no scrolling actually triggered. A dropdown/select rethink, floated in
  earlier drafts of this plan, still hasn't been needed — revisit only if a
  sixth source's labels actually overflow in practice.

  **Follow-up (2026-09-26): persistent per-source coverage captions, and a
  smooth tab-switch transition.** Prompted by a real "why is there no rating"
  question against a genuinely Korean-brand-but-Euro-market car (a Kia
  Cee'd) — the site's existing "no rating found" messages only explained
  *market* scope (EU-spec, US-market, JDM-domestic, ...), not the *year*
  floor each source's real scraped data actually starts at, and that
  explanation disappeared entirely once at least one rating existed for the
  make/model (even a wrong-generation one, shown under "other tested
  generations"). Every one of the five tabs (`EuroNcapRatings.tsx`,
  `NhtsaRatings.tsx`, `JncapRatings.tsx`, `CncapRatings.tsx`,
  `KncapRatings.tsx`) now renders a persistent one-line coverage caption
  unconditionally at the top — before the pending/error/none/no-generation-
  match branches, so it's visible whether a rating exists, doesn't exist, or
  exists for the wrong year. The floor year in each caption is the real
  `min(rating_year)` in that source's own table, checked directly rather
  than assumed: Euro NCAP 2017, JNCAP 2003 (with the documented 2004-2006/
  2008 gaps), C-NCAP 2006, KNCAP 2021. NHTSA has no scraped table (it's
  live-proxied) so its caption states MY2011 instead — the real year NHTSA's
  current combined 5-star program started, a well-documented redesign, not
  something derived from local data. The floor-year clause that used to live
  inside each "none found" message was moved out to the new persistent
  caption rather than duplicated in both places.

  Separately, `SafetyRatings.tsx`'s tab content (the block rendering
  whichever of the five `*Ratings` components is active) is now wrapped in a
  `<div key={source} className="animate-fade-in">` — reusing the existing
  `animate-fade-in` keyframe utility (`global.css`, already used for the
  stats page's dimension/metric tab switches) rather than inventing a new
  transition. Keying on `source` makes React remount the wrapper on every
  tab change, re-triggering the fade+slide-up on each switch; matches this
  animation's one existing precedent in being enter-only, not a true
  crossfade (the outgoing tab's content simply unmounts, it doesn't fade
  out) — consistent with the stats page's own tab transition rather than a
  new interaction pattern, and no new dependency (e.g. a presence/animation
  library) for what a single CSS keyframe already covers.

- **Known issue, not yet fixed: Euro NCAP's own `tested_variant` label is
  wrong for at least one real assessment.** Found while spot-checking C-NCAP
  against Euro NCAP for the same car (CHERY TIGGO 8 PLUG-IN HYBRID, a real
  registry model): `registry.euroncap_ratings` has two rows under URL slug
  `chery/tiggo+8/{1190,1223ra}`, but both carry the display text "CHERY
  TIGGO 7 PHEV, LHD" — scraped verbatim from euroncap.com's own page
  (`euroncap-parse.ts` reads it as published), so this is a labeling quirk on
  Euro NCAP's own site, not a scrape bug. C-NCAP's equivalent match (奇瑞瑞虎8,
  unambiguously "Tiggo 8") doesn't have this problem, which is what surfaced
  the mismatch. Not fixed as part of the C-NCAP work — flagged here for a
  future pass if it turns out to affect more than this one model.

- **BMW/Mercedes-Benz crash-rating matching fix, plus NHTSA body-style
  filtering ✅ DONE (2026-09-25)** — found by asking how many registered
  models had zero Euro NCAP match at all: 88.5% of distinct brand+model
  combos (61.7% of registered `ЛЕГКОВИЙ` vehicles). Most of that turned out
  to be a matching-key artifact, not a real coverage gap — traced to
  `E 200`/`320D`-style registry model text not resolving in this project's
  own logic against ratings that were already scraped and sitting in
  `registry.euroncap_ratings`.

  **No re-scrape/rescan needed anywhere** — Euro NCAP's fix works entirely
  against the existing 499-row table; NHTSA has no table to rescan at all
  (still live-proxied). This was purely a matching-logic gap, not a data gap.

  **Euro NCAP** (`euroncap.service.ts`) — the registry stores a trim/engine
  code (`320D`, `E 200`), Euro NCAP names by chassis series/class (`3 Series`,
  `E-Class`), so the existing prefix match never connected them.
  `brandCandidateKey()` generalizes the pre-existing Mazda-numeric special
  case into one function: BMW's leading digit maps to its series (`3series`,
  only matches when Euro NCAP happens to have a bare, non-suffixed entry for
  that series — 1/3/5/6 today, so 2/4/7/8 series stay correctly unmatched
  rather than guessing a body style); Mercedes-Benz's leading letter-run maps
  to its class via an explicit whitelist (`e`→`eclass`, plus legacy renames
  `ml`→`gle`, `glk`→`glc`, `gl`→`gls`), matched on the _whole_ leading run so
  a short alias can never swallow a longer current class (`GLE`/`GLS`/`GLA`
  are not `G`- or `GL`-Class). Verified against the real local DB (24.7M
  registrations, real `ingest:full` data, not synthetic): BMW's unmatched
  vehicle count dropped from 247K to 55K, Mercedes-Benz's from 350K to 183K —
  **~475K vehicles recovered**, confirmed live for two real plates
  (`АЕ9991МА` BMW 320D→3 Series 2019 ★★★★★, `НН5077АН` Mercedes E 200→
  E-Class 2024 ★★★★★).

  **NHTSA** (`safety.service.ts`) — checked live against `api.nhtsa.gov`
  rather than assumed: BMW already worked (NHTSA indexes it by the same trim
  code the registry stores, `320I`→`320I`), but Mercedes-Benz had the same
  bug — confirmed `model=E%20200` returns `Count:0` while `model=E-CLASS`
  returns real variants. Fixed by adding an `<LETTERS>-CLASS` candidate to
  `candidateModels()` for Mercedes-Benz, simpler than Euro NCAP's case since
  NHTSA keeps whatever badge a model actually shipped under that year (no
  legacy-rename table needed — `ML-CLASS` stays `ML-CLASS`, confirmed live
  for MY2013).

  **Body-style filter, NHTSA only ✅ DONE (2026-09-25)** — found by manually
  checking whether the Mercedes fix's results were actually correct for a
  real plate (`СЕ5992ЕМ`, E 200, body `УНІВЕРСАЛ`/estate): NHTSA's
  `SafetyRatings/modelyear/.../model/...` query has no body-style parameter,
  so it returned 6 variants (2-door coupe, wagon, 4-door sedan) for one
  make/model/year, not just the wagon this car actually is — a pre-existing,
  brand-agnostic limitation (every brand's NHTSA lookup already mixed body
  styles this way), just invisible for Mercedes-Benz until it had any match
  at all. `SafetyRatings.helpers.ts` gained `registryBodyBucket()` (Ukrainian
  `body` text → `wagon`/`pickup`/`twoDoor`/`fourDoor`, `null` for anything
  unclassifiable — vans, "ПАСАЖИРСЬКИЙ", hatchback, since door count alone
  can't tell a hatchback from a sedan), `nhtsaBodyBucket()` (same, from
  NHTSA's terse `VehicleDescription` tokens — `SW`, `PU/`, `N DR`), and
  `filterByBodyStyle()`, which drops a variant only when _both_ sides
  classify confidently and disagree, and falls back to the full unfiltered
  list if filtering would zero everything out — so a gap in the bucket
  lists can narrow results but can never produce "no rating" for a car that
  has one. `body` threaded down through `SafetyRatings` → `NhtsaRatings`
  from `ResultCard`'s registry data and `VinResult`'s `extractVehicleInfo()`
  (`null`, unfiltered, on the vPIC-only fallback path — vPIC's decode
  doesn't carry a body field this app parses yet). Verified against the
  real 6-variant NHTSA response for `СЕ5992ЕМ`: filters down to exactly the
  2 `SW` (wagon) variants.

  **Not done / open:**
  - The same trim-code-vs-class-name pattern likely affects other German
    brands beyond BMW/Mercedes-Benz (Audi is mostly fine already — its
    registry model text already matches Euro NCAP's own naming, `A4`/`A6`/
    `Q5`; Porsche/Volvo not checked). Worth a repeat of the same
    "distinct-models-with-zero-match" audit after a future re-scrape to see
    what's newly worth a brand-specific candidate.
  - Hatchback vs. sedan stays unresolved on the NHTSA body filter (both
    commonly show as `N DR` with no distinguishing token) — `vPIC`'s own
    `Body Class` decode field could disambiguate this and fill the VIN-only
    fallback path's `body: null` gap, not wired in yet.
  - The Euro NCAP tab was deliberately _not_ given the same body-style
    filter — Euro NCAP tests one representative trim per generation and the
    rating is meant to apply platform-wide, so a body mismatch there is a
    different (and smaller) kind of imprecision than NHTSA mixing unrelated
    body styles into one query. Revisit if it turns out to matter in
    practice.

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

  **Follow-up (2026-09-25): 3D cursor tilt added alongside the glow.**
  `useCursorGlow` was renamed to `useCardMotion`
  (`apps/web/src/hooks/useCardMotion.ts`) and extended to also write
  `--tilt-x`/`--tilt-y` custom properties on the same node, consumed by a
  `transform-[perspective(var(--tilt-perspective,1200px))_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]`
  utility on `ResultCard`/`VinResult`'s `Card` — the whole card rotates toward
  the cursor, no zoom (per the frontend.fyi 3D-perspective-card pattern).
  Unlike the glow's deliberately window-wide tracking, tilt is clamped to
  `MAX_TILT_DEG` (currently `1`, tuned down from an initial `10` — subtle
  reads better than dramatic here) and only non-zero while the pointer's
  computed `x`/`y` percentage actually falls within `[0, 100]` (i.e. over the
  card) — outside that range both vars reset to `0deg`, and the existing
  `transition-[transform,box-shadow] duration-200 ease-out` on `Card` eases it
  back to flat rather than snapping. A physical 3D rotation reading as
  continuous ambient motion (like the glow) would look wrong the moment the
  cursor is far from the card, so this is intentionally card-scoped even
  though it piggybacks on the same window-level `pointermove` listener for
  the position math. Also gated behind `prefers-reduced-motion` (tilt vars
  are simply never written when set) since a 3D rotation is a stronger
  motion cue than the blurred glow, which was left as-is.

  **Bug found live: fixed `perspective(1200px)` "zoomed" once the card grew
  tall.** `ResultCard`'s history/ratings/photos sections are togglable and
  can push the card past ~1800px. rotateX/Y's visual swing is proportional to
  a point's distance from the rotation origin (the box center) divided by the
  perspective distance — with perspective pinned at `1200px`, a card taller
  than that starts producing a heavily exaggerated, "zoomed"-looking
  foreshortening for the very same rotation angle that looked subtle on a
  short card. Fixed by writing a `--tilt-perspective` custom property
  alongside `--tilt-x`/`--tilt-y`, computed as `rect.height * PERSPECTIVE_RATIO`
  (`1.6`, chosen to reproduce the original `1200px` look at the card's typical
  ~750px closed height) — perspective now scales with the card's own height,
  so the same `MAX_TILT_DEG` looks the same size whether the card is closed
  or fully expanded. Confirmed live via Chrome DevTools MCP: with all three
  sections expanded (~1888px tall) and forced to an 8° tilt for visibility, a
  fixed `perspective(1200px)` produced an obviously distorted, "zoomed" top
  edge, while `perspective(var(--tilt-perspective))` (≈3020px for that
  height) kept the same rotation reading as a plain, proportional tilt.

  **Follow-up (2026-09-25): user-facing on/off toggle for the tilt.**
  `useCardMotion` now takes a `tiltEnabled: boolean` param — false skips the
  `--tilt-x`/`--tilt-y` recompute on `pointermove` entirely (the glow keeps
  tracking regardless) and immediately zeroes both vars on the toggle
  transition, so the card's existing `transition-[transform,box-shadow]` eases
  it back flat instead of freezing mid-tilt. The preference lives in
  `useUiStore` as a new `cardTiltEnabled` field (`apps/web/src/store/ui-store.ts`)
  — unlike `theme`/`drawerOpen` (in-memory only), it's persisted to
  `localStorage` (`carplates.cardTiltEnabled`, mirroring `i18n`'s
  `initialLang`/`persistLang` pattern) since this is a standing preference the
  user is actively opting out of, not per-session UI state. `CardTiltToggle.tsx`
  (a new small icon button, styled after `FavoriteButton`'s state-via-color
  pattern) renders in a `flex justify-end` strip above the `Card` in both
  `ResultCard` and `VinResult` — both components now return a `<>` fragment
  (toggle + Card) instead of the bare `Card` root that was there before.
  Also fixed a real bug surfaced while adding this: `useCardMotion`'s
  `window.matchMedia(...)` call had no guard, and jsdom (Vitest's test
  environment) doesn't implement `matchMedia` at all — every `ResultCard.test.tsx`
  test was failing with `window.matchMedia is not a function` the moment the
  hook's effect ran, undetected until this follow-up's test run because earlier
  passes only checked lint/type-check, not `pnpm test`. Fixed at the test-env
  boundary, not in app code: `apps/web/src/test/setup.ts` now polyfills
  `window.matchMedia` to always report "no preference," since a real browser
  always has the API and the gap is jsdom's, not something app code should
  defend against.

  **Follow-up (2026-09-25): text looked blurry on hover while tilted.**
  Reported specifically on the `SafetyRatings`/`EuroNcapRatings` "What do
  these numbers mean?" line — small text, and on Windows this is a known
  Chromium/Edge rendering quirk where a GPU-composited layer (which any
  non-zero `perspective()+rotateX/Y()` forces the element into) gets
  resampled at an angle, and on a display with fractional OS-level scaling
  (125%/150%, common on Windows) that resampling visibly softens small text
  — worse than the geometry alone would predict. Couldn't be reproduced
  pixel-for-pixel in the automated Chrome DevTools MCP session used to build
  this feature (that instance runs at 100% scale), so the fix applies the two
  standard, low-risk mitigations rather than a change verified against the
  exact artifact: `backface-hidden` (Tailwind's `backface-visibility: hidden`
  utility) on the `Card` in both `ResultCard` and `VinResult` — the commonly
  cited fix for "blurry content under a CSS 3D transform" — and rounding
  `--tilt-x`/`--tilt-y` to 2 decimal places in `useCardMotion` (was up to 15
  significant digits from raw float math) to stop feeding the compositor
  needless sub-hundredth-of-a-degree noise on every `pointermove`. If this
  doesn't fully resolve it, the next lever is lowering `MAX_TILT_DEG` further
  (already 10 → 5 → 1 across earlier follow-ups) — less rotation means less
  resampling — or moving the tilt off the actual text-bearing DOM entirely
  (a background-only parallax layer instead of rotating the real content),
  which would be a real design change, not a one-line fix.

  **Follow-up (2026-09-25): tilt toggle moved beside the card on wide screens.**
  It originally sat in its own `flex justify-end` row above the `Card`, which
  pushed the whole card down and added scroll for no real benefit once a
  screen was wide enough to have empty margin on both sides of the
  `max-w-2xl` column anyway. `ResultCard`/`VinResult` now wrap `Card` in a
  `relative w-full max-w-2xl` div and render `CardTiltToggle` **twice**: once
  `absolute top-3 -right-14 hidden lg:inline-flex` (floated just outside the
  card's right edge, vertically level with the header, only from the `lg`
  breakpoint up — below `1024px` there usually isn't 40-50px of true margin
  beside the card to float into), and once `absolute top-3 right-12 lg:hidden`
  as a second icon next to `FavoriteButton` inside the card itself, for
  everything narrower. Both read the same `useUiStore` selector, so they're
  never out of sync — only one is ever in the accessibility tree at a time,
  since `hidden` is `display:none`, not just visually hidden. The header rows
  in both components got `pr-20 lg:pr-8` (was a flat `pr-8`) so long
  brand/model titles don't run under the extra icon on the narrow layout.
  Verified via Chrome DevTools MCP at 1280px (toggle floats outside, card sits
  flush under the search field — no gap), 1024px (the `lg` boundary — no
  horizontal scrollbar introduced), and 500px (toggle falls back next to the
  star, title wraps cleanly instead of colliding with the icons).

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

Crash-test _ratings_ (`api.nhtsa.gov/SafetyRatings`) graduated out of this
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
    `PrimaryProduct`) about the _manufacturer as a company_, not the car. No
    end-user value on a result card, none of it overlaps or extends the
    per-VIN decode fields.
  - `DecodeVinValues` (flat single-object shape) — same ~95 fields
    `DecodeVin` already returns, just reshaped from variable/value pairs into
    one object. No new data (this is on top of the already-resolved
    `decodevin` vs `DecodeVinExtended` comparison from Phase 1.5).
  - Everything else in the catalog (Make/Model/vehicle-type/WMI/plant-code
    lookups) is reference data for _building_ a decoder, not for enriching a
    single VIN's result — not applicable here.
    **Conclusion: not pursuing further vPIC surface.** `/api/vin/:vin` already
    forwards the richest endpoint (`DecodeVin`) and the UI already renders every
    non-empty field. Crash-safety/recall data from the separate
    `api.nhtsa.gov/SafetyRatings` and `/recalls` APIs was a different topic,
    researched separately for a different reason (US-market-only relevance, not
    decoder coverage) — ratings shipped, see Phase 1.5's "Crash-test safety
    ratings" entry; recalls are still parked, see "Phase 3+ — recalls" below.
- **Self-host NHTSA's own data instead of proxying it live — researched,
  deferred (2026-09-25).** Prompted by the Euro NCAP CSV export/import work
  (see Phase 1.5) — same instinct ("keep a local copy, depend on the external
  source as little as possible") applied to the two things `VinService` and
  `SafetyService` still live-fetch per request.
  - **vPIC VIN-decode database — deferred, bigger lift than it looks.** NHTSA
    does publish this for exactly this purpose:
    [vpic.nhtsa.dot.gov/Downloads](https://vpic.nhtsa.dot.gov/Downloads) ships
    a monthly PostgreSQL custom-format dump (`vPICList_lite_*.custom.zip`,
    ~70 MB zipped) — no format conversion needed, we're already on Postgres.
    The catch: it's a decode-_only_ schema (~100 tables of WMI patterns, VDS
    decode rules, code tables) — `VinService.decode()` would have to
    reimplement NHTSA's own pattern-matching decode algorithm against those
    tables, not just persist pre-decoded rows the way the Euro NCAP scraper
    does. That's a real project on its own, closer to Phase 3/4 scope than a
    quick follow-up. **Decision: keep `/decodevin` live-proxied as-is** — it
    already works fine locally behind the existing bounded in-memory cache.
  - **NHTSA Safety Ratings bulk data — deferred, cheaper if it comes back
    up.** `data.transportation.gov` hosts "NCAP 5-Star Safety Ratings" as a
    Socrata dataset, exportable in full as CSV/JSON — the same shape as the
    Euro NCAP scrape (bulk rows → one table → replace `SafetyService`'s live
    two-step `api.nhtsa.gov/SafetyRatings` walk). Crash photos/videos would
    stay referenced URLs, never downloaded — the same "media stays linked,
    never rehosted" rule already applied to Euro NCAP. Not started; revisit
    if/when the NHTSA tab's live dependency becomes an actual problem (rate
    limits, downtime) rather than a theoretical one.

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
  firm whose product _is_ this price data. Checked a95.ua directly: no public
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
- ⛔ **New-car MSRP + specs from official distributor sites (UA and
  EU/US fallback) — researched, parked (2026-09-25)** — asked: can we pull
  real current model prices from Ukraine's official brand distributors
  (Toyota/UkrAVTO, Škoda/Eurocar, Hyundai Motor Ukraine, Winner Group
  (Ford/Volvo/JLR/Porsche/MG), UkrAVTO's other marques (Mercedes, KIA,
  Chery/Jetour, Geely, ZAZ), BYD/BBCars, etc.), falling back to EU/US
  manufacturer sites, and is there a free RIA-like API covering all
  makes' prices + specs. Findings on all three:
  - **UA distributor sites**: no brand publishes a price API — Škoda's
    is PDF price-list downloads (`skoda-auto.ua/owners/price-lists`),
    others are plain marketing HTML with no structured feed. There isn't
    one "Ukrainian official sites" set either — each brand has its own
    distributor/dealer-group site (UkrAVTO alone runs Toyota, KIA
    (Falcon-Auto), Mercedes (Avtokapital), Chery/Jetour, Geely, ZAZ under
    separate sub-brands), so covering "all real models" means ~15-20
    independently-run sites, each needing its own PDF/HTML parser that
    breaks on redesign — before even reaching the ToS question. Same
    scraping-a-commercial-site's-priced-catalog risk class as Platesmania
    and the fuel-price entry above, times ~15-20 sites instead of one.
  - **EU/US fallback**: doesn't solve pricing either. The free, official,
    no-auth options that exist (`fueleconomy.gov/ws/rest` — EPA/DOE MPG +
    CO2 + spec data; NHTSA vPIC, already used for VIN decode; the EU
    type-approval register on `data.europa.eu`) all carry technical specs,
    **not retail prices** — MSRP is a national/dealer-network decision the
    EU/US regulators never collect. Manufacturer configurators
    (toyota.com, vw.com, bmw.com) don't expose a public pricing API either.
  - **Free RIA-alternative with prices + specs, surveyed**: CarAPI
    (`carapi.app`) — free tier is unauthenticated but capped to 2015-2020
    Ford/Toyota only, full MSRP coverage is a paid plan ($199-299/yr).
    API Ninjas Cars API — free tier has no price/MSRP field at all (specs
    only), and its own terms forbid commercial use on the free tier
    regardless. CarQueryAPI — dead, unmaintained since 2019. Auto-data.net
    / Car2db — paid, demo key only. No free source currently combines
    current prices with specs across makes, for UA or elsewhere.
  - **Decision: skip building any distributor-site scraper.** The one
    actually-viable path for real market prices remains what Phase 2
    already tracks: a `developers.ria.com` API key (AUTO.RIA already
    aggregates UA dealer listings/prices under one API) — pursue that
    token, don't route around its absence with N one-off site scrapers.
    Revisit only if a free/affordable all-makes pricing API turns up, or
    a specific brand's distributor ships a real public feed (not a PDF).

## Phase 4 — VPS / production

### VPS sizing (starting point)

`registry` schema is 13.9 GB (24.7M rows in `registrations`) as of 2026-09,
growing by roughly the ~110 MB/year the backup policy below already assumes
for archived source ZIPs — the DB grows at a similar rate (one monthly ingest
of deltas, not a re-ingest of the full history). Containers to fit: Postgres,
`api`, `web` (served by `api`), Redis, Caddy, and a monthly `ingest-cron` job
that runs occasionally and holds an exclusive lock on `registrations` for
minutes.

| Resource | Spec       | Why                                                                                                                                                                                                               |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU      | 4 vCPU     | Normal traffic is light indexed lookups; `ingest-cron` is I/O-bound not CPU-bound, but spare cores keep it from starving API traffic during its run                                                               |
| RAM      | 8 GB       | Only `current_registration` (the hot-path matview) needs to stay resident, not the full 14GB — 8GB covers Postgres `shared_buffers` + OS page cache + Redis + Node without swapping during ingest's index rebuild |
| Disk     | 80 GB NVMe | 14GB DB + WAL + 2-3 `pg_dump -Fc` backups + archived source ZIPs (~1.2GB, +110MB/year) + Docker images/logs, with years of headroom                                                                               |
| Network  | default    | Indexed point-lookups; bandwidth isn't the bottleneck                                                                                                                                                             |

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
