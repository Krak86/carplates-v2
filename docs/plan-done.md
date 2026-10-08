# carplates-v2 — completed work archive

Archived from `PLAN.md` (2026-10-01, extended 2026-10-05 with plate recognition, ALPR step 1, background layers,
the car reviews/videos/3D/360°/press family, fuel-economy design notes, the Wikimedia photo cache, the YouTube-fallback design and auto-news RSS): the finished write-ups, moved verbatim. Section headings are unchanged, so references like
"PLAN.md's Phase 1.5 'Registry statistics' entry" resolve here. Active and
planned work stays in `PLAN.md`. When an item finishes, move its write-up here
and leave a one-line ✅ entry in the PLAN.md backlog.

Note: Phase 1.5 still contains a couple of "open" notes written when the
items were current (crash-test ratings beyond NHTSA, VinResult history
rename); the live status of those is in the PLAN.md backlog.

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
       prefix match needs the _stored_ key to be the shorter, more generic
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

  4. **IIHS (US, insurance-industry-funded, distinct from NHTSA) — shipped
     as the sixth safety-ratings source (2026-09-26).** Methodologically
     genuinely additive, not redundant with NHTSA (Good/Acceptable/Marginal/
     Poor across small-overlap frontal, side, headlights, crash-prevention
     tests, plus "Top Safety Pick"/"Top Safety Pick+" awards — a car can
     rate well on one scale and not the other).

     **Re-researched 2026-09-26 with a real browser session (network-tab
     inspection, same method used to confirm JNCAP/C-NCAP/KNCAP) — the
     original "category/search-driven, not a clean paginated list" call was
     wrong**, and this turned out easier to scrape than JNCAP, not harder.
     The shipped scraper's actual discovery mechanism ended up simpler than
     first researched: `https://www.iihs.org/sitemap.xml` lists every
     `/ratings/vehicle/{make}/{variant}/{year}` page directly — 6,023 pages
     across 660 make/variant combos, model years 1994–2027 — so the a–z
     search-sweep and `variant-lookup` calls originally scoped turned out
     unnecessary; the sitemap alone gives a complete, exact page list.
     `GET /api/ratings/get-class-lookup`/`class-summary` and
     `/ratings/top-safety-picks/{year}` exist too but weren't needed for a
     full per-vehicle-year scrape. No bulk CSV/API dump exists (`/topics/data`
     404s) — unlike NHTSA's Socrata alternative — but the sitemap makes one
     unnecessary. No Cloudflare/CAPTCHA, no auth beyond a cookie-consent
     cookie.

     **Schema — `registry.iihs_ratings`** (`migrations/0009_iihs_ratings.sql`):
     unlike the fixed-column shape of euroncap/jncap/cncap/kncap, IIHS's own
     tested-criteria set changes by era (small-overlap front split by seat
     pre-2012, "original" vs. "updated" moderate-overlap/side tests from the
     mid-2010s redesign, roof strength/head restraints only tested through
     the original-test era, pedestrian front-crash-prevention only from the
     2019+ redesign), so each assessment's test results are a `tests jsonb`
     array of `{key, label, rating, qualifier}` rather than one column per
     test — same pattern as `jncap_ratings.test_scores`. `assessment_id` is
     the page's own URL path, doubling as a real "full report" permalink
     (`GET /ratings/vehicle/{assessmentId}`).

     **Scraper — `scripts/src/iihs.ts` + `iihs-parse.ts`** (self-contained,
     no `*-names.ts` translation table needed — IIHS's own text is already
     English, unlike KNCAP/C-NCAP): fetches and caches the sitemap, then each
     vehicle page sequentially (1.5s delay). `parseVehiclePage()` splits
     `"2026 Mercedes-Benz E-Class"` into make/model by growing a leading-word
     prefix of the post-year text until it matches the URL's own make slug —
     the only reliable boundary for a make that can be one word or several. A
     test's rating cell is one of two shapes: `abbr[aria-label]` on the
     modern Good/Acceptable/Marginal/Poor scale (LATCH's "+" grade is a
     sibling `span.gamp-plus`), or a `div[class*="fcp-"]` on the older
     Superior/Advanced/Basic front-crash-prevention scale (`fcp-not-tested`
     → `rating: null`, not the literal text) — both confirmed against real
     pages spanning both eras. Front-crash-prevention tests span two table
     rows (a header-only row naming the test, then a row with the
     availability text and the actual rating) — detected generically by
     `<td>` count, not by scale, so both eras flow through the same code
     path. Verified against 4 real fixtures in `scripts/src/fixtures/`
     (2026 Accord: updated tests + LATCH "+"; 2015 Accord: original tests +
     Superior/Advanced/Basic FCP; 1994 VW Golf: the single-test minimal era;
     2020 Mercedes-Benz E-Class: hyphenated two-word make split + a "Not
     tested" FCP result) — all 5 `iihs-parse.test.ts` cases passed against
     real captured markup on the first attempt.

     **A real bug caught before the full scrape completed**: the sitemap
     encodes a space-containing make as `alfa%20romeo`, and the initial
     scraper didn't decode it — the raw `%20` survived `makeKey()`'s alnum-
     only normalization as stray literal digits (`"20"`), silently dropping
     every Alfa Romeo page. Fixed by decoding each sitemap path up front and
     re-encoding per URL segment only when actually requesting the page.
     Separately, a real full run hit a sharp, sustained transition from 100%
     success to ~100% "fetch failed" partway through (not a permanent
     block — a standalone retry moments later succeeded fine) — added
     per-request retries (`MAX_ATTEMPTS`, growing delay) plus a single
     end-of-run cooldown-and-retry pass over whatever's still failed, so a
     multi-hour scrape doesn't lose a whole stretch of pages to one transient
     episode.

     **API — `iihs.service.ts`**: same `prefixQuery` shape as the other four
     sources, but unlike their self-contained duplication, its brand-mismatch
     fallback imports `brandCandidateKey()` from `euroncap.service.ts`
     directly rather than re-deriving it — IIHS names BMW's series and
     Mercedes-Benz's classes (with the same legacy ML/GLK/GL renames) by the
     exact same convention Euro NCAP does, so a second copy would just be the
     same facts typed twice. `applicableAssessmentIds` is **plural**, unlike
     the other five sources' single id — IIHS rates each body variant of a
     model-year separately (a sedan and a hatchback of the same nameplate
     both count as "applicable" for one year), so a single id can't
     represent it. Verified live end-to-end against real DB data
     (`GET /api/safety/iihs?make=Acura&model=ADX&year=2025` → the 2025
     variant correctly picked as applicable over the also-present 2026 one).

     **Web — `IihsRatings.tsx`**: sixth tab in `SafetyRatings.tsx`, given a
     `body` prop like `NhtsaRatings` — `iihsBodyBucket()` (new in
     `SafetyRatings.helpers.ts`) maps IIHS's plain-English `variantType`
     ("4-door sedan", "crew cab pickup", "minivan") to the same coarse bucket
     `nhtsaBodyBucket()` already uses, and `filterByBodyStyle()` was
     generalized to take a classifier callback instead of being hardcoded to
     NHTSA's `description` field (both call sites, and the existing test
     suite, updated to pass their own classifier — no behavior change for
     NHTSA, confirmed by the untouched assertions still passing). Verified
     live in a real browser session against the real Acura ADX plate above:
     correct applicable/other-year split, all 8 tests with ratings and
     qualifiers, TSP badge, working "Full IIHS report" link — and the NHTSA
     tab re-checked on the same car to confirm the `filterByBodyStyle`
     generalization didn't regress it (still correctly narrows to SUV
     AWD/FWD).

     **Known follow-up, not fixed as part of this work**: at 320px the
     six-tab bar now genuinely overflows (previously five tabs fit exactly,
     per the "Design note" above) — the existing `overflow-x-auto` handles
     it as a horizontally-scrollable strip rather than breaking, but this is
     the first source to actually trigger that fallback in practice. Revisit
     the "dropdown/select rethink" question the design note has deferred
     since KNCAP if a seventh source ever ships.

     **Follow-up fix, same day: collapse re-published model years into one
     card.** Spotted by the user looking at a real plate's Civic result and
     asking why the "other tested model years" list ran 1996-2025 — IIHS
     republishes the _identical_ assessment under every model-year page a
     generation spans (confirmed against real data: this Civic's ~30 scraped
     rows across 1996-2026 collapse to just 6 genuinely distinct
     assessments, since e.g. 2006-2008 and 2020-2021 are byte-identical
     re-publications — the live site itself phrases this as "Rating applies
     to 2023-26 models"). The DB and scraper are unchanged (each model-year
     page is still its own real, separately-permalinked row — right for
     data fidelity); the fix is purely a display grouping, `groupIihsRatings`
     in `SafetyRatings.helpers.ts`: folds consecutive years sharing the same
     variant + award + test-content signature into one `IihsRatingGroup`
     with a year range ("2023–2026"), never bridging a gap year or a
     genuine content change even if it coincidentally matches something
     seen earlier. `IihsRatings.tsx`'s `RatingCard` now takes a group
     instead of a single rating, linking "Full report" to the newest year
     in the group. 5 new unit tests plus a live re-check of the same real
     Civic plate (КА7151ОХ) confirmed the fix: ~30 near-duplicate cards
     became ~18 real ones, correctly keeping 2025/2026 hatchback separate
     (their content actually differs) while merging 2025-2026 sedan
     (identical).

     **Second follow-up, same day: dropped the "other tested model years"
     list entirely.** Even grouped down to ~18 entries, the user pointed out
     it still wasn't useful — a 2025 Civic buyer doesn't care what a 1996
     Civic scored. Asked the user how to handle it (limit to nearby years /
     hide entirely / cap to N entries / leave as-is); they chose hide.
     Structural reason this doesn't apply the way it does for the other five
     sources: Euro NCAP/JNCAP/C-NCAP/KNCAP each test a nameplate once per
     _generation_ (a handful of rows total), so "other tested generations"
     is genuinely useful fallback context when the exact one isn't tested.
     IIHS tests almost every model year, so it _always_ has an exact or
     near-exact match — the "other" list was never filling a real gap, just
     surfacing decades of irrelevant history. `IihsRatings.tsx` now renders
     only the applicable group(s); `groups`/`groupIihsRatings` are unchanged
     (still needed to collapse the applicable side itself, e.g. this Civic's
     2025–2026 sedan). Removed the now-dead `iihsOtherRatings` i18n key and
     the `compact` prop `RatingCard` no longer needs; reworded
     `iihsNoGenerationMatch` in all three locales since it no longer points
     at a list "shown below" that doesn't exist. Re-verified against the
     same real Civic plate: just the two applicable cards (sedan 2025–2026,
     hatchback 2025), full test detail, straight to the source line.

     **Full-fleet ingest completed 2026-09-26**: all 6,023 pages, **6,023
     rows landed** (model years 1994–2027, 1,878 carrying a TSP/TSP+ award).
     Two real issues surfaced and were fixed during the run itself, not
     found by inspection beforehand: the `alfa%20romeo` decoding bug above,
     and one single page (`volkswagen/atlas-4-door-suv/2018`) that came back
     "not a recognizable vehicle page" live but parsed correctly when
     re-read from its own disk-cached HTML moments later — a one-off,
     non-reproducible blip (not a parser bug: identical bytes, different
     outcome), resolved by simply re-running the ingest once more (which
     replays instantly from cache) rather than chased further. `pnpm
export:iihs:csv` committed `scripts/seed-data/iihs-ratings.csv.gz`
     (139 KB); round-tripped back in via `pnpm ingest:iihs:csv` to confirm
     6,023 rows in, 6,023 out, no loss.

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
  _market_ scope (EU-spec, US-market, JDM-domestic, ...), not the _year_
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

- **Installable PWA + offline mode ✅ DONE (2026-09-29)** — `vite-plugin-pwa`
  (config in `apps/web/vite.config.ts`). Client-side plus one small API endpoint.

  **Service worker.** Precaches the app code (~1.8 MB) in the background after
  page load, takes control of the open page on first install, and serves
  `index.html` for page loads offline. `PwaUpdatePrompt` shows "Update / Later"
  for new versions and an offline-ready toast; persistent storage is requested
  once installed. Runtime caches are all prefixed `carplates-rt-`: brand logos,
  optimized backgrounds, and Wikimedia images (always fetched in CORS mode so
  the CSS hero background is cacheable too). **Precache gotcha:**
  `manifest.webmanifest` was listed twice, which crashed Workbox at startup —
  nothing was cached or served until fixed. PDF/DOCX libraries are split into
  `export-*` chunks and kept out of the precache (along with the PDF fonts);
  the export menu hides PDF/DOCX while offline.

  **Offline results.** The TanStack Query cache is persisted to IndexedDB
  (`lib/offline-cache.ts`, `lib/offline-storage.ts`) and trimmed on every
  write: 200 plates / 200 VINs / 1200 ratings / 200 wiki entries, 30 days,
  favorites never expire. Saved data is discarded when the shared Zod schemas
  change (so a schema change in `packages/shared` invalidates every user's
  offline copy — intended). `GET /api/stats/version` (hash of the last ingest,
  stats row count, ratings scrape times; `dataVersionResponseSchema`) marks
  saved results "out of date". `/api/stats` (~14 MB) stays online-only, as do
  photo/camera search and advanced search ("needs connection"). Local-only
  stores (history, favorites, storage size) keep working offline; deleting a
  History/Favorites entry removes its saved result unless the other list still
  has it. Sidebar shows storage used + "Clear cached images" (IndexedDB
  untouched). Offline banner, "saved copy from {date}" notice, "offline" badge
  on list rows. `LoadErrorBoundary` wraps lazy routes, sidebar, top-stats panel
  and stats map so a failed chunk load no longer blanks the app.

  **Supporting changes.** `vite-imagetools` re-encodes background photos to
  1920px WebP (34 MB → 2.3 MB). `/api/wiki` returns 1280px Wikimedia
  thumbnails (~300 KB vs. multi-MB originals), attribution still looked up
  from the original file. SPA `Cache-Control` (`spa.controller.ts`): hashed
  assets immutable for 1 year; `index.html`/`sw.js`/manifest `no-cache`; other
  static files 1 day. pnpm: `sharp` added to `allowBuilds`;
  `@vite-pwa/assets-generator` **v2** required (v1's older sharp crashed the
  build next to vite-imagetools). Icons/favicon generated from
  `public/favicon.svg`. Telemetry (only when enabled): `offline_storage`
  (daily), `offline_hit`, `pwa_installed`, `load_error`.

- **Nearby services map ✅ DONE (2026-09-29)** — collapsible section on the
  result card (`NearbyServices.tsx`, `use-nearby-location-actions.ts`,
  `lib/maps.ts`): asks for geolocation on open, handles blocked/failed/non-HTTPS
  cases with retry, and embeds a localized Google Maps search (brand-specific
  dealer search) around **rounded** coordinates (privacy). Needs no key by
  default; optional `VITE_GOOGLE_MAPS_EMBED_KEY` (`apps/web/.env`) switches to
  the official Embed API.

- **Homepage top-5 leaderboards ✅ DONE (2026-09-29)** — top 5
  makes/models/colours/regions below the homepage links, lazy-loaded and fed by
  the shared cached `/api/stats` query; shown on the homepage only (not on
  result pages).

- **Mobile UX pass ✅ DONE (2026-10-01)** — fixes from testing on a Galaxy S24 Ultra over ngrok.
  - **Layout**: mobile drawer sits below the sticky header (its first item, "Search", was hidden
    behind it); search input and `<main>` got `min-w-0` and `body` `overflow-x: clip` (the input's
    intrinsic width caused page-wide horizontal scroll and a header that stopped short); the
    homepage top-stats grid is 1 column on phones (`TopStatsPanel.tsx`); `Layout.tsx` scrolls to
    top on route-path change (not on `?section=`/`?tab=` changes, which `share-section.ts` scrolls itself).
  - **Search buttons**: image/camera/AR buttons are icon-over-label tiles on phones, inline pills
    from `sm` up; shared classes in `components/search-button-styles.ts`.
  - **"Search by image"** no longer sets `capture` on its file input → the phone's normal chooser
    (gallery / files / camera), same as desktop.
  - **"Use camera"** on touch devices (`(pointer: coarse)`) hands off to the **native camera app**
    (`<input capture="environment">`) — real lenses, optical zoom, full-resolution photo, which a
    `getUserMedia` stream can't match (verified: web zoom is digital on one lens, ≈8× cap vs. the
    native camera's 5× optical lens at 9.6×). Desktop keeps the live `CameraCaptureDialog`
    (full-screen black viewfinder + round shutter on small screens, high-res stream, `takePhoto()`
    still with canvas fallback, hardware-zoom slider via `use-camera-zoom.ts`/`CameraZoomControl.tsx`).
  - **AR scan** (`ArCameraDialog.tsx`): quality switch HD / Full HD (default) / 4K, camera picker
    when the browser exposes >1 camera (`enumerateDevices`), actual stream resolution shown,
    zoom slider (range = whatever `getCapabilities().zoom` reports — the browser's cap, not ours).
    Detector frames are downscaled to 1280px (`use-live-plate-detection.ts`) and boxes scaled back, so
    a 4K stream keeps detection fast while OCR crops stay sharp.
  - **Dev gotcha**: opening the native camera backgrounds the tab; through ngrok → Vite dev server
    the HMR socket drops and Vite reloads the page on return, losing the photo. Test camera flows
    against a production build: `pnpm build`, set `WEB_DIST_DIR=../web/dist` in `apps/api/.env`
    (read once at startup — restart the API), `ngrok http 3000`; unset it for normal dev.

- **Link previews + tab title ✅ DONE (2026-10-01)** — first-load meta for shared links, dynamic tab title.
  - **Tab title** (`hooks/useDocumentTitle.ts`): `document.title` = `"<page> · Cars UA"` and `<html lang>`
    follow the UI language. Static routes use their `nav.*` key (`ROUTE_TITLE_KEYS`, called from `App.tsx`);
    `SearchRoute` shows the searched plate/VIN as soon as the URL changes (found or not), then appends
    "Brand Model (Year)" once data loads. Typing alone never changes it.
  - **Meta tags** (`apps/api/src/spa/`): only on a **first load / deep link** (in-app navigation never hits the
    server). `/<plate>` and `/<vin>` get per-vehicle title/description/`og:*`/`twitter:*` + `noindex, follow`
    (millions of per-vehicle URLs stay out of search indexes; unfurlers still read the tags; no sitemap, so
    crawlers only reach them via external links). Static routes use `STATIC_PAGES` in `spa-text.ts`
    (ua/ru/en), rendered once per route×language and cached; unknown paths get home tags + `noindex`.
    `PreviewService` (10-min LRU) shares one lookup between the meta and the image.
  - **Language**: `?lang=ua|ru|en` picks the preview language (default `ua` — crawlers send no language).
    In-app share links (`buildShareUrl`) append the sharer's `?lang=`; opening one applies that language
    for the visit **without persisting it** (`initialLang` in `i18n/index.ts`); an explicit language
    switch rewrites the URL param (`ui-store.ts`).
  - **OG image** `GET /og/<plate|vin|default>.png` (`og.controller.ts`, `og-card.ts`): 1200×630, gradient from
    the car's registry color (`VEHICLE_COLOR_HEX`, `fallbackVehicleColor` when absent) to brand blue, all text on
    dark translucent panels so any color stays readable, plate-style box (VIN shrinks to fit), brand logo.
    **`@resvg/resvg-js` + bundled Noto Sans files** (no system fonts, no Puppeteer); in-memory LRU of 300 PNGs,
    `Cache-Control` 24h, throttled 60/min/IP; unknown keys → generic card (5-min cache). Reads fonts/logos
    from `WEB_DIST_DIR`, else `apps/web/public` (so it works with the dev API without a build).
  - **`robots.txt`**: disallows `/api/` and `/og/` only — plate/VIN pages stay crawlable so `noindex` is seen.
  - **Testing gotcha**: the meta is injected by the **API**, not Vite — `:5173` and `vite preview` never show it.
    `pnpm build`, set `WEB_DIST_DIR=../web/dist` in `apps/api/.env`, restart the API, open `localhost:3000/<plate>`
    in Incognito (an old service worker serves a cached `index.html`). Keep `PORT` at 3000 — the Vite proxy
    targets it. Covered by `spa.controller.test.ts` (no server needed).

- **Dark mode + photo/AR polish ✅ DONE (2026-10-01)** — dark theme follows the system preference, with a persisted
  toggle and a no-flash init script; brand logos made visible on dark. AR scan: pinch zoom, bigger video, overlay
  settings, "found plates" pill. Photo search: polish, stacked-plate reorder, GPS fix.

- **Fuel/CO2 follow-ups, `/safety`, result-card and search polish ✅ DONE (2026-10-02)** — the fuel design and open
  items stay in PLAN.md ("Fuel economy & emissions").
  - **Fuel/CO2**: explains WLTP/EEA/EPA with per-language wiki links; similar vehicles and `/fuel` models link to
    advanced search; cleanest/dirtiest lists expand 5 → 15 and also show on the homepage; About lists both sources.
  - **`/safety`** (`SafetyStatsRoute.tsx`): combined crash-rating stats across Euro NCAP, JNCAP, C-NCAP, KNCAP, IIHS.
    `/fuel` and `/safety` tabs are URL-addressable via `?tab=`, like `/stats ?dim=`.
  - **Stats perf**: `/api/stats` split into a light `/api/stats/top` and per-dimension `/api/stats/field/:dimension`;
    `/top` also feeds the fuel and crash-test ranking chips on the result card.
  - **Result card**: collapsible basic data; share deep links for basic, emissions and nearby sections; wiki hero
    image reserves its height with a skeleton; tilt toggle and animated vehicle icon hidden on mobile; globe icon on
    the official-site link.
  - **Search page**: "+" advanced toggle, inline clear icon, collapsible/consolidated photo warnings, animated
    notices, clearer list labels, shared quick-links footer.
  - **Brand logos**: 38 more (ZEEKR, JAC, FAW, TATA, МАЗ, GMC, …) in `packages/shared/src/brandLogo.ts`;
    Favorites/History rows show the logo (`brandFromLabel` recovers the brand from the stored label).
  - **Car export** (docx/pdf/md): Emissions section, Wikipedia lead image and brand logo; filename
    `brand_model_year_plate_vin_YYYYMMDDHHmmss`.

- **Year-aware hero image + kind placeholder ✅ DONE (2026-10-02)**
  - **API** (`/api/wiki`, `commons-image.ts`): searches Wikimedia Commons for "<brand> <model>" + model year and ranks
    results (landscape jpeg, standalone year, exterior over detail shots), so an older car gets its own generation's
    photo instead of the article's newest lead image; falls back to the lead image. Accepts `?year=` and
    `?source=commons|wiki`; the default is the `WIKI_IMAGE_SOURCE` env var (`commons`). An article whose title lacks
    the model counts as not found (free-text search once returned a person's article for "SCHMITZ S 01").
  - **Web**: with no photo, the hero slot shows a greyscale, blurred per-kind photo (`VehicleKindPlaceholder.tsx`)
    with the kind name and "No photo available"; special/undetermined reuse the specialized photo. Runtime-cached,
    not precached. `pnpm --filter scripts build:kind-images` (sharp) turns `assets-src/kind/*.jpg` into
    `public/kind/*.webp` (8.3 MB → 1.3 MB) — rerun after changing a source photo.

- **VIN decode overview + plate-card split ✅ DONE (2026-10-02)** — the VIN view is no longer a flat NHTSA key/value
  list; code in `apps/web/src/components/vin/`, pure logic (parsing, grouping, formatting) in `vin/helpers.ts` with
  tests in `helpers.test.ts`. No API or schema change — everything keys off NHTSA's stable English variable names.
  - **Tabs** (`VinDecodeTabs.tsx`): _Overview_ (default) | _Raw data_ (the old `VinDecodeFields` list, unfiltered).
    Used by the VIN page and by the plate card's VIN section.
  - **Overview**: decoder status chip/banner (Error Code 0 vs. not) · `VinSegments` (WMI/VDS/check digit/year/plant/serial,
    hover/tap explains each, year/make/plant filled from the decode; model-year letter resolved against NHTSA's
    `Model Year`) · headline · `VinCarSchematic` (top-down SVG: seats, drive axles, front/side/curtain/knee airbags,
    TPMS direct vs. indirect, doors; toggleable layers; seat rows inferred when the decode lacks them and says so) ·
    `VinMotorcycleSchematic` · `VinEngineCard` (cylinder glyph, hp/kW, gauges, GVWR class scale) · `VinOriginCard`
    (flag emoji, plant, map link) · `VinAssists` (ABS/ESC/… chips, standard vs. optional) · `VinDetails`.
  - **Which diagram**: `vehicleShape()` — car/MPV/truck → car plan, but only if the decode carries real equipment data
    (`hasCarSchematicData`); motorcycle → own diagram; bus/trailer/other → none.
  - **Details**: grouped (identity/body/engine/safety/manufacturing/other), plate-style Show/Hide toggles with "(N)",
    engine + safety open by default, "Not Applicable" and decoder bookkeeping rows always hidden in Overview, ❓ field
    explanations (`field-info.ts` → `vin.info.*`), click-to-copy values, tidied numbers (`146.4569…` → `146.5 cu in`).
  - **Plate card**: the old combined "Registration / VIN history" section is now two `VinToggleSection`s —
    _Registration history_ (plate + VIN timelines, `?section=history`) and _VIN decode_ (`?section=vin`, new share
    section). The VIN query runs when either is opened. On the VIN page the registry timeline is collapsed by default.
  - VIN card also shows the animated brand watermark; Favorites/History routes widened to `max-w-2xl` to match the card.
  - Strings in ua/ru/en. Raw-tab labels (NHTSA variable names) stay English for now.

- **Reviews & test drives follow-ups ✅ DONE (2026-10-03)** — on top of the infocar catalog (PLAN.md "Car reviews"):
  year-filtered owner-reviews link (`yearUrl`, `?y1=&y2=&sort=0`), version list over the year..year+1 window,
  much broader registry-model -> infocar-slug matching plus `infocarBrandSlug` (mercedes/ssang-yong/vaz aliases) in
  `packages/shared/src/infocarLookup.ts`; section ❓ info, 🔗 share (`?section=reviews`), infocar and DRIVE2 logos
  in `apps/web`; Auto-Blog dropped. Match-rate numbers and the hidden watermark experiment are in PLAN.md.

- **Regionless plates: legacy codes + DІ/ЕD series ✅ DONE (2026-10-03)** — scan of `current_registration` (16.7M rows)
  for plates `regionName` couldn't place: 68k `LLDDDDLL` with an unknown prefix (63k `DІ`, 4.3k `ОО`, 241 `ЕD`, 51 `ІІ`,
  ~20 noise), 1.3M legacy digits-first (`11АА1234`) and ~80k other shapes (6 digits, temporary/transit, junk).
  - `packages/shared/src/regions.ts`: `LEGACY_REGIONS` (numeric codes 01–27 → oblast, each checked against the
    modal `dep` of that code — 25 = Чернігів, 26 = Чернівці, not alphabetical; stray 34/50 stay unmapped). `regionName`
    falls back to it for the digits-first shape only; `platePrefixesForRegion` includes the codes (region search).
    `REGIONS` itself stays letters-only (`seed.ts` builds synthetic plates from its keys).
  - `PLATE_SERIES` + `plateSeries()`: `DІ` (Latin D + Cyrillic І) = re-registration via Diia, `ЕD` = via the MIA Driver's
    Cabinet (ГСЦ МВС, 2026-01-20; hsc.gov.ua blocks scrapers — details from search summaries). The letters encode the service
    channel, not a region. `ОО`/`ІІ` meaning unknown — they get the generic explanation.
  - `migrations/0022_legacy_plate_regions.sql` adds the 27 codes to `plate_regions` → `stats_by_region*` count the
    legacy plates after `pnpm db:refresh-stats` (~10 min on the full data). Known gap: odd shapes starting 01–27
    (`03ВZY191`) are counted by stats/search but show no region on the plate page.
  - `apps/web`: `lib/plate-region.ts` + `NoRegionBadge` (❓ `InfoPopover`: what Diia / Driver's Cabinet are, or the generic
    reasons — temporary/transit, foreign, data noise) on the result card and not-found panel; timeline and exports use
    `plateRegionLabel`. Strings `result.series.*` / `result.noRegion.*` in ua/ru/en. Changing nothing in the Zod
    schemas, so offline caches stay valid.

### Plate image recognition (camera/upload) — Plate Recognizer cloud ✅ DONE (2026-09-22)

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

### Own ALPR model — models, step 1 (single-shot OCR service), tiled detection, photo viewer ✅ DONE (2026-09-27 … 10-01)

Moved from PLAN.md's "Own ALPR model + AR overlay" (2026-10-05). Steps 2-4 (live detection, AR overlay, polish) and the
hard-image TODOs stay in PLAN.md.

**Models — researched and verified 2026-09-27 by actually building and
running the container, not assumed from memory.**
[ankandrew/fast-alpr](https://github.com/ankandrew/fast-alpr) (MIT) wraps
[open-image-models](https://github.com/ankandrew/open-image-models) (detector
`yolo-v9-t-384-license-plate-end2end`, MIT) and
[fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) (OCR
`cct-xs-v2-global-model`, MIT) — all ONNX Runtime, CPU-only (matches the
Phase 4 VPS's no-GPU sizing, see its "VPS sizing" table). An initial
Ultralytics/AGPL licensing worry (network-copyleft on a self-hosted service)
turned out **moot** — nothing in this chain touches Ultralytics code, it's a
clean MIT stack end to end. Ukraine's plate format (2 letters + 4 digits + 2
letters, only 12 fixed Latin-lookalike letters — `packages/shared/src/plate.ts`)
needs **no Cyrillic OCR and no custom training** for a first cut — a generic
global OCR model reads plain Latin/Roman characters directly into the
existing `repairOcrPlate`/`normalizePlate` pipeline unchanged. **Not yet
verified:** real-world accuracy against actual Ukrainian plate photos — only
tested so far against fast-alpr's own bundled sample image (US-style plate).
Do that before trusting accuracy, and before investing in steps 2-4.

**Step 1 — own-model OCR service, single-shot ✅ DONE (2026-09-27).** Ships
as an automatically-preferred alternative to the Plate Recognizer cloud call,
inside the _existing_ camera/upload flow — validates the model with zero AR
complexity in the same change.

- `services/alpr/` (new top-level dir, deliberately **outside** the pnpm
  workspace — it's Python, not in `pnpm-workspace.yaml`'s globs): `app.py`
  (FastAPI, `POST /recognize` + `GET /healthz`), `requirements.txt`
  (`fast-alpr[onnx]` — `[onnx]` is the CPU extra; `onnx-gpu`/`onnx-openvino`/
  `onnx-directml`/`onnx-qnn` exist if a future deploy target has different
  hardware), `warmup.py` (run once at Docker build time so the ~11 MB of ONNX
  weights bake into the image layer — the running container needs **no
  runtime network access**, matching the "always free, no external
  dependency" goal), `Dockerfile` (`python:3.12-slim` + `libgl1`/
  `libglib2.0-0`, which headless OpenCV needs even for CPU-only inference).
- `infra/docker-compose.alpr.yml` — a separate compose file from
  `docker-compose.yml` (Postgres only), so a dev who just wants the DB isn't
  forced to build the ML image. New root `package.json` scripts:
  `alpr:build` / `alpr:up` / `alpr:down`.
- `apps/api/src/recognize/local-recognize.service.ts` — same contract as
  `cloud-recognize.service.ts` (`recognize(image) => PlateRecognizeResponse`),
  POSTs to `${ALPR_LOCAL_URL}/recognize`, reuses `mapPlateReaderResults`
  unchanged — the Python service's `{results:[{plate,score}]}` response
  shape was deliberately built to match `PlateReaderResponse` exactly, so no
  mapping code needed duplicating. New `POST /api/recognize/plate/local`
  route on the existing `RecognizeController`, throttled looser than cloud
  (30/60s vs. 6/60s — no per-call cost to protect against here). New
  `ALPR_LOCAL_URL` in `env.ts` (optional; unset → 503, same
  inert-unless-configured pattern as `PLATE_RECOGNIZER_CLOUD_TOKEN`/
  `PIXABAY_API_KEY`). **Not added to `apps/api/.env.example`** — that file is
  in Claude's deny-list (unreadable/uneditable this session); add
  `ALPR_LOCAL_URL=http://localhost:8088` there by hand.
- Web: `recognizePlate()` (`apps/web/src/lib/api.ts`) calls only
  `/api/recognize/plate/local`. **Cloud fallback removed (2026-09-30)** — it
  originally fell back to `/cloud` on a 503/network error; now a down
  container just fails the call. The `/cloud` API route is kept but unused by
  the web app. No other web changes — `CameraCaptureDialog.tsx`/
  `use-plate-recognition.ts` are untouched.
- **Verified end-to-end 2026-09-27, for real, not just unit tests:**
  `pnpm alpr:build` was actually run — build log confirms real ONNX weights
  downloaded (`yolo-v9-t-384-license-plate-end2end`,
  `cct-xs-v2-global-model`), not placeholders. The built container was
  started (`pnpm alpr:up`) and hit directly with fast-alpr's own bundled
  sample plate image: `GET /healthz` → `200 {"status":"ok"}`,
  `POST /recognize` → `200 {"results":[{"plate":"5AU5341","score":0.999...}]}`
  — a correct detect+read. `local-recognize.service.test.ts` +
  `local-recognize.service.disabled.test.ts` (mocked fetch, mirroring the
  existing cloud test pair exactly) plus `pnpm type-check`/`pnpm lint` on
  every touched package all pass. **Not exercised:** a full running
  `apps/api` process calling the live container over HTTP end-to-end — the
  unit tests (NestJS-side mapping/error-handling) and the direct container
  test above (Python-side detection/OCR) already cover both halves of the
  chain independently, so this was judged sufficient for step 1; still worth
  doing once picking up step 2 or 3 for real confidence.

**Tiled detection (2026-09-30).** The 384px detector missed small plates in
wide photos (two plates ≈3.5% of frame width → ~13px after letterbox; only one
was read). `services/alpr/app.py` now runs the full frame plus overlapping
fixed-size 640px tiles (25% overlap, capped at 24 tiles by growing the tile;
frames ≥768px only) and merges duplicate boxes by overlap, keeping the most
confident detection. A first fraction-based 2×2 grid was too weak for plates
~1.5% of frame width (parking-lot photos). Web upload cap raised
1600→3200px / 0.9→2.5 MB (`lib/image.ts`; API limit is 4 MB) so tiles keep
real pixels. Exercised against the rebuilt container on the 88-photo eval set
(2026-10-01); `DSC_0098.JPG` still reads both plates.

**Photo viewer + limits hint (2026-09-30).** Uploaded-photo preview is now
`object-contain` (whole image, not a cropped strip) and opens a full-screen
`PhotoZoomDialog` (wheel zoom toward cursor, drag/arrow pan, `+`/`−`/`0`,
double-click, Esc; no pinch gesture yet). `SearchField` shows a
`recognize.photoTips` line (formats, the `MAX_DIMENSION` downscale, what
tends to be missed) and a 413 error key. Plate boxes are drawn on the
thumbnail and viewer (`PhotoPlateBoxes`, hideable in the viewer). **Not yet:**
rotating the photo, pinch-zoom on touch.

### Background layers ✅ DONE (2026-10-04; extended 2026-10-05)

header layers button on **every page** (hidden offline), session-only (`live-background-store`; routing never changes the
picked layer — click opens the panel, a press outside/Esc closes it). Modes: photos (default) · Google Maps embed (view captured when the
map is picked: the plate region's capital (`REGION_CENTERS`, zoom 13) on a result page, else all of Ukraine; picking it again re-pins) ·
three YouTube live-stream layers (`LIVE_STREAMS` / `DEFAULT_STREAMS` in `lib/live-background.ts`, one selector each, 480×270 player scaled up =
low quality): 🌍 earth (NASA ISS ×2) · 🚦 traffic (10 street/traffic-cam streams: Brazil, France, Taiwan, Spain, USA) · 🏙️ city (Taiwan).
**Poor-connection guard** (`usePoorConnection`, Network Information API, Chromium-only): on data-saver or ≤3G the stream buttons are
disabled with a hint and an active stream layer falls back to the photos, resuming by itself when the link improves. Lazy-loaded
(`LiveBackground`, `LayersPanel`). Advanced search also embeds an OSM view of the chosen region (`RegionMap`).
Researched dead ends: **live traffic** — Google/Waze switched it off in Ukraine (Waze works abroad, e.g. Warsaw, but
only congestion + reports, nothing moves); **moving vehicles** — travic.app, eway, lad.lviv.ua send
`X-Frame-Options` (not embeddable), city.dozor.tech is empty until a route is picked, citybus.in.ua is an app
landing page. Open: (a) Lviv publishes free GTFS-Realtime vehicle positions
(`track.ua-gis.com/gtfs/lviv/vehicle_position`, ~11 s; licence unchecked) — an API proxy + lazy Leaflet map would
give real moving public transport for Львів only; (b) YouTube streams can be retired or embed-blocked — swap ids in
`EARTH_STREAMS`.

### Car reviews, videos, owner stories, press, 3D & 360° ✅ MOSTLY DONE (2026-10-03 … 10-05)

Moved from PLAN.md's "Car reviews (text) then YouTube" (2026-10-05). Everything below is built and the data is committed as
`scripts/seed-data/*.csv.gz` (all loaded by `pnpm ingest:ratings:csv`). Remaining work (YouTube fallback for models with no
video — daily runs and lookup integration, motorcycles, browser/measurement checks) stays in PLAN.md.

| Source                                           | Table / migration         | Committed seed                | Lookup (`packages/shared`) | Rows                    |
| ------------------------------------------------ | ------------------------- | ----------------------------- | -------------------------- | ----------------------- |
| infocar.ua catalog (test drives + owner reviews) | `infocar_versions` · 0020 | `infocar-versions.csv.gz`     | `infocarLookup`            | 5,546                   |
| infocar.ua videos (YouTube ids)                  | `car_videos` · 0023, 0024 | `infocar-videos.csv.gz`       | `videoLookup`              | 3,739                   |
| e-drive.com.ua owner posts                       | `owner_posts` · 0025      | `edrive-posts.csv.gz`         | `ownerPostLookup`          | 62,598 (99 makes)       |
| Sketchfab 3D models                              | `car_models_3d` · 0026    | `sketchfab-models.csv.gz`     | `model3dLookup`            | 7.8k (1.1k make/models) |
| TopGear UK reviews                               | `topgear_reviews` · 0027  | `topgear-reviews.csv.gz`      | `topgearLookup`            | 1,032                   |
| CarShow360 360° galleries                        | `car_models_360` · 0028   | `carshow360-galleries.csv.gz` | `model360Lookup`           | 1,393                   |
| itc.ua + mezha.ua test drives                    | `press_reviews` · 0029    | `press-reviews.csv.gz`        | `pressLookup`              | ~310 articles           |

UI: one "Reviews, videos & owner stories" toggle in `ReviewLinks` with `SourceGroup` subsections (infocar.ua, ITC.ua, Mezha,
e-drive.com.ua, TopGear, other sites), each list 5 rows then "Show N more"; every source renders as the same hover row; videos
in their own 🎬 toggle (`VideoReviews`, `?section=videos`); 🧊 3D view / 🔄 360° view chips with lazy modals. Data is shown as
links + facts only (no scraped article text). Share/deep-link sections: `?section=reviews|videos|model3d`.

#### Step 0 — link-only helper (shipped 2026-10-03)

**Step 0 — shipped (2026-10-03): link-only helper, no fetching.**
`reviewLinks(brand, model)` in `packages/shared/src/reviewLinks.ts` returns each site's
own page/search (URL patterns opened and confirmed 2026-10-03): infocar
`/test-drive/<brand>/<model>/` + `/reviews/<brand>/<model>/` (brand page when the model
isn't a plain-Latin slug), auto-blog `/uk/?s=`, drive2 `/search?text=` tagged `ru`.
**Superseded by Step 1:** the infocar links now come from the crawled catalog, the UI block is live,
and the guessed infocar URLs described here were removed. avtoporadnyk (no working search) and nv.ua
(403, `/search` disallowed) are left out; drive2 model pages need a numeric id so can't
be built from a name. No year (no verified year/generation URL). Known gap: an infocar
model slug the registry text doesn't match is a dead link → curate a verified
(brand, model) list if common. Nothing is crawled or stored. UI: `ReviewLinks.tsx`, a collapsed "Reviews & test drives"
section in `ResultCard` (between photos and nearby services; `rel="noopener noreferrer
nofollow"`, "RU" chip on drive2). No share-button/`?section=` deep link yet. Per-model
direct paths (infocar `/test-drive/<brand>/…`, drive2 `/cars/<brand>/…`) are
deliberately not guessed — verify in a browser before adding any. autoarmor dropped.

#### Step 1 — infocar catalog ingest (shipped 2026-10-03)

**Step 1 — infocar catalog ingest (shipped 2026-10-03; match-rate measurement left)**

**Status (2026-10-03): shipped, except the match-rate measurement.** Built: migration `0020_infocar_versions.sql` +
Drizzle table; `scripts/src/infocar-parse.ts`, `infocar-robots.ts`, `infocar.ts` (+ tests on the saved pages in
`scripts/src/fixtures/infocar/` — raw windows-1251, `-text` in `.gitattributes`, prettier-ignored); `pnpm ingest:infocar
[-- --brand kia --limit N --dry-run --refresh]`, `ingest:infocar:csv` (also in `ingest:ratings:csv`),
`export:infocar:csv`; `infocarLookup` in `packages/shared`; `GET /api/reviews?brand=&model=&year=`
(`apps/api/src/reviews/`, `reviewsResponseSchema`); web: `reviewsQuery` + a `reviews` offline-cache group (cap 400),
`ReviewLinks.tsx` un-hidden in `ResultCard` (fetches when the section is opened) with `InfocarReviewRows.tsx`. The
guessed infocar URLs were removed from `reviewLinks` (the drive2 search remains; auto-blog was dropped later).

**First full crawl:** 153 brands (88 with test drives) → 5546 rows. Reviews: 1363 models / 1171 versions; test drives:
1152 models / 1860 versions; 1681 model rows have no version cards (they link to the model page); every version has a
year range; zero crawl failures. Committed `seed-data/infocar-versions.csv.gz` (85 KB).

**Follow-ups (2026-10-03, after the first crawl) — done:**

- Year-filtered owner-reviews link: `yearUrl` on `InfocarMatch` = model page + `?y1=<year>&y2=<year+1>&sort=0` (y2
  capped at the current year); only the reviews tree has the filter (test-drive pages ignore it). The version list
  now includes every version overlapping year..year+1, ones covering the year first.
- Model matching (`infocarLookup.ts`): punctuation squashed (`CEE'D` -> `ceed`), BMW trims -> `N-series`, Mercedes
  `E 200` -> `e-class` (`ML` -> `m-class`), leading-word / lone-word / shortened-factory-code matches, a few aliases
  (VW CC/Beetle/e-Golf, Pajero, Forte). `infocarBrandSlug` maps mercedes-benz->mercedes, ssangyong->ssang-yong,
  lada->vaz (used by the lookup and `ReviewsService`; before this Mercedes/ВАЗ/SsangYong never matched).
- **Match-rate measurement** (top 800 registry (brand, model) pairs, ~12.2M rows, owner-reviews tree, year 2013):
  brand-page-only fallbacks 856k -> 441k, unknown-brand 1.8M -> 351k. What is left is mostly not in the catalog
  (ЗАЗ/ГАЗ/DAF/Geely/Lifan/КАМАЗ variants, some Tesla/Audi/Volvo/Dodge models only in the other tree). Next lever if
  wanted: per-model aliases for the remaining high-volume misses; the throwaway eval script was deleted (dump
  `infocar_versions` + top pairs via `docker exec … psql` and run `infocarLookup` over them to redo it).
- UI: ❓ section info + 🔗 share button (`?section=reviews`, new `ShareSection`), infocar logo (`public/icons/infocar.png`)
  beside the Infocar labels, DRIVE2 logo (`public/icons/drive2.png`). A large faint infocar watermark behind the
  Infocar block was tried and **hidden on request** (left-aligned, 224px, 10% opacity) — re-add in `ReviewLinks.tsx`
  if wanted. Auto-Blog removed from `reviewLinks` (irrelevant search results); drive2 stays link-only.
- **Not verified end to end in a browser** — covered by unit tests (shared lookup, helpers, reviews service); open
  ВС6743РН (Kia Ceed 2012) and ВС4170МІ (BMW 328, 2013) and expand "Reviews & test drives" to confirm.

Facts found while parsing: the `/test-drive/` page lists only ~15 brands + a numeric-id `<select>`, so **brands come
from `reviews/marks.html`** (153) and each is tried in both trees (404 → skipped); marks has no Russian/Soviet section
markup — `is_ru` is the second alphabetical run (the list is sorted by display name, so slugs wobble: only a big
first-letter drop counts); version-card `title` attrs say "Отзывы про …" in both trees (copy-paste) — name/years are
read from the card's `<span>`s; a model with no carousel gets just its model row. **infocar never writes an open-ended
range** — a model still in production ends at the current year (max `year_to` 2026), so the lookup's
`null year_to = current year` rule is only a safety net.

Goal: crawl infocar's whole brand → model → version tree once and store, per version, the
name, year range and URL, so a car (brand, model, year) links to its exact generation page
(e.g. KIA CEED 2019 → "Ceed 2018–2021"). Facts + links only — no article text. Other sites
(avtoporadnyk, auto-blog, drive2, driver.top, nv.ua) come later as separate adapters.

Verified structure (2026-10-03, via browser screenshots + page fetches):

- `https://www.infocar.ua/test-drive/` — brand list ("Оберіть марку"/50+ brands).
- `https://www.infocar.ua/test-drive/<brand>/` — "Оберіть модель KIA": model links
  `/test-drive/<brand>/<model>/` (kia: avella … venga, 31 models).
- `https://www.infocar.ua/test-drive/<brand>/<model>/` — "Оберіть версію KIA Ceed": a
  carousel (arrows) of version cards: name ("Ceed", "Ceed GT", "Ceed SW", "ProCeed", …) +
  year range ("2018 - 2021") + link to a version page on a **per-model subdomain with a
  numeric id**: `//kia-ceed.infocar.ua/test_ceed_id5550.html` (protocol-relative `//`).
  Ceed has 17 versions. The same page also lists test-drive articles
  (`/test-drive/kia/ceed/<id>.html`), paginated `./page_2.html`…`page_7.html` — not needed
  for the catalog. Owner reviews live in a parallel tree `/reviews/<brand>/<model>/`
  (`//skoda-octavia.infocar.ua/review_octavia-a7_id5028.html`) — a possible second pass.
- Pages appeared windows-1251 in one fetch tool (garbled Cyrillic) — **check the response
  charset/headers and decode accordingly**; don't assume UTF-8.
- robots.txt: `Disallow` `/*?`, `/fav/`, `/search.html`, `/reviews/add/`, `/forum/`, `/account/`,
  `/new_export/`; `BUbiNG` fully blocked; no crawl-delay, no sitemap. Catalog paths are
  allowed. Fetch plain URLs only (no query strings), ≤1 req/s, honest User-Agent (no
  personal email in it), respect robots.txt at runtime.
- Volume estimate (unmeasured): ~50 brands + ~600 models ≈ 650 requests ≈ 11 min at 1 req/s.
  **Both trees below double that (~22 min), still one run.**
  **Second tree — owner reviews (same ingest, `tree = 'reviews'`)**, verified 2026-10-03:

- `https://www.infocar.ua/reviews/marks.html` — all brands, alphabetical, **with review
  counts** (Acura 37, Audi 312, Hyundai 914, Ford 906, …); sections "international" and
  "Russian/Soviet" (ВАЗ, ГАЗ, ЗАЗ, УАЗ …) — store both, tag the latter.
- `https://www.infocar.ua/reviews/<brand>/` — models with **review counts** and a brand
  average (KIA: 4.5★ from 858 reviews; Sportage 169, Ceed 123, Rio 102 …).
- `https://www.infocar.ua/reviews/<brand>/<model>/` — "Оберіть версію KIA Ceed": version
  cards **with their own year ranges that differ from the test-drive tree** (reviews: Ceed
  2018–2021, 2015–2018, 2012–2015, 2009–2012, 2006–2009, ProCeed 2019–2021, XCeed 2019–2022;
  test-drive tree has 17 versions incl. GT/SW). Version hrefs are on per-model subdomains
  (`//skoda-octavia.infocar.ua/review_octavia-a7_id5028.html` is a single review). **Not
  captured by the page fetcher — read the real version-card hrefs from raw HTML.**
- Same page: model average rating + review count, a list of reviews (title "KIA Ceed 2020",
  engine, gearbox, mileage, per-review rating, pagination `page_N`), and a **"Рік виготовлення
  від … до …" filter** (years 2007–2020 in the dropdown, sort "спочатку з фото") — a GET form
  whose real parameter names are **unverified** (read them from the form markup / DevTools).
  `robots.txt` disallows `/*?`, so **never crawl filter URLs**; but a plain link for a user
  to `…/reviews/kia/ceed/?<year params>` is fine and gives "reviews of this car's year" —
  build it only after the param names are confirmed, and keep the version-card link as the
  fallback (works without the filter).
- Store per model: `review_count`, `avg_rating` (facts, shown in the UI as "Ceed — 123
  reviews, 4.5★"). Do **not** store review text/authors (copyright, personal data).

Build:

1. `scripts/src/infocar.ts` (style of `euroncap.ts`/`kncap.ts`): `pnpm ingest:infocar`
   (crawl, cache raw HTML in `scripts/.data/infocar/`, `--refresh` to re-fetch, `--limit`/
   `--brand` for trial runs, `--dry-run`), `ingest:infocar:csv` / `export:infocar:csv`
   (committed gz CSV in `seed-data/`, like the ratings). Parsing as pure functions in a
   `scripts/src/infocar-parse.ts` with saved-HTML fixture tests (brand list, model list,
   version cards). Version cards: normalise `//` URLs to `https://`, parse "2018 - 2021" →
   `year_from`/`year_to` (open-ended/"н.в." ranges → null `year_to`; check how infocar writes
   current models).
2. Migration `NNNN_infocar_versions.sql`: `registry.infocar_versions` — `tree`
   (`test_drive`|`reviews`), `brand_slug`, `model_slug`, `model_name`, `version_name`,
   `year_from`, `year_to`, `url` (UNIQUE), `review_count` + `avg_rating` (model-level,
   reviews tree only, null otherwise), `fetched_at`. Index (brand_slug, model_slug, year_from). Add the CSV load to
   `ingest:ratings:csv`/`ingest:all`. Zod schema + types in `packages/shared`.
3. Lookup (pure, in `packages/shared`, tested): brand via `brandSlug`; model by slug match
   (registry model text is free-form: try full slug, then first token; infocar slugs like
   `enyaq-iv`, `ev6`); versions whose `year_from ≤ year ≤ year_to` (ranges overlap at the
   edges — return all); prefer the version whose name equals the registry model (`CEED SW`),
   else the plain one; fallbacks: model page → brand page → nothing. Never emit a URL not in
   the catalog (this is the dead-link fix for `reviewLinks`).
4. API `GET /api/reviews?brand=&model=&year=` (Zod, no logic in the controller, explicit
   `@Inject`) returns, per tree, the matching version link(s), the model link and the
   review count/avg rating; add to the persisted-cache rules in `lib/offline-cache.ts`.
   Then un-hide `ReviewLinks.tsx` in `ResultCard.tsx`: two infocar rows — test drive
   (version name + years) and owner reviews ("123 reviews, 4.5★", version link, plus the
   year-filtered link once its params are confirmed).
5. Measure after the first real run: brands/models/versions counts, and the match rate of
   registry (brand, model, year) top combos against the catalog; list the misses.

#### Step 2 — infocar videos: build notes (2026-10-03)

**Step 2 status (2026-10-03): built; full crawl not run yet.** Done: migration `0023_car_videos.sql` + `carVideos` table;
`scripts/src/infocar-video-parse.ts` (+ tests on `fixtures/infocar/video-kia.html`, `video-19231.html`);
`infocar-fetch.ts` (fetch/cache/robots helpers extracted from `infocar.ts`); `pnpm ingest:infocar:videos [-- --brand kia
--max-pages N --limit N --dry-run --refresh]` + `:csv`/`export:…:csv` (CSV `seed-data/infocar-videos.csv.gz` not yet
created). Findings: video pages expose the YouTube id (`iframe` embed) and the model via `link[rel=canonical]`
(`https://kia-stonic.infocar.ua/video19231_stonic_id7412.html`) — so even generic titles ("Готовий до будь-яких
завдань") get a model; year only from titles (rare). The RSS feed has just the latest 20 (incremental use only). Trial
run KIA page 1: 10/10 videos got id + model + date + duration. **API + UI done (same day):** `videoLookup` in `packages/shared` (model slug via `infocarLookup`'s candidates, plus
variant slugs like `superb-combi`; year-in-title first, then newest; max 6), `videos[]` on `GET /api/reviews`
(`ReviewsService` reads `car_videos`), `VideoReviews.tsx` under `ReviewLinks` in `ResultCard` (shares the reviews
query, hidden when empty, thumbnail → `youtube-nocookie` iframe only on click). Test data: 6 brands × 2 pages (119
videos) in the local DB. **Year filter:** the video page's canonical `…_id7347.html` is infocar's generation id = the catalog version page
`test_rav4_id7347.html` (RAV4 2026), stored as `car_videos.generation_id` (migration 0024); `videoLookup` maps it to the
generation's year range via the catalog rows, so a 2017 RAV4 gets 2015-2018 videos only. No generation in the catalog →
title year within ±3 of the car's year, or no title year, ranked after exact-generation videos. UI toggle now has ❓ info,
animated open, and plays in `YouTubeModal`. **Left:** full crawl (one request per listing page + per video, hours at 1 req/s — run
`ingest:infocar:videos`, then `export:infocar:videos:csv`), YouTube API enrichment (optional), add the CSV load to
`ingest:ratings:csv`, check the strip in a browser (e.g. a Skoda Superb or Toyota RAV4 plate). UI since merged: videos now sit in the single "Reviews, videos & owner stories" toggle under an infocar.ua heading (Step 2b).

_Update 2026-10-04: the full crawl ran — 153 brands, 3,739 videos; CSV committed; of the "Left" list above only the optional YouTube API enrichment and a browser check remain (see PLAN.md)._

#### Step 2 — infocar videos: verified sources and design (2026-10-03)

**Step 2 — infocar videos (YouTube channel + infocar's own `/video/` section), after Step 1**

Goal: videos linked to specific cars, with a relation to the infocar catalog from Step 1
(same brand/model/version rows). Channel: `youtube.com/@InfoCarUa` as given; infocar.ua links
`youtube.com/infocartv` / `/user/infocartv` — **confirm they are the same channel** (channel id
via `channels.list?forHandle=InfoCarUa` and `forUsername=infocartv`) before ingesting. The
YouTube page itself couldn't be read by the page fetcher (JS-rendered, returned only the
footer), so subscriber/video counts and title style are **unmeasured**.

Two complementary sources (verified 2026-10-03 on the infocar side):

- **infocar `/video/`** — videos are organised by **category** (`/video/test-drive/`,
  `/video/infocar/`, `/video/chtopochem/`, moto, pranks, crashes …) and by **brand**
  (`/video/<brand>/`, 100+ brands: volvo, toyota, porsche …); single video
  `/video/<id>.html` (e.g. `19259.html`); `/video/all/`; **RSS `/rss/video.php`**. This is
  infocar's own brand tagging, i.e. the car relation for free. Check whether a video page
  exposes the YouTube id (embed/`data-` attr/iframe `src`) — if so that's the join key.
  robots.txt does not disallow `/video/` (only `/*?`, forum, account … — re-read at runtime).
- **YouTube Data API v3** (needs `GOOGLE_API_KEY` — **already added to `apps/api/.env` by the
  user, 2026-10-03; free, no paid plan, 10,000 units/day quota; not yet tested against the
  API; make sure "YouTube Data API v3" is enabled in that Cloud project and the key is
  restricted to it**) — authoritative metadata for the channel:
  `channels.list` (1 unit) → uploads playlist id → `playlistItems.list`, 50 per page, 1 unit
  per page → `videos.list` for details, 1 unit per ≤50 ids. A whole channel of a few thousand
  videos costs on the order of 100-200 units — far below the 10,000/day default; `search.list`
  (100 units, ~100 searches/day) is **not needed** for a single channel. Store `youtube_id`
  (permanent) and refresh title/thumb/views at least every 30 days (YouTube ToS: non-authorized
  data ≤30 days); embed with the standard player/oEmbed; no HTML/transcript scraping.

Ordering: do the **infocar `/video/` + `/rss/video.php` pass first** (no key; brand/category/
article relation, YouTube id if exposed), then use the API only to fill in what that pass
lacks (duration, views, exact publish date, videos not on `/video/`). YouTube's own RSS
(`feeds/videos.xml?channel_id=UC…`, no key) only returns the latest ~15 — fine for
incremental refresh, not for the back catalogue.

#### Step 2b — e-drive owner posts (e-drive.com.ua)

**Built 2026-10-03; full crawl run 2026-10-04 (62,598 posts / 99 makes), CSV committed.** e-drive is a car-owner social
network (user logbook posts: repairs, service, accessories — not editorial reviews), shown as the "e-drive.com.ua"
subsection of the text reviews toggle (`ReviewLinks`: infocar.ua = test drives + owner reviews, e-drive.com.ua = owner
stories, other sites = search links; each list shows 5, then "Show N more"). Videos have their own sibling toggle
(`VideoReviews`, 🎬, ❓ + share `?section=videos`), split out 2026-10-04. Links + facts only
(title, category, cover URL, date) in `registry.owner_posts` (migration 0025); lookup = `ownerPostLookup` in
`packages/shared` (infocar's model-slug candidates; only the car's generation year range; newest first, max 30).

How the crawl works / known limits:

1. `pnpm db:up && pnpm db:migrate` (0025), then `pnpm ingest:edrive` — every make/model/generation, in the background
   (`[n/149] make: N post(s)` log lines). Estimate **~2.5–4 h cold** at the polite 1 req/s: measured Kia = 1,054
   posts in 4 min 13 s (~250 requests; Kia is a bigger-than-average make, estimate from 5 sampled makes). The site's
   own JSON API (`api.e-drive.com.ua/v1`: `cars/makes`, `cars/models?makeId=`, `cars/generations?modelId=`,
   `request/search?filter=posts&makeId=&modelId=&generationId=&lastId=<last createdAt>`; page size fixed at 10, `limit`
   ignored; robots.txt allows all). A make, then a model, with no posts is skipped before its generations are listed
   (most of the catalog) and a short page ends paging. Nothing is cached on disk, so a re-run costs the same; upserts by
   post id make it idempotent and interruption-safe. Optional first pass: `-- --brand toyota` / the top registry brands
2. Known limits: e-drive gives only a generation's **start year** (end = next generation's start − 1, last one open);
   the API exposes no per-post car/generation, so the crawl goes per generation; posts are owner anecdotes (some
   about the make generally) — label them as such, never as reviews. Periodic refresh = re-run (new posts only matter
   for recent generations; a `--since` shortcut could page only until the first already-known `createdAt`).
3. Logos in `public/icons/` (`edrive.png`, new `infocar.png`) shown by `SourceGroup`.

_Still open: measure posts per brand / share of registry (brand, model) pairs with ≥1 post, and a browser check (a Kia Ceed II plate shows only 2012-2017 posts)._

#### Step 2c — TopGear UK editorial reviews (built 2026-10-05)

**Step 2c — TopGear UK editorial reviews (topgear.com/car-reviews): planned 2026-10-03, built 2026-10-05 (steps 1–7 done; text-only, no video; step 8 measure + browser check still open).** Shipped: `scripts/src/topgear*.ts`, migration `0027_topgear_reviews.sql`, `topgearLookup` (shared), `topgear[]` on `/api/reviews`, `TopgearReviews` UI group after e-drive, committed `seed-data/topgear-reviews.csv.gz`. Measured on the real run: sitemap yields **1,073 model pages / 111 makes** after dropping `first-drive-N`/`report-N` article series (not 1,607); 1,032 reviews, 1,016 scored; 731 matched a catalog brand before `MAKE_ALIASES` (mercedes-benz, mg-motor-uk, vauxhall, gwm), the remaining unmatched makes are absent from infocar. topgear.com's CDN 403s the `(+https://carsua.app)` UA suffix — the fetcher sends plain `carsua.app-ingest/1.0`. Original plan below.
verdict + score per model, shown as a "TopGear (EN)" subsection of `ReviewLinks` next to infocar/e-drive. Links + facts
only (title, score, date, blurb, url) — never republish review text beyond the meta description.
**Findings (measured 2026-10-03):**

- robots.txt allows `/car-reviews/` (disallows only `/search*`, `/tags*`, `/taxonomy*`, `/node*`, `/mantis*`,
  `/api/search/*`). Plain HTTP + any UA gets 200, server-rendered; no JS/API reverse-engineering. 340–400 KB/page,
  ~0.7–1.3 s each.
- Sitemap `https://www.topgear.com/sitemap.xml?page=1..N` (Drupal simple_sitemap, ~12 pages) lists 4,141 `/car-reviews/`
  URLs: **1,607 model pages** (`/car-reviews/<make>/<model>`, 193 makes) + variant pages (`first-drive`, `2dr`, `spec`…)
  - the four section subpages (`/buying`, `/driving`, `/interior`, `/specs`). The **model page alone** has JSON-LD with
    `Review` + `Rating` (`ratingValue` of `bestRating` 10 — note it is a string `"6"` on some pages, a number on others, and
    `bestRating` too), `datePublished`, `Car`/`Brand`, plus `meta description` (blurb). Subpages add nothing we need.
- Some model slugs carry a generation year range (`sportage-2017-2021`, `niro-2017-2022`, `e-niro-2018-2022`),
  most don't (`ceed`, `ceed-sportswagon`, `octavia`); `-0`/`-1` suffixes are duplicate-slug generations (`sorento-0`,
  `proceed-0`) — the `datePublished` year is the fallback generation anchor.
- **Videos are unconfirmed.** Static HTML has no YouTube ids; the player is Brightcove (3 mentions per page), and
  `bmw/m3` had no video markup at all. Brightcove embeds need TopGear's account/player id and may be domain-restricted.
- **AutoTrader UK (`autotrader.co.uk/cars/reviews?make=Kia&model=Cee%27d`) is not crawlable** — every request incl.
  `robots.txt` hits a Cloudflare managed challenge. Do **not** work around it; search link only.

**Status 2026-10-05 — items 1–7 below are done** (text-only, no Brightcove video: the `video_ref` column was dropped). Differences from the
plan as written: migration is `0027` (`0026` went to `car_models_3d`); the sitemap has **1,073 model pages / 111 makes** (`first-drive-N`,
`report-N` and section slugs are filtered), so a cold run is ~20–25 min, not 35–55; the fetcher's UA omits the `(+https://carsua.app)`
suffix because topgear.com's CDN 403s it; `parseRobots` now merges repeated `User-agent: *` groups (topgear.com repeats it per rule);
TopGear makes map to infocar brand slugs via `MAKE_ALIASES` in `topgear.ts` (mercedes-benz, mg-motor-uk, vauxhall, gwm). Result: 1,032
reviews, 1,016 scored; makes absent from infocar (Ferrari, Lotus, McLaren …) can't surface. UI: "TopGear" group + EN badge after e-drive in
`ReviewLinks`; the About page now also lists infocar.ua, e-drive.com.ua, TopGear, Sketchfab, Google Maps and YouTube.
**Still open:** item 8 (coverage numbers + browser check of a Kia Sportage / BMW X5 / Mercedes plate); AutoTrader UK search link (item 7, not
added); an optional "search YouTube for this car" link in the Video reviews section (requested 2026-10-05, scope unconfirmed).

9. Known limits to document: TopGear has no per-year pages (coarse generation matching); UK-market models only; scores
   are TopGear's /10 — label the source clearly; periodic refresh = re-run (new reviews are rare, the sitemap `lastmod`
   could drive a `--since` shortcut).

#### Step 2d — itc.ua / mezha.ua test drives (built 2026-10-05)

**Step 2d — Ukrainian tech-press test drives (itc.ua, mezha.ua): researched + built 2026-10-05.** Shipped: `scripts/src/press*.ts`, migration `0029_press_reviews.sql`, `pressLookup` (shared), `press[]` on `/api/reviews`, `PressReviews` UI groups (ITC.ua, Mezha) right after infocar, committed `seed-data/press-reviews.csv.gz`. Findings: neither site has a structured make/model, so the **brand is found in the titles/tags** (`findBrandSlug` against the infocar catalog's brand slugs) and the **model is matched at lookup** (infocar's model-slug candidates must spell a run of ≤4 title/tag tokens, `CR-V` = `crv`; 1–2 character models must follow the brand). No year field: `year_hint` = a model year named in a title, else the publication year; articles >10 years from the car's year are dropped, the rest ranked by distance. Seeds are the Ukrainian "test drive" tag listings (itc `/ua/tag/test-drayv-ua/page/N/`, 50 cards/page incl. sidebars → only `tag-test-drayv-ua` cards counted; mezha `/tag/test-drayv/?page=N`, 20/page, articles under both `/articles/` and `/reviews/`), paged until a page adds nothing. Each article's hreflang alternates give the other editions (itc uk+ru, mezha uk+en), fetched too and stored in a `langs` jsonb. robots.txt: itc disallows `*/?page*` (we use `/page/N/`, allowed), mezha allows all of this. Not crawled: the broader `/ua/avto-ua/` and `/tag/avto/` feeds (news, not reviews) and ru-only itc articles without a Ukrainian edition. Facts + links only — article text is never stored. UI polish shipped with it: every review source (infocar, ITC.ua, Mezha, e-drive, TopGear) renders as the same hover row (highlight, underlined label, trailing ↗), and infocar links gained a fixed one-line description (version / model / brand / year-filter; infocar only yields links, years and counts, so no scraped text). Unverified in a browser at the time of writing — still to check: row layout, logos, UA/RU/EN chips.

#### Step 2e — CarShow360 360° galleries (built 2026-10-05)

**Step 2d — CarShow360 360° galleries (carshow360.net): researched + built 2026-10-05.** "🔄 360° view" chip + modal next to "🧊 3D view" on result cards. Shipped: `scripts/src/carshow360*.ts`, migration `0028_car_models_360.sql`, `model360Lookup` (shared, same infocar model-slug candidates as 3D), `/api/models360`, `Model360Button`/`Model360Modal`, committed `seed-data/carshow360-galleries.csv.gz` (1,393 galleries / 471 make/models), About-page source. Findings: robots.txt allows crawling, but uncached gallery pages are slow (~15 s) and the origin answered 500/522/524 under light load — so the base ingest reads only the gzipped sitemap (`csSitemapGalleries360_1.xml`; 8 language variants collapse onto the numeric id) and never crawls pages; the generation text ("III FL2021 Hatchback") is derived from the URL slug. Embed = `https://carshow360.net/{uk|ru|en}/{brand}/{model}/{slug}-{id}?iframe` (`interior=&` for the cabin; the slug is optional — the id alone resolves). The modal lists every gallery of the make/model as a chip (facelift year, then newest id first), opens on **Interior** by default, has an Exterior/Interior toggle and its own full-screen button; both 3D and 360° modals are `max-w-5xl` with viewport-height viewers, and both chips are disabled offline. Optional `--enrich` fetches page titles (5 s apart, exponential back-off, stops after 10 consecutive failures); every failed request is logged to `scripts/.data/carshow360/failed.json` and `--retry-failed` re-runs only those ids. **Still open:** no browser check of the modal yet (embed headers/ToS unchecked — consider asking carshow360 for permission); galleries without an interior view are untested; `--enrich` not run.

#### Step 2f — Sketchfab 3D models (built 2026-10-05)

Sketchfab Data API search per infocar make/model (`pnpm ingest:sketchfab`, anonymous, 1 req/s, JSON cached in `scripts/.data/sketchfab/`,
back-off on 429, optional `SKETCHFAB_TOKEN` in `apps/api/.env`) → `registry.car_models_3d` (7.8k embeddable models, 1.1k make/models; facts + links
only). `GET /api/models3d` (`model3dLookup`, year-agnostic, most-liked first). UI: "🧊 3D view (N)" chip + lazy modal — Sketchfab embed, prev/next,
thumbnail strip, author/licence credit, share link `?section=model3d&tab=<uid>`; chips share one wrapping row; disabled offline. Needs
`ingest:infocar(:csv)` first. Committed 2026-10-05 (9c5fa26).

#### Superseded design

The generic design written first (one `registry.car_reviews` table + a registry-wide matcher + per-source adapters + `seed-data/generations.csv`)
was **not built**: each source got its own small table and lookup instead (table above), reusing infocar's model-slug candidates for matching.
drive2.ru stays link-only (robots.txt blocks our crawler — never bypass); nv.ua is bot-walled; auto-blog dropped (irrelevant results).

### Fuel economy & emissions — sources, design and refresh cadence (built 2026-10-02)

Moved from PLAN.md; the shipped summary and the tuning TODOs stay there ("Fuel economy & emissions").

Sources (all free, no key; licence terms not re-verified — check before building):

- **fueleconomy.gov** (US DOE/EPA) — first, easiest. `vehicles.csv.zip` bulk download (also `/ws/rest/` JSON/XML).
  1984+, MPG city/hwy/comb, CO2 g/mi, fuel type, EV range + kWh/100mi, GHG/smog score. Public domain. EPA test
  cycle (reads lower than WLTP). Many UA cars are US imports. Key columns: `make`, `model`, `year`, `comb08`,
  `co2TailpipeGpm`, `fuelType1`, `displ`, `cylinders`, `atvType`.
- **EEA CO2 monitoring of new passenger cars** (data.europa.eu / EEA Datahub) — EU-origin cars. Per-registration
  yearly CSVs (large): make, model, variant, engine cc/kW, fuel, CO2 g/km (NEDC → WLTP), consumption on newer
  years. Aggregate to make/model/year/engine/fuel at load time, don't store raw rows.
- **NRCan Fuel Consumption Ratings** (open.canada.ca) — CSV 1995+, already L/100km; fallback for N. American models.
- Optional/later: UK VCA car fuel data (open CSV); Spritmonitor.de (real-world consumption, no API → scraping,
  check ToS). Skip commercial APIs (CarAPI, Auto.dev, API Ninjas: paid or non-commercial free tiers — see the
  "no free RIA-alternative" survey in the parked section).

Design (follow the NCAP pattern — `scripts/src/euroncap.ts` + committed gz CSV in `scripts/seed-data/`):

- Tables `registry.fuel_economy_*` (or one `fuel_economy` table with a `source` column): make/model/year range,
  engine cc, fuel type, `co2_g_km` (**normalize EPA g/mi ÷ 1.609 on load**), `l_100km`, `cycle` (`EPA`|`NEDC`|`WLTP`),
  `source`. Never mix cycles unlabeled — show the cycle next to the number.
- `scripts/src/fuel-economy.ts` + `ingest:fuel:csv` / `export:fuel:csv`, wired into `ingest:ratings:csv`.
  Raw bulk downloads cached in `scripts/.data/` (gitignored); only the aggregated CSV is committed.
- **Matching** registry row → reference row: fuzzy on normalized make + model + year + fuel + engine capacity
  (reuse the NCAP model-name normalization/aliases; registry `fuel` is free text — do the "Fuel-type icons"
  distinct-values research below first, the mapping is shared). Return a **range** when several trims match
  ("6.5-7.2 L/100km"), and say "similar vehicles", never claim an exact match. Measure the real match rate
  on the full dataset before building UI.
- **Refresh cadence — manual/annual, not scheduled.** All sources are bulk files that change rarely, so no
  cron, no live API calls from the app, and no scraping in the request path:
  - fueleconomy.gov: DOE republishes `vehicles.csv.zip` as new model years are certified (several times a year,
    mostly Q4-Q1). Re-run ~**2x/year** (e.g. Jan + Jul) or when a new model year appears; cheap — one ~10 MB zip.
  - EEA: one release per reporting year, final data lands roughly **once a year** (provisional ~mid-year, final
    ~autumn/winter). Re-run **annually** when a new year file is published.
  - NRCan: one new file per model year, **annually** (~autumn).
  - Spritmonitor (if ever added): scraping, so on demand only, rate-limited, never scheduled.
  - Fetch via the script's own download (CSV, cached in `scripts/.data/`), then `export:fuel:csv` → commit the
    aggregated gz CSV. Prod loads the committed CSV (`ingest:fuel:csv`, seconds) — same as the NCAP tables, which
    also have no scheduler. Store the source file's `last_modified`/release year in the table (or a small
    `ingested_resources`-style row) so the script can say "already current" and skip. If a VPS exists (Phase 4),
    optionally a monthly job that only _checks_ for a newer release and notifies, never auto-overwrites.
- **Score (0-100):** linear on CO2 g/km, clamped — e.g. 0 g/km → 0, ≥ ~300 g/km → 100 (constants in
  `packages/shared`, `CONSTANT_CASE`, tune against the real distribution of matched rows). Pure EV → 0 (tailpipe
  only; label as "tailpipe"). Bands for the icon colour: green/yellow/orange/red. Hybrids/PHEVs: use the
  rated combined CO2, note the caveat. Score and colour thresholds live in shared, with unit tests.
- API: add fields to the plate/VIN response (Zod schema in `packages/shared` — note this discards users' saved
  offline data) or a separate `/api/fuel/:...` query added to `lib/offline-cache.ts` persisted rules (small, cache it).
- UI: new `CO2Badge` component (default export, ref-as-prop, hook for logic), i18n keys ua/ru/en, tooltip
  explaining source + test cycle + "estimate for similar vehicles". Hide entirely when no match.

First steps when picked up: download `vehicles.csv.zip`, run the match-rate check against the real registry
(make/model/year/fuel/engine), then migration + shared Zod schema + ingest script with a fixture test; add EEA
second, only if the US-only match rate leaves too many EU cars uncovered.

### "To discuss / research" items that were resolved (moved from PLAN.md 2026-10-05)

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
- **Vehicle-kind icons ✅ DONE (2026-09-24)** — see Phase 1.5 "Vehicle-kind
  icon (animated, colored) + brand logo" above.

### Wikimedia hero-image cache in Postgres + pre-warm ✅ BUILT (2026-10-03 … 10-05)

Moved from PLAN.md 2026-10-05 (commits `6d8a444`, `48d0b44`, `2ce88a8`); steps 6-7 and the hero endpoint added 2026-10-06. Open items (coverage-script grouping, ideas not done) stay in PLAN.md.

**Status.** Built: migration `0030_wiki_image`, DB-backed `WikiService` with retry/backoff and the never-cache-errors
rule, `scripts/src/wiki-images.ts` (+ `failed.json`, `--retry-failed`, `--retry-not-found`, CSV,
`wiki-images:coverage`). **Runbook steps 1-4 are done (2026-10-05)** on the ≥1000-car tier (1,385 models): 1,014 models
with a photo / 370 not_found / 1 failed (chrysler gr.voyager, 400 `cirrussearch-too-busy-error`; the retry resolved it as
not_found; no 429s). The lead-image fallback now also tries the brand's home-country Wikipedia, then Ukrainian
(`leadLanguages()` in `packages/shared/src/wikimedia.ts`; `--retry-not-found` re-ran the 370): **+73 models → 1,093
with a photo, 298 not_found** (mostly VAZ/UAZ numeric codes, Chinese codes, spellings like "bmw 118 i" — no article
exists under that name). Table: 26,703 rows (14,281 ok / 12,422 not_found). Coverage: **59.4% of all registered cars have
a photo** (64.6% in the ≥1000 tier; the 100-999 and <100 tiers are not processed yet). Seed CSV re-exported
(`scripts/seed-data/wiki-images.csv.gz`, 652 KB). **Step 5 done (2026-10-05, ≥100-car tier, `--rps 2`, ~2 h, no
429s):** 2,616 more models → 1,739 with a photo / 876 not_found / 1 failed (a VAZ-like "уаз 3741" search timeout; the
`--retry-failed` replay resolved it as not_found). Running totals over both tiers (4,007 models): **2,832 with a photo /
1,175 not_found / 0 failed** (before step 5: 1,093 / 298 / 0 over 1,391). Table: 58,023 rows (25,851 ok / 32,172
not_found); CSV re-exported (1.2 MB). Coverage by registered cars: ≥1000 tier 64.6% photo; 100-999 tier 44.2% photo
(11.4% not_found, 44.5% still shown as "not processed" — unexplained after a full ≥100 run; check the coverage
script's grouping before step 6); <100 tier 0%; **ALL 62.3% of cars have a photo**
(was 59.4%). (Step 6 was then run — see "Steps 6-7 done" below.) The "stages" 1-3 (title search →
batched imageinfo → lead fallback over several languages) happen _inside every run_, per chunk of 20 models; they are not
separate runs. Ideas not done: search by normalized name for odd spellings ("118 i" → "118i"); non-Latin article titles
(zh/ja/ko) are mostly rejected by the "title mentions the model" guard.

**Steps 6-7 done (2026-10-06).** Step 6 (`pnpm ingest:wiki-images -- --min-cars 1`) resumed after the 2026-10-05 stop and ran
the remaining 5,504 models in ~3.3 h (~21 models/min, no 429s): 2,143 with a photo / 3,360 not_found / 1 failed. Step 7:
`--retry-failed` replayed the 10 pending failures (9 older + 1 new; transient `cirrussearch` 400s and a timeout) → 4 photo /
6 not_found / 0 failed; then `wiki-images:coverage` and `export:wiki-images:csv` (**112,398 rows, 2.0 MB**). **ALL 62.8% of
registered cars have a photo** (≥1000 tier 64.6%, 100-999 tier 44.2%, <100 tier 30.3%); table by status: 72,067 not_found,
ok = 4,092 commons_model + 11,604 commons_nearest + 20,563 commons_year + 4,072 lead. The coverage script still reports 33.0%
of cars as "not processed" although every model with a car was run — a grouping mismatch in the script (open in PLAN.md).

**Photo-only hero endpoint + lazy article text (2026-10-06).** Bug fixed: `GET /api/wiki` fetched the live article first and
only resolved the stored photo when an article matched `titleMentionsModel`, so models with a stored Commons photo but no
article (e.g. MERCEDES-MAYBACH S 580 2025) showed no photo, and every card waited on a live Wikipedia request.

- **API:** new `GET /api/wiki/image?brand&model&year[&source]` → `WikiService.lookupImage` (`{ image }` only): stored
  `(brand, model, year)` row → stored `(brand, model)` row → live Commons/Wikipedia lookup that is then stored. No article fetch,
  no title guard; own 300-entry in-process cache; never memoizes a failed lookup. `GET /api/wiki` is unchanged (article text).
  Shared: `wikiImageResponseSchema` / `WikiImageResponse`.
- **Web:** `use-car-wiki-actions.ts` is replaced by `use-car-hero-image-actions.ts` (`useCarHeroImageActions`: photo query
  `wikiImageQuery` + the ambient-background override; the override's `sourceUrl` is now `null`, the credit line is kept).
  `WikiHeroImage` uses it and still falls back to the per-kind placeholder when no photo exists. `CarWikiInfo` now takes
  `brand/model/year` and runs `wikiInfoQuery` only once the section is open (`enabled: hasQuery && open`; a `?section=wiki`
  deep link opens it, so it fetches immediately); the trigger is disabled only while fetching. "Copy all" still pulls the text
  via `ensureQueryData`. Query key `['wiki', 'image', …]` falls in the existing offline `wiki` group.
- Tests: 3 new `WikiService.lookupImage` cases (stored photo with zero fetches, live fallback + store, null/empty query).

**Runbook — what to execute, in order** (local dev stack: `pnpm db:up`, real registry loaded; run from the repo root)

| #   | Command                                                                      | Covers                                 | Est. time (1 req/s / 2 req/s)               |
| --- | ---------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| 1   | `pnpm ingest:wiki-images`                                                    | start tier: models ≥1000 cars (~1,400) | done (~35 min at 1 req/s)                   |
| 2   | `pnpm wiki-images:coverage`                                                  | check: % of cars with a photo, by tier | seconds (+ ~1 min registry scan)            |
| 3   | `pnpm ingest:wiki-images -- --retry-failed`                                  | replay everything in `failed.json`     | minutes                                     |
| 4   | `pnpm export:wiki-images:csv`, commit `scripts/seed-data/wiki-images.csv.gz` | seed for fresh clones                  | seconds                                     |
| 5   | `pnpm ingest:wiki-images -- --min-cars 100`                                  | next tier: models ≥100 cars (~4,000)   | ~1-1.5 h / ~45 min                          |
| 6   | `pnpm ingest:wiki-images -- --min-cars 1`                                    | everything left (~15.7k models in all) | ~5 h more / ~2.5 h                          |
| 7   | repeat 2-4 (+ `--retry-not-found` after a new language is added)             | re-check, retry failures, re-export    | minutes — **once, after the last tier run** |

Notes for the runs: every run is resumable (done models are skipped) and Ctrl-C stops after the current chunk, so 5-6
can be split into sessions of ~1 h with `--limit 800` or by brand (`--brand kia`). Models stored `failed` are skipped
by normal runs — only `--retry-failed` (add `--all` to ignore the wait) retries them; the list is
`scripts/.data/wiki-images/failed.json`. Use `--rps 2` (the cap) once a first run shows no 429s. Steps 1-4 are enough to
ship; 5-6 are worth it only if the coverage report shows the ≥100 tier is missing many cars (the tail mostly returns
`not_found`, and any lookup caches itself on first open). Cached search responses live in `scripts/.data/wiki-images/`
(gitignored, kept on purpose; `--refresh` ignores them).

Built as designed below, with these differences: `year` is `smallint`, **0 = the model-level row**; `origin` has four
values (`commons_year | commons_nearest | commons_model | lead`) — `commons_model` is the newest-year photo, `lead` is
only used when Commons gave the model nothing; nearest-year borrowing is capped at 4 years; a failed request never
overwrites an `ok` row; Commons rules + request shapes + retry policy are shared in `packages/shared`
(`commonsImage.ts`, `wikimedia.ts`); `source=wiki` (A/B knob) bypasses the table.

#### Original plan (planned 2026-10-03)

Scope: **the hero photo only** (url, size, attribution) — not the Wikipedia text. The extract keeps its live lookup
via `WikiService` for now; if it later needs caching it becomes a separate table/feature (text is language-specific,
the image is not). Goal: the plate/VIN result gets its car photo from our own DB — no Wikimedia call on the hot path,
no 429/5xx surfacing to users.

Why: `WikiService` (`apps/api/src/wiki/wiki.service.ts`) caches in a 300-entry in-memory map, lost on restart. A cold
image lookup is up to 3 Wikimedia calls (Commons year search, article lead image, attribution); any non-OK answer is a
502 with no retry, and 429s happen in practice.

**Decisions**

- Persist **image metadata only** (url, width, height, author, license, license url). Files stay hotlinked from
  `upload.wikimedia.org` at the standard 1280px thumb — **not downloaded/rehosted** (same "media stays linked" rule as
  Euro NCAP; thumbs are CDN-served, the slowness is the API round trips). A self-hosted thumbnail cache is a Phase 4
  (VPS) option, not now.
- **Language-free**: Commons search never depended on `lang`; the lead-image fallback is taken from the English article
  only. One row serves ua/ru/en.
- Scope: passenger cars only (`kind ILIKE '%легков%'`). IMCDb rejected as a source (movie screenshots, studio
  copyright, Cloudflare bot challenge, no API).

**Schema** — migration `registry.wiki_image`

- Key `(brand, model, year)` normalized lowercase; `year` empty for the model-level fallback row (lead image).
- Payload: `image_url`, `image_width`, `image_height`, `attr_author`, `attr_license`, `attr_license_url`, `source`
  (`commons_year | lead`), `title` (Commons file or article, for debugging).
- Status: `status` `ok | not_found | failed`, `last_http_status`, `last_error`, `attempts`, `next_retry_at`, `updated_at`.
- `not_found` = a **200 with no qualifying image** (Wikimedia answers 200, never 404) → TTL ~30 days, then one fresh
  attempt. `failed` = retries exhausted (429/5xx/timeout) or a non-retryable 4xx → never shown as "no photo".

**Service behaviour** (`wiki.service.ts` image path)

- Order: `(brand, model, year)` row → `(brand, model)` lead row → live fetch (writes the row). The in-memory map stays
  as a hot layer in front. A missing image falls back to the per-kind placeholder as today.
- Retry only 429, 5xx, network timeouts; max 3 attempts, exponential backoff + jitter, honor `Retry-After` (cap ~30 s).
  Other 4xx (400/403) fail immediately and are logged (User-Agent / code problem, would not self-heal).
- On final failure: store `failed` (`next_retry_at`: 1 h → 6 h → 1 d; 7 d for non-retryable 4xx), serve a stale `ok`
  row if one exists, else no image (not a 502 — the photo is decoration). Never store an error as `not_found`.
- Check the User-Agent: Wikimedia wants a real contact URL/email; `PUBLIC_SITE_URL` is localhost in dev and may be
  throttled harder.

**Pre-warm script** — `scripts/src/wiki-images.ts`, patterned on `ingest:infocar`

- `pnpm ingest:wiki-images` — top brand/model/year groups from `registry.current_registration`; options `--min-cars N`
  (default 1000), `--limit N`, `--dry-run`, `--refresh`, `--rps` (default 1, max 2). Resumable (skips existing
  `ok`/`not_found` rows), slows and pauses on repeated 429, ends with a summary
  ("ok · not_found · failed 429×N, timeout×N"). Commons year search returns thumbnail + license in one request, so
  attribution costs nothing extra on that path.
- `pnpm ingest:wiki-images -- --retry-failed` — only `failed` rows past `next_retry_at`; `--retry-failed --all`
  ignores the wait.
- **Every failed request is listed, per stage** (like carshow360's `failed.json`): `scripts/.data/wiki-images/failed.json`
  gets one entry per request that ended in 429/5xx/timeout/other 4xx — `{ stage (search|imageinfo|lead), brand, model,
titles[] (stage 2 batch), http_status, error, attempts, at }` — written as it happens, so a killed run keeps the list.
  The end-of-run summary prints the count by status and stage plus the path. `--retry-failed` replays exactly that list
  (a stage-2 batch is retried as its titles, not re-searched); entries that succeed are removed, the rest stay. Gives
  the same picture as the `failed` DB rows but as a plain file you can read, diff and re-run without touching the DB.
- `pnpm ingest:wiki-images:csv` / `pnpm export:wiki-images:csv` — committed gzipped CSV in `seed-data/`, `ok` +
  `not_found` rows only (`failed` is environment noise, stays local). Add to `ingest:ratings:csv` / `ingest:all`;
  update CLAUDE.md commands.
- `pnpm wiki-images:coverage` — rows with/without image by status and tier, plus weighted by cars (share of the 24.7M
  registered cars that get a photo). Replaces ad-hoc SQL.

**Sizing — naive per-year search; superseded by the batching section below** (real registry, 24.7M rows, passenger
cars; measured 2026-10-03; 1 request ≈ 1 row of work)

Requests = one Commons search per brand/model/year group + one English lead-image lookup per model (+ ~1 attribution
lookup per lead image, ~1 in 10 models).

| Tier                                         | Groups / models | Requests | At 1 req/s              |
| -------------------------------------------- | --------------- | -------- | ----------------------- |
| Start: groups ≥1000 cars + models ≥1000 cars | 2,953 / 1,391   | ~5,700   | ~1.6 h                  |
| Groups ≥100 cars + models ≥100 cars          | 14,803 / 4,008  | ~19,200  | ~5.3 h                  |
| Everything                                   | 97,135 / 15,769 | ~129,000 | ~36 h (18 h at 2 req/s) |

Tiers 1-2 are worth running; the long tail is mostly rare/garbled spellings that come back `not_found` — skip it, a
user lookup caches itself on first open. Cap at 2 req/s. Rows are well under 1 KB → a few MB in the DB, ≤1 MB gzipped.

**Batching — probed against the live Commons API (2026-10-03), use this instead of one search per year**

The MediaWiki API cannot batch several _searches_ in one call, but it batches everything after the search:

1. **One search per model, not per year** — `list=search` (`srsearch="Kia Ceed" filetype:bitmap`, `srnamespace=6`,
   `srlimit=500`) returns titles only (cheap). Probe: "Kia Ceed" → 195 hits in one response, no continuation;
   141 titles carry a standalone year (2018×39, 2021×19, 2025×17, 2012×2, 2013×1 …). Pick the year match locally with
   the existing `pickCommonsCandidate` rules. Models with >500 hits need `sroffset` paging or a narrower query.
2. **Batched imageinfo for the chosen files** — `titles=File:A|File:B|…` (up to 50 per request, across any models)
   with `iiprop=url|size|mime|extmetadata&iiurlwidth=1280`. Probe: 50 titles → 50 thumbnails + 50 licenses, one request,
   no warnings. (`generator=search` + `prop=imageinfo` is NOT the way: imageinfo with thumbs is capped per request and
   returns an `iicontinue`.)
3. **Lead-image fallback only where Commons gave nothing** for the model (English `generator=search` + `pageimages`).

Side benefit: with every file title for a model in hand, a missing year can fall back to the **nearest year** (the Ceed
has photos for 2012-2013 but none for 2011/2017) with no extra requests — better than per-year search, which returns
nothing for a gap year. Seen in the probe: Commons spells it `Kia cee'd` / `Ceed` / `Сee'd` — the search normalizes
most variants, but add a few spelling aliases to the pre-warm query builder.

Revised request counts (replace the sizing table above): stage 1 = one per model; stage 2 ≈ chosen files ÷ 50; stage 3
≈ ~30% of models (estimate). Start tier (1,391 models): ~1,900 requests ≈ **~30 min**. 100+ tier (4,008 models):
~5,500 ≈ ~1.5 h. Everything (15,769 models, ≤97,135 groups): ~23,000 ≈ **~6.5 h at 1 req/s** (~3 h at 2 req/s).
The `--min-cars` tiers then matter far less; running everything becomes reasonable.

Unverified idea for the fallback stage: one Wikidata SPARQL query for all car models with an image (`P18`) and Commons
category (`P373`) would replace stage 3 with a single request — but Wikidata labels match registry strings loosely.
Try only if stage 3 turns out to be the slow part.

**Order**

1. Migration + DB-backed image cache in `WikiService` (+ tests: hit, miss, lead fallback, stale-serve, TTL).
2. Retry/backoff/`Retry-After` + never-cache-errors rule (+ tests with a mocked `fetch` returning 429/503/timeout).
3. Pre-warm script, `--retry-failed`, CSV export/import, coverage report, CLAUDE.md command list.
4. Run the start tier in the background, review coverage, then decide on the 100+ tier and the per-model trial.

### YouTube fallback for models with no infocar video — design, trial and build notes (ingest built 2026-10-05)

Moved from PLAN.md 2026-10-05 (commit `0efd54f`). The staged ingest (`pnpm ingest:youtube-videos`, migration `0031_youtube_videos.sql`,
`registry.youtube_videos` + `youtube_model_runs`, `scripts/src/youtube-videos.ts` + `youtube-videos-filter.ts`, CSV export/import) is built.
The real run, the `videoLookup` integration + UI label and generation/year matching are still open — see PLAN.md "Step 2a".

_Trial_ (`scripts/src/youtube-videos.ts`, now the real ingest; run with
`pnpm --filter @carplates/scripts exec tsx --env-file=../apps/api/.env src/youtube-videos.ts [model…]`): 10 gap models
(Touran, Fusion, Lancer, Doblo, Laguna, Omega, Lanos, ВАЗ 2107, Getz, Note), 3 queries each, 3,010 units total
(≈301/model). `GOOGLE_API_KEY` is valid (HTTP 200). 16–24 kept per model of ~17–27 found; the kept ones are mostly real
reviews (carwow, Carbuyer, What Car?, AcademeG, Зенкевич, ArchiLow, Auto BOSS). Calls used: `search.list`
(`part=id&type=video&videoEmbeddable=true&maxResults=10`) then one `videos.list`
(`part=snippet,contentDetails,status,statistics`) per model, parsed with Zod.

_Languages — priority cascade ua → ru → en (decided 2026-10-04):_ run the ua query first and **stop as soon as ≥3
videos survive the filter**; only then-missing models get the ru query, then en. ua `"<brand> <model> огляд
тест-драйв"`, ru `"<brand> <model> обзор тест-драйв"`, en `"<brand> <model> review"` (brand/model in Latin as in the
registry; for ВАЗ/ЗАЗ/ГАЗ also the Cyrillic + Lada/Zaz spellings), each with `maxResults=50`. Measured on the 10 trial
models: **all 10 stopped after the ua query** (26–48 kept of 50) — 101 units/model instead of ≈301. Caveat: the ua query
mostly returns _Russian-titled_ videos (only ~2 of 10 models had a `lang=ua` title in the top results), so "ua first"
is a search-phrase priority, not a guarantee of Ukrainian-language videos. If a real ua video matters, count the
threshold on `lang=ua` titles instead — that makes most models fall through to ru/en again (≈200–300 units/model);
decide before the full run. Store a `lang` column (`ua|ru|en`), keep the top ~6–8 per model by views with a **cap per
language** (≤3 en; en is lowest priority — the trial's English hits skew to PakWheels/US channels); the UI orders by
the user's `lang` first. Language comes from the title script, not the API (`defaultAudioLanguage` is mostly empty):
`іїєґ` → ua, `ыэёъ` → ru, other Cyrillic is ambiguous (~⅓ of titles) → treat as `ru`.

_Title filter (works, keep):_ require a model alias in the title (Latin + Cyrillic: `touran`/`туран`, `lancer`/`лансер`,
digits for ВАЗ — hand-curated alias table per gap model; `nissan note` needs the brand because `note` is a common
word); drop non-embeddable (the modal player needs it), duration < 150 s, and dealer/used-car listings (regex
`автопідбір|автоподбор|авторинок|під замовлення|з німеччини|продаж|ціни|в наявності|…`). Known false positives of the
dealer regex: honest reviews titled "…з Німеччини" (e.g. Ivan Rybka's Touran) — accept, or drop `з німеччини` from it
and rely on channel signals.

_Still missing (build these):_ (1) **generation/year matching** — the trial keeps a 2003–2010 and a 2018 Touran video
for every Touran; parse a year or generation word (`MK1`, `Mk2`, `B`, `3`, `X`) from the title and map it to a
generation year range via the infocar version catalog (as `videoLookup` already does for infocar videos), else store the
title year and let `videoLookup` filter by it; (2) the **gap-model target list** — derive from the registry, not a
hand-written array: top N (brand, model) pairs where `videoLookup` returns 0 (the throwaway script that produced the
PLAN list; collapse doubled spellings "LANOS LANOS", skip trucks/trailers/odd entries), ordered by registrations;
(3) **persistence** — migration `NNNN_*.sql` + a **new sibling table `registry.youtube_videos`, not an extension of
`car_videos`** (that one has `infocar_video_id` NOT NULL UNIQUE and an infocar page `url`, and its crawl/CSV/refresh are
infocar-specific; YouTube rows need `lang`/`channel`/`views`/`query` and a quota-limited refresh) (`youtube_id` unique, `brand_slug`/`model_slug` as the
registry-side normalized slugs, `lang`, `year`, `generation_id` null, `channel`, `views`, `duration_s`,
`published_at`, `query`, `fetched_at`), upsert by `youtube_id`, a **resumable per-day run** (skip models already done;
stop cleanly when the API returns `quotaExceeded`, 403), `--model`, `--limit`, `--dry-run`, and CSV export/import like
the other ingests (`export:youtube-videos:csv`, `ingest:youtube-videos:csv` into `ingest:ratings:csv`, CLAUDE.md list);
(4) **lookup integration** — `videoLookup` (`packages/shared/src/infocarVideoLookup.ts`) takes these rows as a second
source after the infocar ones (dedupe by `youtube_id`; infocar first), `MAX_VIDEOS` still caps the section, the UI
labels them as YouTube search results rather than infocar picks; (5) tests for the alias/dealer/duration filter and the
language bucketing (pure functions, colocated).

_Quota & time:_ `search.list` = 100 units, `videos.list` = 1 unit per ≤50 ids, daily default 10,000 (resets midnight
Pacific). With the cascade ≈101 units/model (measured: 1,010 units for the 10 trial models) → ~99 models/day: ~80 gap
models (top-400 list, de-duplicated) ≈ 8k units ≈ **under 1 day**; ~150 with the long tail ≈ 15k ≈ **~1.5 days**
(models that fall through to ru/en cost +100 each; budget ~1.5–2 days to be safe). Without the cascade (3 queries
always) it was ≈301/model ≈ 2.5–3 days for 80. Runtime per day is only ~10–15 min — quota is the limit. Levers:
`maxResults=50` costs the same 100 as 10, so one wide query beats several narrow ones; a quota-increase request (free
form, unknown approval time). Build estimate ≈ 3–4 h. Cheaper add-on: trusted channels' uploads via `playlistItems.list` (1 unit/call), matched locally.

**Next-session steps, in order (YouTube fallback):**

1. **Decide the stop rule** (default: ≥3 kept videos of _any_ language after the ua query — ~101 units/model; the
   alternative, ≥1 `lang=ua` title, is ~200–300 units/model). Check `git status`: `scripts/src/youtube-videos.ts` (the
   trial), the videos CSV and the PLAN edits may still be uncommitted.
2. **Target list**: query `registry.current_registration` for the top N (brand, model) pairs (start N≈400) where
   `videoLookup` returns 0 videos; collapse doubled spellings ("LANOS LANOS"), drop trucks/trailers/odd entries, order
   by registrations. Write it out as a reviewable file (brand, model, registrations) and hand-add the Cyrillic aliases
   per model (the trial's `aliases` array is the format); models without an alias fall back to the Latin model name.
3. **Migration + table** `registry.youtube_videos` (next free `NNNN_*.sql`, Drizzle schema in `packages/db`), plus the
   (brand, model) → done/query-count bookkeeping so a run resumes where it stopped.
4. **Turn the trial into the ingest** (`youtube-videos.ts` → real, still dry-run-able): the cascade, filter, language
   bucketing, ≥1 `videos.list` per query, upsert by `youtube_id`, stop cleanly on 403 `quotaExceeded`, `--model`,
   `--limit`, `--dry-run`; pure helpers (alias/dealer/duration filter, `titleLang`) split out with colocated tests.
5. **Generation/year matching** (item 1 above), then **`videoLookup` integration** (item 4) and the UI label.
6. **Run it**: `--limit 10` first, eyeball, then the full list in daily batches (~99 models/day at 10,000 units);
   watch the units counter the script prints.
7. **CSV + wiring**: `export:youtube-videos:csv`, `ingest:youtube-videos:csv` into `ingest:ratings:csv`, root
   `package.json` scripts, the CLAUDE.md command list; commit the seed.
8. **Verify** (the "Done when" checks) and measure again: share of the top-400 pairs with ≥1 video (was 74.1% of
   registrations), share of lookups with a year-matched video.

### Auto news (RSS) ✅ v1 BUILT (2026-10-05)

Moved from PLAN.md 2026-10-05. Open items (cron, Hot toggle, measure step, more sources, backfill) stay in PLAN.md "Step 2d".

**What was built:**

- **Sources are data, not code:** `scripts/news-sources.json` (Zod-checked in `scripts/src/news-parse.ts`): `id`, `name`, `url`, `lang`,
  `enabled`, optional `onlyCategories` (whole-site feeds: keep only items carrying one of these `<category>` values, exact + case-insensitive),
  `note`. Edit that file to add / disable / retune a feed — no code change.
- **Ingest** `pnpm ingest:news` (`scripts/src/news.ts`): fetch each enabled feed (1 s apart, UA `carsua.app-ingest/1.0`, 20 s timeout), **checks the
  host's robots.txt first** (`infocar-robots.ts`; a disallowed feed is reported `SKIPPED`), decodes the charset from the XML declaration (infocar =
  windows-1251), parses RSS 2.0 with cheerio (CDATA; image from `<enclosure>` / `media:content` / the first `<img>` in the description; summary =
  plain text ≤300 chars), applies `onlyCategories`, tags every headline once (`tagNews` in `packages/shared/src/newsLookup.ts`: brand via
  `findBrandSlug` over title → feed categories → summary; model = longest infocar catalog slug of that brand spelled in the **title** via
  `namesModel`; year via `titleYear`), upserts by url into `registry.news_items` (migration `0032_news_items.sql`), prunes rows older than
  `--keep-days` (180). A failing or empty feed is reported and skipped; it never fails the run. `--source <id>` (repeatable), `--dry-run`, `--list`.
  Idempotent — run on demand now, a scheduler on the VPS later (every ~6 h; hourly for whole-site feeds with a tiny window). No CSV seed (ephemeral).
- **Lookup** `newsLookup` (`packages/shared`): brand rows → the model's items first (same model year before newer, then newest) → brand-only
  items (cap `MAX_BRAND_ONLY_NEWS` = 4), max `MAX_NEWS` = 8; each item carries `match: 'model' | 'brand'`. Unknown or newsless brand → empty (no general
  fallback on a plate page).
- **API** `GET /api/news?brand=&model=&year=&lang=` (`apps/api/src/news/`), `Cache-Control: public, max-age=3600`; without `brand` it returns
  the latest `MAX_LATEST_NEWS` = 12 overall (homepage). `lang=uk` filters to Ukrainian-language items — **the Ukrainian UI sends it, ru/en show
  everything** (`newsLangFilter` in `apps/web/src/lib/news.ts`). Not in the persisted offline groups (`['news', …]` query keys), short `staleTime`.
- **UI:** homepage `NewsTicker` (lazy, after the statistics panels; CSS-only two-copy marquee, 14 s per card, pauses on hover/focus,
  reduced-motion = scrollable row); on a result card a collapsed **📰 News section, last** (`NewsSection`, ❓ `section.about.news`, share link
  `?section=news`, thumbnail-left rows via `NewsCard horizontal`); and a desktop-only (≥1400 px) fixed right-hand `NewsWidget` that fetches as soon as the
  car is known, renders nothing without news and fades in after ~80 px of scroll. `NewsGroups` ("About <make model>" / "About <make>") is shared.
  A bare-car-name headline from the infocar `new-models` feed is shown as "New model: <name>" (`newsTitle`).
- Tests: `newsLookup.test.ts` (tagger + lookup), `news-parse.test.ts` (parser, summary cap, windows-1251, sources schema, `hasCategory`, `matchesUrl`). A source may also set `excludeUrls` (regex list on the item link) — for whole-site feeds with no usable `<category>` (Car and Driver).

**Sources verified 2026-10-05** (`curl` + robots.txt + a tagger run over the real items):

| Source                                                      | Verdict                                                    | Notes                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| news.infocar.ua `news.php` / `new-models.php` / `tests.php` | ✅ enabled                                                 | 100 / 20 / 50 items; windows-1251; 66 % / 85 % / 96 % tagged with a make, 23 / 9 / 41 with a model                                                                                                      |
| eauto.org.ua `rss.xml`                                      | ✅ enabled                                                 | 50 items, market analytics, mostly untagged (general news)                                                                                                                                              |
| autoua.net `/rss/`                                          | ✅ enabled                                                 | 20 items over ~10 days, ru, all with images, 19/20 make, 11/20 model; its `<category>` is dirty — the title is the source                                                                               |
| mezha.ua `/feed/`                                           | ✅ enabled with `onlyCategories: ["Авто","Електромобілі"]` | whole-site tech feed, only 10 items (~3 h); 0 car items at test time; its car articles carry the tags Авто / Електромобілі + the make                                                                   |
| caranddriver.com `/rss/all.xml/`                            | ✅ enabled (en) with `excludeUrls`                         | added 2026-10-05; 50 items ≈ 1 day, no `<category>`, `<media:content>` images; `excludeUrls: ["/photos/", "/auto-loans/", "/shopping-advice/"]` drops ~40 % (galleries, loans); 22/30 make, 10/30 model |
| motor1.com `/rss/news/all/`                                 | ✅ enabled (en)                                            | added 2026-10-05; 20 news items, `<enclosure>` images; 16/20 make, 3/20 model                                                                                                                           |
| carscoops.com `/category/news/feed/` · `/tag/reviews/feed/` | ✅ enabled (en)                                            | added 2026-10-05; 18 + 18 items; full-content feeds (260 / 800 KB, only the ≤300-char summary is kept), robots.txt empty; 11/18 + 17/18 make, 5 + 9 model; reviews feed updates slowly                  |
| novyny.live `/rss/news_ua.rss`                              | ✅ enabled with `onlyCategories: ["Авто"]`                 | 146 items ≈ 1 day, ~8 "Авто"/day, empty `<description>`, avif images, only ~1 in 8 names a make (the rest show on the homepage ticker only); "Транспорт" is railways — not kept                         |
| itc.ua `/ua/feed/`                                          | ❌ rejected                                                | robots.txt `Disallow: */feed/` — covered by the HTML tag crawl (`ingest:press`) instead                                                                                                                 |
| 24tv.ua `rss/all.xml`                                       | ❌ rejected (added, then removed)                          | whole-site, ~3 h window, no categories, no auto feed (`/rss/auto.xml` is empty); 0 of 60 headlines named a make                                                                                         |
| rbc.ua `ukrnet.strong.ukr.rss.xml` / `all.ukr.rss.xml`      | ❌ rejected                                                | no auto category; 0 of 65 / 402 items name a make                                                                                                                                                       |
| fakty.com.ua `/ua/feed`, telegraf.com.ua `/ukr/rss`         | ❌ rejected                                                | no auto category; 0 of 20 / 250 items name a make (telegraf's "авто" hits are traffic, washing machines, enlistment offices)                                                                            |

Lesson: general news sites have no car-model news — only auto-section sites do. Untested candidates: auto.ria.com/news, autocentre.ua, avtoradnyk,
nv.ua/auto. A mezha backfill is possible from the HTML tag pages (`mezha.ua/tag/avto/`, ~110 pages, robots allow it), not from RSS.

#### Original plan and agreed strategy (2026-10-04)

**Step 2d — Auto news (RSS): v1 built 2026-10-05** (`pnpm ingest:news`, `scripts/news-sources.json`, `registry.news_items`, `GET /api/news`, homepage `NewsTicker` + desktop-only scroll-in `NewsWidget` on plate/VIN pages; not yet: cron, Hot toggle, more feeds, measure step). Original plan: A "News" subsection/toggle that shows recent Ukrainian
auto-news headlines relevant to the car (make+model+year → make+model → make only). Links + facts only (title, ≤300-char
description, image URL, date, url) — never republish article text.
**Feed findings (measured 2026-10-04, all plain HTTP 200, robots allow):**

- `https://eauto.org.ua/rss` is the _how-to_ HTML page; the real feed is `https://eauto.org.ua/rss.xml` (UTF-8, 50 items, uk;
  `?lang=en` exists). Market analytics from Інститут досліджень авторинку (prices, sales, registrations). **No `<category>`**
  — make/model must come from title text. Mostly market-wide, few car-specific items.
- `https://autoua.net/rss/` (UTF-8, ru, 20 items, `autonews.autoua.net` links + `<enclosure>` image). **Has `<category>`
  tags but dirty** (brand names "Toyota"/"Tesla" mixed with `electric.vehicle`, `china`, `США`) — usable as a hint, but
  the title is the primary source. Only latest 20 → needs periodic polling to accumulate.
- infocar.ua page_106 lists the real feeds (windows-1251 — decode with `TextDecoder('windows-1251')`; `<category>` is
  generic "Авто"/body-type, **not** a brand): `news.infocar.ua/rss/news.php` (**100 items**, uk), `/rss/new-models.php`
  (20; title = "Volvo XC40", link host `volvo-xc40.infocar.ua` and `_id7424` = **exact catalog model**, already in
  `infocar_versions` → best match quality), `/rss/articles.php` (50, evergreen history/advice), `/rss/tests.php` (test
  drives), `/rss/video.php`, `/rss/reviews.php` (30 owner reviews, `<category>` = brand, link has `/brand/model/year/`;
  overlaps the existing infocar reviews crawl — skip). `avtobazar.infocar.ua/rss/bazar.php` is classifieds — skip.
- Other candidates to check later (not fetched): autocentre.ua, auto.ria.com/news RSS, avtoradnyk, nv.ua/auto, 24tv auto.

**Agreed strategy (2026-10-04) — supersedes the items below where they differ.** One daily (later every 6 h — infocar
news' 100-item window is only ~2-4 days) job merges all feeds into a single store; plate requests never touch the
sources, they filter the store on demand.

1. **Merge, don't overwrite.** Key by URL, upsert, prune > 180 days. A rolling archive keeps brand-only news available
   after the short feed windows roll over.
2. **Tag once at ingest** (`brandSlug`/`modelSlug`/`year` stored per item); the request is a filter, not a title scan.
3. **Store: table `registry.news_items` preferred** (consistent with `owner_posts`, safe with API and cron on different
   hosts). A gitignored `data/news.json` (temp file + atomic rename, API caches it in memory and reloads on mtime change)
   is acceptable only if both run on the same box. Decide when building.
4. **Fallback tiers, each capped and labelled in the response** (`match: model | brand | general`): brand+model(+year) →
   brand+model → brand only → general latest. General news only fills slots left over, never displaces real brand news.
5. **Response caching:** `Cache-Control: public, max-age=3600`; `/api/news` stays out of the persisted offline cache (or a
   very short maxAge).
6. **Polite fetching:** conditional GET (ETag/If-Modified-Since), identifying User-Agent, a failing feed must not fail the
   run, log items per source and warn on a source returning 0 items (feed broke). windows-1251 decode for infocar.
7. **Display only** title, short summary, image URL, source, date, link out — no article text, images hotlinked lazily.
8. **Run:** manual `pnpm ingest:news` locally; cron on the VPS in Phase 4.
   Build order: parsers + fixtures (per-feed, pure, tested) → tagger + tests on real titles → table/migration + merge/prune
   → `newsLookup` in `packages/shared` + `/api/news` → UI section → measure (step 7 below).

**Original design.** Feeds only hold the latest N items, so news is **polled into a table and accumulated**, not fetched
live per request (same persisted-catalog pattern as `owner_posts`).

1. **Migration `0026_*`** (renumber if topgear lands first) `registry.news_items`: `url` PK, `source` (enum-ish text),
   `title`, `summary` (trimmed, tags stripped), `image_url`, `published_at`, `lang`, `brand_slug` (nullable),
   `model_slug` (nullable), `year_from`/`year_to` (nullable, only when the title names a year/generation), `kind`
   (`news` | `hot`), `fetched_at`. Indexes `(brand_slug, model_slug, published_at desc)`, `(published_at desc)`.
2. **Tagging (`scripts/src/news-tag.ts`, pure + unit-tested on real titles).** Reuse `infocarBrandSlug` (alias table
   already handles Cyrillic/Latin) over title+summary; model = longest catalog model name for that brand found in the
   title (`infocar_versions` slugs; whole-word, case-insensitive, ≥2 chars, ban ambiguous names like "Up"/"X"/"E"); year =
   4-digit 2000-2030 in the title only. Source hints: infocar `new-models` link host/`_idN` gives brand+model directly;
   autoua `<category>` brand if it resolves via `infocarBrandSlug`. Unmatched items keep null brand and still appear in
   the generic "latest news" strip. Windows-1251 + CDATA + `<img>`-in-description handling in the parser.
3. **`scripts/src/news.ts` + `pnpm ingest:news`** (`--source eauto|autoua|infocar-news|infocar-new-models`, `--dry-run`):
   fetch each feed (conditional GET with ETag/Last-Modified if sent, 1 req/s, set UA), upsert by `url` (idempotent).
   Cheap enough to run hourly; later the VPS cron / a Nest `@Cron` job (Phase 4). No CSV seed (ephemeral data) — but add a
   tiny retention rule (drop > 18 months, keep rows with a model match longer).
4. **Hot news.** Define `kind='hot'` at query time, not by a source flag: published ≤ 7 days AND (model match OR
   source = infocar new-models). Avoids inventing an editorial signal; a real "hot" ranking (clicks) is Phase 5.
5. **Lookup `newsLookup(rows, brand, model, year)` in `packages/shared`**: tiers 1) brand+model(+year within generation
   range if the item has one), 2) brand+model, 3) brand only (cap 3 so it doesn't drown tiers 1-2); newest first inside a
   tier, max ~10 total; each item carries `match: 'model' | 'brand'` so the UI can label "about your model" vs "about
   {Make}". Zod response schema; `news[]` on `GET /api/reviews` **or** a new `GET /api/news?brand=&model=&year=` — prefer
   the separate endpoint: news changes hourly while reviews are near-static, and it keeps the persisted offline cache of
   `/api/reviews` from going stale (add `/api/news` to `lib/offline-cache.ts` with a short maxAge or leave online-only).
6. **UI — decision to make when building (investigate in a browser):** (a) a **News** `SourceGroup` inside `ReviewLinks`
   (cheapest, consistent), or (b) its own collapsible `SectionHeader` section under reviews with a **News / Hot** toggle
   (two chips; Hot hidden if empty). Recommendation: (b) — news is time-bound and a different intent from reviews; reuse
   `SectionHeader` + the show-5/"Show N more" pattern; source favicon + date + 2-line clamp; en/ua/ru strings. Feed
   languages are uk/ru — show as-is with a small `UA`/`RU` chip like the DRIVE2 links (no translation).
7. **Measure:** items/day per source, % tagged with a brand / model, and for the top-50 registry (brand, model) pairs how
   many have ≥1 news item in 30/180 days (expect most popular brands yes, most models no → the brand-only tier matters).
8. **Risks / limits:** title-matching false positives (model names that are common words: Polo, Fit, Up, Note, Jazz —
   require brand co-occurrence); ru text for some sources; feeds only keep recent items so a new DB starts empty until
   polled (backfill = none; infocar news `news.infocar.ua` paging could backfill, check robots first); copyright → link
   - short summary only, always link out and attribute the source.

### VIN photo search ✅ BUILT (first slice + second slice, 2026-10-05)

A "VIN photo" button, **last** in the search row (after AR). Deliberately no AR/live mode: a VIN needs a sharp
still, and plate-style frame tracking buys nothing. Both phones and desktop use the plain image picker.

**Flow.** `VinSearchButton` → `usePlateRecognition.recognizeVin` (same hook as plates, `mode: 'plate' | 'vin'`) →

1. `lib/vin-barcode.ts`: browser `BarcodeDetector` (Chromium only; code_128/code_39/data_matrix/qr) — exact, free;
2. else `POST /api/recognize/vin` (`VinRecognizeService`, throttled 30/min, needs `ALPR_LOCAL_URL`) →
   `services/alpr` `POST /recognize/vin`: RapidOCR (`rapidocr-onnxruntime`, models bundled in the wheel, ONNX CPU)
   returns raw text lines + scores only;
3. `extractVins` (`packages/shared/src/vin-read.ts`) finds and ranks VINs; the response is
   `vinRecognizeResponseSchema` (`candidates: { vin, score, checkDigitOk, box? }[]`); the top one is navigated to.
   404 → `recognize.noVin`.

The recognize controller moved from `api/recognize/plate` to `api/recognize` (`plate/local`, `plate/cloud`, `vin`) —
plate URLs are unchanged.

**Why a separate model, shared UI.** `fast-alpr` is trained on short plate crops and can't emit 17 characters; a
general text OCR can. Capture UI, hook, route shape and navigation are shared.

**Ranking lesson (bug found on a real registration certificate).** The first version sorted candidates by check
digit, then confidence, over every 17-char window of every line and of each line glued to the next. A certificate is
full of other text; the I→1 / O→0 remap made labels like "Vehicleidentification number" fit the VIN alphabet, and
~1 in 11 junk windows pass the check digit by chance — while the real EU-built VIN (Kia, Slovakia) fails it. A junk
window won. Fix: rank by **source** first (a line that is exactly 17 chars > a window inside a longer line > a VIN
wrapped over two fragments that are each <17 chars and both used), then check digit, then OCR score; windows must
end in 4 digits (ISO 3779), exact lines need ≥3 digits. Regression tests use that certificate's OCR lines. The check
digit stays a ranking hint, never a rejection (mandatory in North America only). Known trade-off: a VIN inside a
longer line that doesn't end in 4 digits is missed.

**VIN photos skip plate-specific UI.** `PhotoThumbnail.mode`: no EXIF date/GPS row (EXIF isn't even read), no
"photo is N years old / before registry" warnings (a VIN never changes); a VIN-specific quality tip
(`recognize.photoTipsVin`) and, since the second slice, a VIN-specific misread warning (`recognize.accuracyWarningVin`).

**Checked on real photos:** 3 windshield/door-jamb photos OK; the registration certificate OK after the ranking fix;
a stock photo of a VIN on a rain-covered windshield shows only 15 characters (cropped), so it correctly yields "not
found". **Not done:** eval set, multi-frame voting, LLM fallback, water/glare tuning — see PLAN.md.

#### Second slice (2026-10-05): outlines + found list, stamped VINs, junk rejection, offline VIN-prefix fallback

Triggered by real user photos that failed or returned junk. What changed and why:

- **Outlines + "Also found" chips.** `services/alpr` `/recognize/vin` now returns each text line with a `box` (fractions
  of the image, like the plate boxes). `extractVins` carries a box per VIN: a VIN word inside a longer line gets that
  word's slice of the line box (character position, horizontal lines only), a wrapped VIN gets the union of both lines.
  The client maps VIN reads onto the plate-candidate shape (`plate: vin`), so `PhotoPlateBoxes` / `PlateCandidates`
  work unchanged. A barcode read has no box.
- **Junk rejection (all found on real photos; each has a regression test in `vin-read.test.ts`).**
  - Badge/watermark text fits the VIN alphabet after the O→0 / I→1 remap ("MINI COOPER CLUBMAN" →
    `M1N1C00PERCLUBMAN`, stock-photo "IMAGE ID: 2701628693" → `1MAGE1D2701628693`). Rules: a 17-char _line_ needs a
    numeric 4-char tail **or** a passing check digit; a line with `:` `/` `-` or a letters-only word of 5+ letters is
    never glued into one VIN-shaped string (its words are still read one by one — a 17-char word like the VIN in
    `V.I.N WMW…` counts as an exact read, which also removes shifted-window junk).
  - Wrapped-VIN joins need both fragments ≥ 6 chars and, when boxes are known, stacked (second below the first,
    overlapping horizontally, small gap) — otherwise an approval number (`e9·92/61.0065.00`) or scraps from retry
    passes get glued onto a partial read.
  - Stamped VINs are fenced by asterisks that OCR reads as `X` (`XKLATF08Y1VB363636X`, 19 chars) → trimmed.
  - **Look-alike correction by WMI.** A read whose 3-char prefix isn't in the table but is one look-alike swap
    (M/N, 8/B, 5/S, 2/Z, 6/G, 0/D, U/V) from one that is (`NNC…` → Ford Thailand's `MNC…`) is replaced by the fixed
    VIN (the raw read is _not_ listed beside it — same text on the plate, one wrong letter). Only first-3-char
    errors are caught; a misread later in the VIN still needs a human check against the outlined photo.
- **OCR service tuning (`services/alpr/app.py`, rebuild with `pnpm alpr:build` + `alpr:up`).** `unclip_ratio=2.5`
  (merges spaced characters; fixed a misread letter on a Nissan chassis plate); the image is **padded** before OCR
  (a VIN touching the photo edge — a tight crop — lost its first letter once `unclip` grew boxes past the edge), boxes
  mapped back to the original frame; when the plain pass yields no VIN-shaped line (≥ 12 alnum chars, ≥ 4 digits) it
  retries on width-**squeezed** copies (×0.5, ×0.35, with/without CLAHE) — embossed/stamped characters with wide gaps
  are otherwise detected as scraps or not at all (the Audi door-jamb stamp `*WAUZZZ8E02A048406*` only reads this way).
  Only VIN-shaped lines are taken from the retries. A no-VIN photo now costs up to 4 extra OCR passes (~1-3 s here;
  the API's upstream timeout is 15 s). Tried and **rejected**: grayscale + CLAHE + 2× upscale, and inverted — made
  things worse on the dotted-metal photo.
- **Gotcha: `@carplates/shared` is consumed from `dist`.** The API (and web) resolve the package through its built
  `dist/`, so a change in `packages/shared/src` is invisible to the running API until `pnpm --filter @carplates/shared
build` ("still the old result"). The PWA also needs a hard refresh after a web rebuild.
- **Offline WMI fallback + labelled gap fields (VIN decode page).** NHTSA vPIC only has detail for US/Canada-market
  vehicles; for a VIN it doesn't know the Overview used to be empty or "—". `packages/shared/src/wmi.ts` is a curated
  table (≈190 prefixes: KR/JP/CN/EU/RU/UA/TH/IN/US + a country-by-first-chars fallback; `lookupWmi`, `hasKnownWmi`).
  `buildFallback` (`apps/web/src/components/vin/helpers.ts`) fills **only** what NHTSA left empty, priority NHTSA >
  our registry record for that VIN > VIN prefix > year code, each value carrying its source. UI: dashed
  "≈ registry / VIN prefix / year code" chips (`VinDerivedChip`, tooltip) + an explanatory note (`VinFallbackNote`,
  lists only the sources used); the Raw tab is untouched. Client-side only — no API/schema change, so users' offline
  caches survive.
  - The VIN-parts tooltips now spell out WMI / VDS (positions 1–3: country/region, maker, type; positions 4–8:
    manufacturer-defined, decodable only by NHTSA for US-market cars or the maker's catalog) and mark prefix-derived
    values; the VDS tooltip says "NHTSA has no decode, raw code …" when it has none.
  - Overview sections with no data (Engine & weight / Built in / All details) are hidden entirely, heading included
    (`hasEngineData` / `hasOriginData` / `groupFields`).
  - Not offline-decodable by design: model/trim/engine (manufacturer-specific) and Japanese domestic _frame numbers_
    (`NCP51-1234567` — not a 17-char VIN; only manufacturer parts catalogs decode them).
- **Checked on real photos (through the live API):** MINI `WMWLN5105J2H03769`, Hyundai `KM8J33A4XMU312822`, Nissan
  `PN8EAAC24TCA14792` (stock photo with watermark), door-sill stamp `KLATF08Y1VB363636`, Audi stamp
  `WAUZZZ8E02A048406`, Ford Thailand plate `MNCLSFE405W491230` (after the M/N fix) — all found; a Toyota
  certification label (model/paint codes, **no VIN printed**) correctly 404s. **Still failing:** a Jincheng engine plate
  (`LJCPCBLCX11000237`) — the detector reads only the last 14 characters (`PCBLCX11000237`), so nothing is returned
  (better than the 5 junk candidates it produced before the join rules); a tight crop of the VIN line works.
  `AAJ3030150S100354` is not a valid VIN (position 10 is `0`, unknown WMI) — NHTSA's error text explains it.
- **Not done / ideas:** a "VIN looks malformed / prefix not recognised" note and a check-digit warning for VINs
  where NHTSA gives no verdict; a second recognizer pass on the cropped VIN band (would likely fix the Jincheng
  case); editing a candidate before searching.

### Auto news archive (/news) ✅ BUILT (2026-10-06, `c04716c`)

Follow-up to "Auto news (RSS)" above; open items stay in PLAN.md "Step 2d". Not verified in a browser by the author of this note.

- **Route** `/news` (`apps/web/src/routes/news/NewsRoute.tsx`, lazy-loaded in `App.tsx`): newest first, 10 per page (`NEWS_PAGE_SIZE`), a chip per outlet
  (`NEWS_SOURCE_GROUPS` in `lib/news.ts`: infocar.ua = 3 feeds, eauto, autoua, mezha, novyny.live, Car and Driver, Motor1, Carscoops = 2 feeds), a date-sort toggle and a title
  search (opens on demand, 350 ms debounce, ≥ 3 characters = `NEWS_SEARCH_MIN_CHARS`). The whole view lives in URL params `source` / `q` / `order` / `page`, so it is shareable.
  The UI language narrows the items the same way the plate-page widget does (`newsLangFilter`: Ukrainian UI shows Ukrainian items only).
- **API** `GET /api/news/list?source=&q=&order=&lang=&page=&pageSize=` (`apps/api/src/news/`): `source` = comma-separated feed ids (≤ 20), `q` = 3-100 characters matched
  case-insensitively against the title with LIKE wildcards escaped, `order` asc|desc (default desc), `pageSize` 1-50 (default 10); `Cache-Control: public, max-age=600`.
  The response adds `total`, `page`, `pageSize` and `sources` (per-feed counts over the **language slice only**, so the chips' numbers don't change with the selected chips).
  Schemas `newsPageResponseSchema` in `@carplates/shared`; `newsItemSchema.match` is `null` for archive rows.
- **Entry points:** a "📰 News" link in the sidebar (`nav.news`) and a "more →" link beside the homepage ticker's heading (`news.more`); link-preview meta for `/news` in `apps/api/src/spa/spa-text.ts` (ua/ru/en).
- **Caching:** live data only — not in the persisted offline cache (`['news-page', …]` keys), never prefetched.

### 360° view polish ✅ BUILT (2026-10-06, `65bd114`)

Follow-up to "Step 2e — CarShow360 360° galleries"; only the modal changed (`Model360Modal`, `Model360Button`, `lib/model360.ts`). Not verified in a browser by the author of this note.

- **Readable generation labels:** a gallery whose label is only a roman numeral ("III") read like a dummy chip — `model360ChipLabel` spells it out ("III generation", i18n `model360.generation`); other labels pass through.
- **Segmented exterior / interior toggle** in the modal.
- **View in the share link:** the `tab` param is `<galleryId>` for the cabin view (the default) and `<galleryId>-ext` for the exterior (`model360ShareTab` / `parseModel360Tab`); the modal gets `initialInterior` next to `initialId`.

### Brand YouTube channel videos ✅ BUILT (2026-10-06, `68fb513`)

Requested and built the same day (open items are in PLAN.md "Step 2f"). Goal: a free, anonymous "what is the make posting" feed on result cards. The first idea (an X/Twitter timeline panel) did not work; YouTube channel feeds did.

**What was built:**

- **Table** `registry.social_posts` (migration `0033_social_posts.sql`; `url` PK, `platform` default `youtube`, `channel`, `title`, `summary` ≤ 300 chars, `image_url`, `published_at`, `fetched_at`; index on `(channel, published_at desc)`). Facts + links only — nothing is re-hosted.
- **Channels** are code, not a JSON file: `SOCIAL_CHANNELS` in `packages/shared/src/socialChannels.ts` — **54 channels = 50 makes (keyed by infocar brand slug) + 4 parent groups** (`group:bmw-group`,
  `group:gm`, `group:renault-group`, `group:hyundai-group`), each with a verified YouTube channel id. `socialChannelsFor(brand)` returns the make's channel first, then its group's; the API and the
  ingest share the table, so there is one source of truth (a JSON file in `scripts/` would not be visible to the API).
- **Ingest** `pnpm ingest:social` (`scripts/src/social.ts` + `social-parse.ts`, tested): fetches `youtube.com/feeds/videos.xml?channel_id=…` per channel (1 s apart, 20 s timeout, ~1 min total) —
  public Atom, **no API key and no quota**, the channel's latest ~15 uploads (title, `media:thumbnail`, `media:description`, date). Upsert by `url`; rows older than `--keep-days` (365) pruned; `--channel`
  (`audi`, `group:gm`), `--dry-run`, `--list`. A dead feed is reported, never fails the run. **It prints the feed's own channel title next to the configured name**, which is how wrong ids were caught.
  First run: 783 videos upserted, 749 in the table after pruning. Not part of `ingest:all`; no CSV seed (daily in SCHEDULE.md).
- **API** `GET /api/social?brand=` (`apps/api/src/social/`): per channel (make, then group) the 8 latest rows; a channel without rows is omitted; unknown brand → `{ channels: [] }`; `Cache-Control: public, max-age=3600`.
- **UI:** the result card's collapsed section was renamed from "Video reviews" to **"Videos"** (ua "Відео", ru "Видео"; share/export section id stays `videos`). `VideoReviews` shows infocar's model videos ("This model"), then
  `BrandChannelVideos` ("Official channel": a link to the channel plus a Make / Group toggle when both channels exist). `InfocarVideos` became the generic `VideoStrip` (thumbnail → `YouTubeModal`; the iframe is
  only created on click), used by both. Both queries run only once the section is opened (`socialQuery`, live data, not in the persisted offline cache); a failing channel feed leaves the model videos untouched.
  Checked in a browser on Audi КА6336СК only: 6 model videos + 8 Audi channel videos, and no left panel.

**Discovery (2026-10-06, throwaway script in the scratchpad — handles tried: brand name, then variants):**

- **YouTube** `youtube.com/@<handle>` → `<link rel="canonical" …/channel/UC…>` gives the channel id, but handles can resolve to unrelated channels (`@HyundaiGlobal` = a person, `@BYD` / `@TriumphMotorcycles` = spam
  / a person), so every id was kept only after the feed's own title matched. **Dropped** (empty or stale feed): Dacia, Land Rover, Kawasaki, Triumph (the real "Triumph Motorcycles" channel's feed was empty), Volkswagen Group (`vwgroup`),
  DS (last upload 2012), JLR (2023), Citroën global (one 2010 video → `Citroën do Brasil` used instead). Geely International has only 2 videos. Stellantis: no channel under any handle tried.
- **X / Twitter timeline embed — rejected.** Built first (left-hand panel, `platform.twitter.com/widgets.js` `createTimeline`); in a real browser the request
  `syndication.twitter.com/srv/timeline-profile/screen-name/<handle>` returned **429**, so the box stayed empty, the script reports success anyway (no way to detect it), and it sets X cookies. The X API has no free read tier.
  All X code was removed before it was ever committed.
- **Bluesky — rejected.** `public.api.bsky.app` is open and free, but brand-named handles are mostly squatters or random people (`bmw.bsky.social` = "BD - e/acc", `chevrolet.bsky.social` = "Nissan Honda"),
  the genuine brand accounts have 0-few posts, and ownership cannot be verified automatically. (A keyword-search Bluesky widget that needs no handles was built later the same day — see "Side widgets".)
- **Left-hand "Brand videos" side panel** (a `NewsWidget` twin on the left gutter) was built on top of the YouTube data and removed the same day in favour of the Videos section; the gutter is free for other widgets (the Bluesky + share-price column now uses it — see "Side widgets").

### Side widgets: Bluesky posts + share price ✅ BUILT (2026-10-06, `037f7a7`, `7b225cb`, `c8d9950`)

Desktop-only widgets in the gutters beside a plate result. Open items are in PLAN.md "Side widgets".

- **Gating** (`useSideWidgetsVisible`): the widgets mount — chunk **and** fetch — only at ≥ 1400 px, online, after the first scroll, and slide in with `starting:` variants. Each is dismissible for the current route. Their chunks
  (`NewsWidget`, `BlueskyWidget`, `StockWidget`) are excluded from the PWA precache in `vite.config.ts` (live third-party data, only mounted online). They also show after a _photo_ search that resolves to a vehicle (`c8d9950` dropped
  the `!photo` gate in `SearchRoute`; recognition errors still hide them).
- **Layout:** News on the right; **Bluesky (top) and share price (below) share one fixed left column** — either alone takes the top slot, and `BlueskyWidget` flows inside that column instead of being fixed itself.
- **Bluesky** (`lib/bluesky.ts`, `BlueskyPostCard`, `BlueskyWidget`): a keyword _search_, not brand handles — `app.bsky.feed.searchPosts` on `MAKE MODEL (YEAR)`, falling back to `MAKE MODEL`; fetches 25, drops text-less
  posts and authors carrying the `!no-unauthenticated` opt-out label, shows 2 (text + image / link-card thumb) with a "More on Bluesky" link. Zod-validated in the browser (`zod` added to `apps/web`); plate results only; hidden when
  there are no posts. This is a different use from the "Bluesky — rejected" handle idea under _Brand YouTube channel videos_ (that one needed verified brand accounts; a search needs none).
- **Share price** (`GET /api/stocks?brand=&range=1d|1mo|1y`, `apps/api/src/stocks/`; `stockCompanies.ts` + `stockResponseSchema` in `@carplates/shared`): the listed company behind the make (infocar brand slug → company, parent-group
  fallback; **32 Yahoo tickers**). The API proxies Yahoo Finance's unofficial chart endpoint (`query1.finance.yahoo.com/v8/finance/chart`; browsers can't call it — CORS), 5-min in-memory cache (200 entries), stale-on-error, 10 s timeout;
  `company: null` when the brand has no listing. Web: `StockWidget` + a dependency-free SVG `StockChart` (price, ▲/▼ %, 1D/1M/1Y chips, Yahoo link).
- **News widget:** shows at most 3 items plus a "More news" link to `/news?q=<make model>` (make only when there are no model-level headlines). The `/news` page got a **Reset** button (visible when not at defaults) restoring
  source chips, search and sort order. `NewsSection` on the result card now fetches after the first scroll on wide screens (or for `?section=news`), so `/api/news` loads together with the side widgets through the shared query.
- **Sidebar:** the drawer now also closes after toggling the theme, like the nav links and language buttons.

### Skeleton placeholders ✅ BUILT (2026-10-06, `de0a53c`)

`ui/Skeleton` (pulse block); `StatsSkeleton` (registry + rating variants) and `StatsMapSkeleton` replace the "Loading…" spinners on `/stats`, `/fuel`, `/safety` and the map view; `HomeStatsSkeleton` (top + models
variants) fills the homepage top-5, CO₂ and crash-test sections while loading, so the news ticker below doesn't jump when the data arrives.

### About page: new sources and icons ✅ BUILT (2026-10-06, `9b974fd`)

Wikimedia Commons, Bluesky, Yahoo Finance and Travic added to the sources list (ua/ru/en); the YouTube entry mentions Dream Trips ISS and the brand channel uploads. Each source shows a 32 px `SourceAvatar` from
`apps/web/public/icons/sources/` (24 logos, 64 px WebP plus 4 SVGs).

### Accounts, stage A — Google sign-in, paid-feature opt-ins, admin ✅ BUILT (2026-10-06, uncommitted when written)

Phase 5's first slice; the open stages (pricing, backlog, profile page) stay in PLAN.md "Phase 5".

- **Decision: own thin auth — no auth SaaS, no Passport, no `google-auth-library`.** The stack already has Nest + Postgres; an ID-token verify is ~100 lines and avoids a vendor, per-MAU pricing and a second user store
  (Auth0/Clerk/Firebase/Supabase rejected for that reason; Better Auth is the pick if email + password lands).
- **Flow:** Google Identity Services renders the button (script loaded only when the sign-in popover opens, online only) → the page gets an ID token → `POST /api/auth/google` verifies it locally against Google's JWKS
  (`apps/api/src/auth/google-id-token.ts`: RS256 signature, `iss`, `aud` = our client id, `exp`/`iat` with 60 s skew, `email_verified`; keys cached per `Cache-Control: max-age`, re-fetched at most once a minute on an unknown `kid`)
  → an opaque 256-bit session token in an **httpOnly, SameSite=Lax, Secure (production) cookie `carsua_sid`**; the DB stores only its SHA-256. Sliding `SESSION_TTL_DAYS` (30) lifetime, extended once past half. SameSite=Lax is the
  CSRF guard (JSON-only API, no mutating GETs). Expired sessions are purged on each sign-in.
- **Button language:** Google ignores `renderButton({ locale })` (the button iframe URL carries no language); the language comes from `?hl=` on the script URL, so `loadGoogleIdentity(hl)` drops the old script and loads a fresh
  copy on every UI-language change (ua→`uk`, ru, en). Checked in a browser: one script, one button, "Вход через аккаунт Google" in Russian.
- **DB** — new **`app` schema**, migration `0034_app_accounts.sql` (kept apart from the derived `registry`): `users` (unique lower-cased email, `role user|admin`), `auth_identities (provider, subject)` (one user can later link
  password/other providers by verified email), `sessions`, `user_features (user_id, feature, enabled, updated_at)`. All FKs `ON DELETE CASCADE`, so deleting a user wipes everything.
- **API:** `GET /api/auth/config` · `GET /api/auth/me` (anonymous = `200 {user:null}`) · `POST /api/auth/google` (20 / 15 min) · `POST /api/auth/logout` · `DELETE /api/auth/me` · `GET|PUT /api/features` (SessionGuard) ·
  `GET /api/admin/users` (AdminGuard). Controllers return `WithSessionCookie` and a global interceptor sets/clears the cookie (no `@Res()`). Contract in `packages/shared/src/account.ts` — **deliberately not in `schemas.ts`**, whose
  hash is the offline-cache buster. Env: `GOOGLE_CLIENT_ID` (not a secret; absent → `auth/config` says `null`, sign-in answers 503), `SESSION_TTL_DAYS`.
- **Admin = DB only:** `UPDATE app.users SET role='admin' WHERE email='you@gmail.com';` (the user must have signed in once). Admins see everything a user sees plus `/admin` (accounts + which features each switched on). No API grants roles.
- **Web:** `LoginButton` in the header right of the layers button (person icon → avatar), `AccountMenu` (name/email, admin badge, Paid features, Admin, Sign out, Delete account), `DeleteAccountDialog` (portaled `alertdialog`: what is
  deleted, Cancel focused, Escape/backdrop cancel except while deleting; the header menu ignores clicks from it), `/features` (a checkbox per feature + Save, then "Coming soon" and "Under consideration" lists) and `/admin`. Both routes
  redirect to the homepage when not signed in / not admin / offline. `PaidFeatureSections` adds a **placeholder section on the result card per enabled feature** (platesmania only for plate results, auction history only for VIN
  ones). Auth is server state (`useSession`, TanStack Query), never persisted; **offline the user counts as anonymous** and all account UI disappears. The account chunks (`GoogleSignInButton`, `AccountMenu`, `FeaturesRoute`,
  `AdminRoute`) are excluded from the PWA precache; `/api/*` is not runtime-cached.
- **Adding a paid feature:** extend `PAID_FEATURES` (`packages/shared/src/account.ts`), add `paid.<id>.title|desc|placeholder` i18n keys, `PAID_FEATURE_ICON`, and `APPLIES_TO` in `PaidFeatureSections`.
- **Tests:** `google-id-token.test.ts` (valid token, wrong aud/iss, expired, future, unverified email, tampered payload, unknown kid refetch limit, bad alg) and `session-cookie.test.ts`; endpoints exercised by hand with a throwaway
  user + session (401/403/400 paths, save, admin list, delete). A real Google sign-in has worked end to end (the owner's account exists with a login timestamp, later promoted to admin by SQL).
- **Not done on purpose:** billing, real RIA/Platesmania/auction calls, cloud sync, email login, cookie-consent surface (the session cookie is strictly necessary).

### Accounts, stage A+ — sync, settings, labels, admin statistics ✅ BUILT (2026-10-07)

Five commits on top of stage A; open items stay in PLAN.md "Phase 5 → Stage C".

- **Favorites/history sync** (`apps/api/src/sync/`, web `use-saved-sync-actions.ts`, `SyncBanner`, migration `0035_user_saved_entries.sql`): table `app.user_saved_entries (user_id, list favorite|history, kind plate|vin, value, label, found, date, deleted)`. IndexedDB stays the source of truth; first sign-in merges local + server; deletes are tombstones (`deleted: true`, purged after 30 days); conflicts = newest `date` wins per `kind:value` (client clock clamped by the API). Lists capped at `FAVORITES_LIMIT` 100 / `HISTORY_LIMIT` 200 (oldest dropped, no age expiry). "Cloud sync" removed from the "coming soon" list.
- **/settings** (`apps/api/src/settings/`, `routes/settings/`, `store/settings-store.ts`, `use-user-settings-actions.ts`, migration `0036_user_settings.sql`): one JSON document per user in `app.user_settings`, schema `userSettingsSchema` in `packages/shared/src/account.ts`. localStorage `carplates.user-settings` is the working copy; sync is whole-document last-write-wins by `updatedAt`. Holds the default layer, saved streams (auto-saved when a stream is picked in the layers panel) and ≤ 5 background presets (preset editor + slider rows). For signed-in users the active preset (or built-in defaults) is pushed into `useBackgroundStore`; signed-out behaviour is unchanged.
- **Favorite labels** (migration `0037_saved_entry_tags.sql`, `tags` on saved entries): ≤ 10 labels per user in `userSettings.labels`, managed on `/settings` → Labels (`LabelsTab`), colors auto-assigned from the `--label-N` HDR palette in `global.css`; label ids stored per favorite and assigned from the result card (`FavoriteLabelsButton`) and the favorites list (`LabelChip`).
- **Admin Statistics** (`/admin?tab=stats`, `apps/api/src/usage/`, migration `0038_usage_events.sql`): a global `UsageInterceptor` logs plate/VIN/photo lookups and sign-ins into `app.usage_events` (kind, UI language, found, has-cookie — never the plate/VIN, IP or user id); `GET /api/admin/stats` aggregates it; `GET /api/admin/analytics` proxies PostHog HogQL (10 min cache; env `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, optional `POSTHOG_API_HOST`, `SENTRY_ORG_SLUG`). `AdminRoute` split into `AdminUsersTab` + `AdminStatsTab`. A new counted route needs `ROUTE_KINDS` + `USAGE_KINDS` + `admin.stats.kind.*` i18n. Web telemetry init fixed (`lib/telemetry.ts`).
- **Paid features trimmed:** only AUTO.RIA ads is offered for now (`lib/paid-features.ts`); the rest are "coming soon". Sidebar tweaks (`ca969e6`).

### Result-card polish and YouTube fallback in the lookup ✅ (2026-10-06 → 07)

- **Result card** (`4469fa0`): brand-site chip with a dealer badge (`BrandSiteChip`), engine capacity with units, tilt-toggle ("drunk mode") tweak, section-header/export-menu cleanup, Bluesky entity-decoding fix (`lib/bluesky.ts`, tested). Favorites star got a tooltip.
- **YouTube fallback videos** (`9602cd7`): `ReviewsService.lookup` falls back to `registry.youtube_videos` when infocar has no video for the model (dedupe by `youtube_id`, infocar first, `MAX_VIDEOS` caps the section); `videos[].source` (`infocar|youtube`) + `lang` added to the schema; the Videos section notes that fallback videos come from a YouTube search. Ingest: ≥ 5,000-car tier finished and ≥ 1,000 tier started on 2026-10-07 (Day 3; seed CSV re-exported).

### VehiclesDB cross-market data ✅ BUILT (2026-10-07, uncommitted when written)

Research and decisions: `DATASETS_PLAN.md` (four candidate datasets; carguru and sortedcars skipped, gor3a blocked on autoevolution's
reply). Built from the VehiclesDB catalog (https://vehiclesdb.com, release 2026.10.0, **CC BY 4.0**, 14,997 model rows from 15 official
registers incl. Ukraine's).

- **Data layer.** Migration `0039_vdb_models.sql` -> `registry.vdb_models`; `scripts/src/vehiclesdb.ts` (+ `vehiclesdb-parse.ts`, Zod,
  tests) downloads `dist/vehicles.csv` (cache `scripts/.data/vehiclesdb/`) or loads/exports the committed `scripts/seed-data/vehiclesdb.csv.gz`
  (305 KB); `pnpm ingest:vehiclesdb[:csv]`, `export:vehiclesdb:csv`, the `:csv` load is in `ingest:ratings:csv`.
- **Matcher** `packages/shared/src/vdbMatch.ts` (`matchVdbModel`; rules and gaps in DATASETS_PLAN.md). Real-registry coverage ~84% of rows
  (models >= 20 cars), 92.6% of passenger cars in the rollup. Tests use real registry strings, including must-stay-unmatched cases.
- **API** `apps/api/src/vdb/`: `GET /api/vdb?brand=&model=` (live match, contract in `packages/shared/src/vdb.ts` — own file so the offline
  cache is not busted) and `GET /api/vdb/stats`. Offline cache group `vdb` (400); `vdb-stats` stays online-only.
- **Result card.** `VdbChips` sits in the TOP chip row (after the stats chips, before 3D/360°/brand site): 🇺🇦 UA-only, 🌍 also sold in
  (flags; country names on hover and for screen readers), 📊 "Top X% of models in N markets" (X = decile band; it is the mean of the
  model's per-country deciles over the markets listing it, equal weight — NOT a Ukrainian rank), 💎 rare elsewhere (decile >= 8), and a
  "?" InfoPopover with one bullet per chip + the CC-BY credit + a `CODE — Country` legend of all 15 registers (names localized; gotcha:
  `Intl.DisplayNames` needs UPPER-case codes). Flag emoji show as letters on Windows.
- **/stats Markets panel.** Migration `0040_stats_vdb.sql` -> `registry.stats_vdb` (per matched model, `vdb_id` NULL = unmatched bucket);
  `scripts/src/vdb-stats.ts` (`pnpm db:refresh-vdb-stats`, ~11 s); `VdbStatsPanel` shows cars by popularity band (most of the fleet is in
  the 10-30% bands), "common here, rare elsewhere" (Lada 2172, Toyota Venza, ZAZ 968…) and "only in Ukraine" (ZAZ Lanos/Sens, Lada 2108…).
- **Refresh automation.** New `scripts/src/derived-refresh.ts` (+ CLI `refresh-derived.ts`, `pnpm db:refresh-derived`) runs fuel-stats,
  safety-stats and vdb-stats. `ingest.ts` calls it after every registry refresh unless `--skip-derived`; `ingest-full.ts` skips it in its
  child ingests and runs it once at the end; `ingest:all` passes `--skip-derived` and runs `db:refresh-derived` after the CSV loads.
- **About** lists VehiclesDB with the CC-BY credit; i18n keys `vdb.*`, `stats.vdb.*`, `about.source.vehiclesdb` in ua/ru/en.
- **Not done / follow-ups:** see DATASETS_PLAN.md "Known gaps" and "Remaining ideas".

### Test-drive racer game ✅ BUILT (2026-10-08, uncommitted when written)

A "Free test drive" promo opens a pseudo-3D racer in a modal. Desktop only, online only, no PWA precache.

- **Source and licence.** Engine ported from jakesgordon/javascript-racer v4 (MIT). Its **sprites are ripped from Sega's OutRun and its music is licensed to that project only** (its README), so neither is used: all sprites, the sky/hills/tree layers and the sound are generated in code. Credit: modal footer + the header comment of `engine.ts`.
- **Engine** `apps/web/src/lib/racer/`: `engine.ts` (`createRacer(canvas, config, onHud)` → `setConfig / restart / setSound / destroy`; fixed 60 Hz step, projection, road builder and traffic AI as in the original), `sprites.ts` (canvas-drawn atlas: 7 car bodies in rear view, semis, pine/oak/poplar/bush/boulder/sunflowers, road posts, billboards carrying `carsua.app` and the player's plate; `makeBackdrop` layers tile seamlessly over 1280 px), `config.ts` (option lists are `as const`-derived, themes, `bodyForKind`, `sceneryForHour`, share token `encodeRaceConfig`/`decodeRaceConfig`, `RACER_SIZE_KB`), `sound.ts` (Web Audio: speed-following engine tone, off-road rumble, crash, lap chime; the AudioContext is only created when sound is switched on). Best lap in localStorage `carplates.racer.best`.
- **UI** `apps/web/src/components/game/`: `RaceGameButton` (banner xl+, 🎮 circle on lg, hidden below; absolutely positioned in the card wrapper to the right of the card at `top-0`; the tilt toggle moved to the left of the card; revealed after `REVEAL_DELAY_MS` = 3 s, instantly later in the session, fade/slide via Tailwind `starting:`), `RaceGameModal` (intro → playing; HUD overlay; 🔗 share; sound toggle), `RaceGameSettings` (+ `RaceGameGroup`/`RaceGameChip`; chips blur after a click so the keys keep steering), `use-race-game-actions.ts` (dynamic `import()` of the engine after the confirm click; creates/destroys the racer; remembers `carplates.racer.loaded` so later opens show a plain Start instead of the size notice).
- **Settings (all live, the lap carries on):** colour (starts as the registry colour, + free picker), body type (starts from the vehicle kind), scenery day/sunset/night/winter (starts from the local clock; winter is never auto-picked), lanes 2/3/4, traffic few/normal/many, resolution 640/1024/1280. Sound is off by default and not remembered.
- **Share link:** `?section=race&tab=<body>-<scenery>-<lanes>-<traffic>-<quality>-<hex>` (+ `lang`); `'race'` added to `SHARE_SECTIONS`. Opening it shows the intro with those settings (the download is never automatic). Decoding validates every part. The API ignores `section`/`tab`.
- **PWA.** `vite.config.ts` `globIgnores`: `assets/RaceGameModal-*.js`, `assets/engine-*.js`. Real size: engine 6.9 KB + modal 3.3 KB gzip.
- **Gotchas.** (1) `import { type Racer } from '…/engine'` keeps a side-effect import and pulls the engine into the modal chunk — use `import type` (Vite warns INEFFECTIVE_DYNAMIC_IMPORT). (2) The Card's tilt transform breaks `position: fixed`, so the modal is a portal (as Model3dModal). (3) Arrow keys are `preventDefault`ed on the window while the racer lives. (4) The wrapper's top edge is the card's top edge, so `top-0` aligns the side controls with the card. (5) Update `RACER_SIZE_KB` after big changes: read the chunk sizes from `pnpm build`.
- **i18n:** `race.*` (incl. `race.banner.*`) in ua/ru/en. **Follow-ups:** see PLAN.md "Test-drive racer game".
