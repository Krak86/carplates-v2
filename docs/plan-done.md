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

#### Alias passes — factory indexes and engine-code names (2026-10-09)

The registry stores factory indexes (`21104`, `110307-42`, `T13110`) and engine-code names (`E 270 CDI`, `116 i`, `corolla 1.33l`) that Commons /
Wikipedia know under a marketing name. `packages/shared/src/wikiAliases.ts` (`wikiSearchName(brand, model)`, unit-tested) returns the search
brand/model + a Wikipedia `leadQuery` (Cyrillic where the article is ru/uk-named); `scripts/src/wiki-images.ts` uses it for the Commons title search,
year/title matching and the lead-image stage (cached under a `-alias` slug). **Rows keep the registry key** — only the search is aliased.
`--aliased` selects every aliased model of any size and redoes it even when stored `not_found`. Rules key on the **first word of `brand`**, because many
registry rows carry the model inside `brand` (`ваз 21063`, `заз-daewoo t13110`, `mercedes-benz e 200`) — the first pass missed those (the biggest groups).

Runs: pass 1 = 447 models, pass 2 (brand-with-model rows) = 752, pass 3 (GAZ/UAZ/LuAZ/IZh, Geely MK, Mercedes ML/GL/Sprinter, Smart, Lexus,
Kia Magentis, … + trailing-engine-size strip) = 919 (834 photo, 83 not_found, all tiny trim-code models); 0 failures left; seed CSV re-exported.

**Coverage-script bug found on the way:** `wiki-images-coverage.ts` grouped by `lower(btrim())` without collapsing whitespace while the pre-warm
(`wikiImageKey`) collapses it — the registry holds `DAEWOO  LANOS`, so ~⅓ of cars showed as "not processed". Fixed (`[[:space:]]+` → one space;
a JS template literal turns `'s+'` into `'s+'`, so use the POSIX class). **Real coverage: 62.8% → 98.0% of registered cars** (13.10M; 266k cars / 2.0% still not_found).

Not used: autoussr.ru, zaz.drive.place, zaz.ua, 24tv, sovietcarmodels.com — copyrighted press/manufacturer photos; only freely licensed Commons files are
stored (hotlinked, author + licence kept). They remain a reference for index → model names. Open items: PLAN.md "Wikimedia hero-image cache".

**2026-10-10 follow-up — live fallback + not_found tail:** `wiki.service.ts` (`fetchLeadImage`, `fetchCommonsYearImage`) now searches under `wikiSearchName` too (Cyrillic lead
titles accepted for aliased models, as in the script), so an aliased model missing from the table no longer misses live. New alias rules for the biggest
`not_found` models: a model repeated in the brand (`seat leon` + `leon` → brand `seat`; guarded so `land rover` + `range rover` is untouched), Geely JL7152 / CK-2 / FE-1,
UAZ 3151/469/3163/2206, GAZ 3221/2217/31105, IZh 2125/2717, Lada Granta (2190/2191), Daewoo Sens `t1311` / Nubira / `lanos tf69y`, Mercedes Vito / T1 / G-Class /
old numeric names (200, 230 е, 190 → E-Class / 190; Cyrillic "е" normalised), BMW `330е`, Infiniti G/EX/QX/JX/M, Mazda `2`, Citroen `c 2`, Volvo `v40cc`, Peugeot `e2008`, VW CC / LT.
`--aliased` was run and **stopped early** (≈1,800 of 2,212 models; cache on disk, re-run resumes). Seed CSV re-exported (112,833 rows).
**Coverage 98.0% → 99.0%** of cars (not_found 266k → 126k cars; 12.2k groups). Left: Geely JL7162 / FE-2, Honda M-NV, СКС RDS-02РП (special vehicles), Fiat Grande Punto /
Doblo Panorama / Nuovo Doblo, Kia Optima, Renault Taliant, ZAZ T13010 / TF69 (check the Chance mapping), 47 groups `failed` (run `--retry-failed`).

**2026-10-10 second session — tail pass:** `--aliased` resumed to the end (1,838 models; 300 gained a photo), `--retry-failed` cleared the failed groups
(one left, `вс cj cj`, now `not_found`). New rules: Fiat (Nuovo) Doblo / Doblo Panorama → Doblo, Kia Sorento `jc 5248`, Mitsubishi L400 / Space Star ("speace star") /
Carisma ("carizma") / Pajero trims, Peugeot Expert and trim words after the number (`307 xs 2.0 e` → 307), Geely LC (`lc-1a`) and FC (`mr-7180`). Two findings:

- **Diacritics broke title matching.** `normalize` in `commonsImage.ts` dropped every non-`a-z0-9` character, so "Doblò" became "dobl" and never matched "doblo"
  (same for Citroën, Škoda …). It now folds diacritics (NFD) first; this also helps the live API fallback.
- **The pre-warm cache is not keyed by the search query**, only by the group plus an `-alias` suffix. After changing an alias rule, delete that group's `-alias`
  files from `scripts/.data/wiki-images/{search,lead*}/` (glob by brand) before re-running `--aliased`, or the stale `null` lead is reused (that hid Sorento / Pajero / L400).
  **Coverage 99.0% → 99.1%** of cars (not_found 126.1k → 114.7k cars; 11.4k groups). Seed CSV re-exported (112,842 rows). Still `not_found` (left unmapped on purpose):
  Geely JL7162 (~9.8k cars; model line unclear), Honda M-NV (4.3k, Chinese EV with no Commons photos), СКС trailers (~10k, no photos expected), Fiat 220L / 223L / 230L,
  Renault Taliant / FCT, ZAZ T13010 / TF48YP, Geely FE-2 / CE-1 / CE-2 / GC2 / MK-2. Fiat Doblo resolved only through the lead image.

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

2026-10-11: Google Translate and Hugging Face / OPUS-MT (the on-device "Translate" sources) added; Wikidata and DVSA got logos (`wikidata.svg`, `dvsa.svg`, `huggingface.svg`). Euro NCAP stays logo-less (its terms forbid reusing the mark).

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

### Accounts — Telegram sign-in ✅ BUILT (2026-10-13)

Second provider next to Google; same session machinery (`carsua_sid`, sliding `SESSION_TTL_DAYS`).

- **Flow:** Telegram Login Widget (script injected only when the sign-in popover opens, `lib/telegram-login.ts`, global callback `carplatesTelegramAuth`) → signed user object → `POST /api/auth/telegram` (20 / 15 min, counted as `login`) →
  `verifyTelegramLogin` (`apps/api/src/auth/telegram-login.ts`): HMAC-SHA256 keyed with SHA256(bot token) over the sorted `key=value` check string (all fields incl. unknown ones), `timingSafeEqual`, `auth_date` ≤ 24 h old / ≤ 60 s in the future.
- **Identity:** `auth_identities ('telegram', <numeric id>)`, stable across renames. **No email, no phone** → migration `0066_users_email_nullable.sql` drops `NOT NULL` on `app.users.email` (unique index keeps NULLs distinct); `SessionUser.email` is `string | null`, UI falls back to name.
  Telegram users are never merged into Google accounts (nothing verified to match on) — linking is the open "add email" item in PLAN.md.
- **Config:** `TELEGRAM_BOT_TOKEN` (secret) + `TELEGRAM_BOT_USERNAME`; both needed, else `auth/config.telegramBotUsername` is `null` and the button is hidden / the route answers 503. BotFather `/setdomain` needs https →
  local test through a tunnel (`cloudflared tunnel --url http://localhost:5173`; the free domain changes on every restart, so re-run `/setdomain`). `localhost` gives "Bot domain invalid".
- **Web:** `TelegramSignInButton` (lazy, `globIgnores`d from the PWA precache) under the Google button in `LoginButton`; `useAuthActions().signInTelegram`.
- **Legal/About:** privacy paragraph `legal.privacy.account.p` and the `about.source.telegram` entry (ua/ru/en) updated; `docs/legal-and-monetization.md` notes provider data.
- **Tests:** `telegram-login.test.ts` (valid, extra signed fields, wrong token, tampered field, expired/future, malformed).

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

### VehiclesDB polish + plate-region table fix ✅ BUILT (2026-10-08, stages A/A2/A3 of DATASETS_PLAN.md)

- **Cross-make alias**: `CROSS_MAKE_ALIASES` / `vdbRelatedMakeKeys` / `matchVdbModelAcrossMakes` in `packages/shared/src/vdbMatch.ts` (Renault
  Dokker = Dacia Dokker; +15,031 cars, `stats_vdb` 92.7%); API and `scripts/src/vdb-stats.ts` share it.
- **Result card**: `/api/vdb` returns `crossMake` + `aliases` (`displayAliases`); one "🏷️ Also known as …" chip (cross-make name + aliases), popover names
  bold+underlined via `InfoText`'s `highlight` prop, alias lines and an "approximate match"
  line (`how === 'prefix'`) in the "?" popover. **/stats** Markets panel: `formatShare` (one decimal under 1%).
- **Plate regions**: `REGIONS` was the v1 table with 54 of the statute's 108 pairs and `КК` wrongly = Crimea; now all 108 (МВС order № 166
  Додаток 4), `КК` = Kyiv, `LEGACY_REGIONS` + code 31; migration 0045 mirrors it to `registry.plate_regions`; `regions.statute.test.ts` holds
  a fixture copied from VehiclesDB's `plates/_decode/ua-regions.yml`. Needs `pnpm db:refresh-stats` to reach the region rollups.

### Test-drive racer game ✅ BUILT (2026-10-08, uncommitted when written)

A "Free test drive" promo opens a pseudo-3D racer in a modal. Desktop only, online only, no PWA precache.

- **Source and licence.** Engine ported from jakesgordon/javascript-racer v4 (MIT). Its **sprites are ripped from Sega's OutRun and its music is licensed to that project only** (its README), so neither is used. Roadside scenery (trees, signs, billboards) and the sound are generated in code; cars and the photo backdrops are real assets (see "Racer art pass" below). Credit: modal footer, About (`about.source.racer`) and the header comment of `engine.ts`.
- **Engine** `apps/web/src/lib/racer/`: `engine.ts` (`createRacer(canvas, config, onHud)` → `setConfig / restart / setSound / destroy`; fixed 60 Hz step, projection, road builder and traffic AI as in the original), `sprites.ts` (canvas-drawn atlas: 7 car bodies in rear view, semis, pine/oak/poplar/bush/boulder/sunflowers, road posts, billboards carrying `carsua.app` and the player's plate; `makeBackdrop` layers tile seamlessly over 1280 px), `config.ts` (option lists are `as const`-derived, themes, `bodyForKind`, `sceneryForHour`, share token `encodeRaceConfig`/`decodeRaceConfig`, `RACER_SIZE_KB`), `sound.ts` (Web Audio: speed-following engine tone, off-road rumble, crash, lap chime; the AudioContext is only created when sound is switched on). Best lap in localStorage `carplates.racer.best`.
- **UI** `apps/web/src/components/game/`: `RaceGameButton` (banner xl+, 🎮 circle on lg, hidden below; absolutely positioned in the card wrapper to the right of the card at `top-0`; the tilt toggle moved to the left of the card; revealed after `REVEAL_DELAY_MS` = 3 s, instantly later in the session, fade/slide via Tailwind `starting:`), `RaceGameModal` (intro → playing; HUD overlay; 🔗 share; sound toggle), `RaceGameSettings` (+ `RaceGameGroup`/`RaceGameChip`; chips blur after a click so the keys keep steering), `use-race-game-actions.ts` (dynamic `import()` of the engine after the confirm click; creates/destroys the racer; remembers `carplates.racer.loaded` so later opens show a plain Start instead of the size notice).
- **Settings (all live, the lap carries on):** colour (starts as the registry colour, + free picker), body type (starts from the vehicle kind), scenery day/sunset/night/winter, lanes 2/3/4, traffic few/normal/many, resolution 640/1024/1280. **Since 2026-10-08 scenery, backdrop, lanes, traffic and resolution start random on every opening** (`randomScenery`/`randomBackdrop`/`randomLanes`/`randomTraffic`/`randomQuality` in `config.ts`; a share link overrides them; the old `sceneryForHour` clock rule is gone) **and the HUD shows speed only** (the top-right lap/last/best readout was removed from `RaceGameModal.tsx`; lap timing and the stored best lap still run in the engine, the `race.hud.lap|last|best` strings are unused). Sound is off by default and not remembered.
- **Share link:** `?section=race&tab=<body>-<scenery>-<lanes>-<traffic>-<quality>-<hex>` (+ `lang`); `'race'` added to `SHARE_SECTIONS`. Opening it shows the intro with those settings (the download is never automatic). Decoding validates every part. The API ignores `section`/`tab`.
- **PWA.** `vite.config.ts` `globIgnores`: `assets/RaceGameModal-*.js`, `assets/engine-*.js`. Real size: engine 6.9 KB + modal 3.3 KB gzip.
- **Gotchas.** (1) `import { type Racer } from '…/engine'` keeps a side-effect import and pulls the engine into the modal chunk — use `import type` (Vite warns INEFFECTIVE_DYNAMIC_IMPORT). (2) The Card's tilt transform breaks `position: fixed`, so the modal is a portal (as Model3dModal). (3) Arrow keys are `preventDefault`ed on the window while the racer lives. (4) The wrapper's top edge is the card's top edge, so `top-0` aligns the side controls with the card. (5) Update `RACER_SIZE_KB` after big changes: read the chunk sizes from `pnpm build`.
- **i18n:** `race.*` (incl. `race.banner.*`, `race.body.*`, `race.backdrop.*`) in ua/ru/en. **Follow-ups:** see PLAN.md "Test-drive racer game".

#### Racer art pass: rendered car sprites, photo backdrops (2026-10-08)

- **Cars.** Rear-view sprites rendered from 3D models by `scripts/racer-render/` (three.js in a browser tab, **no Blender**): `serve.mjs <Kenney 'Models/GLB format' dir> <out dir> [photos dir]` serves `render.html` (models → `exportModel` / `renderCustom`), `backdrop.html` (`/bg`: photos → layers) and `preview.html` (`/preview`: inspect a model; `parts()` paints each material to find the body paint); the pages POST WebP files back to the server. Per model: `<name>.webp` + `-l`/`-r` steering and, for tintable ones, a transparent `<name>[-l|-r]-mask.webp` of the body paint; `assets/plates.json` = number-plate rect per file (Zod-parsed). Runtime `vehicle-assets.ts` (top-level await, so the engine chunk resolves after decode): tint = colour layer clipped to the mask, multiplied over the grey-bodied render (very dark paints are lifted to rgb 34 so shading survives), plate painted into its rect. `BODY_MODEL` maps each `CarBody` to a model; a missing model falls back to the procedural car in `sprites.ts`.
- **Sources / licences (first round — the Kenney sedan/hatch/sport/suv/pickup/van and the Quaternius bus were later replaced by the Sketchfab rounds below).** Kenney **Car Kit** (CC0): sedan, sedan-sports (sport), hatchback-sports (hatch), suv, truck (pickup), van + taxi, police, ambulance, firetruck, garbage-truck, delivery, truck-flat. Kenney models share one 512 px `colormap.png` palette, so body paint = a texture cell (`cellsOf` lists cells by area; sedan 13,1 / hatch 7,1 / suv 7,1+7,2 / pickup 7,1 / van 15,1; the plate swatch is cell 13,2). **Bus** = Quaternius Public Transport `Bus.obj` (CC0; its MTL has no colours, so `renderCustom` assigns flat colours per material; body = `Top`). **Motorbike** = Sketchfab "Motorcycle" by animanyarty (**CC BY 4.0, credited on About**; body = material `Moto_2.002`). Rejected: Kenney Pixel Vehicle Pack (side views only), HCR2 bus (open back). The Poly Pizza links offered were Poly-by-Google CC-BY 3.0 and were not used.
- **Gotchas.** (1) Steering files are named by camera yaw, which leans the car the opposite way: Kenney models swap them in `vehicleSprite`, but the custom-rendered `bus`/`moto` were rendered with the opposite camera handedness and do **not** (`CUSTOM_RENDERED`) — check any new custom model in the game. (2) Long vehicles need a small `steer` yaw in their spec (bus 5°, moto 10°) or the crop box grows with the side face. (3) `LOGICAL_PER_PX = 0.26`: the sedan lands at the old 80 units. (4) `scripts/node_modules/sharp` can be a stale pnpm symlink — the render tools deliberately need no sharp. (5) Windows can hold `assets/*.webp` open (dev server), so `cp` fails with Permission denied — stop `pnpm dev`, copy, restart.
- **Second model round (2026-10-08).** Hatch = Sketchfab "Hatchback" by MaG80 (CC BY 4.0, material `CarPaint`, `hide: ['Shadow']`), sport = "Low-poly sports car" by JUFF (CC BY 4.0, material `Material.001`); files `hatch-mag80*` / `sport-juff*` (custom-rendered, so listed in `CUSTOM_RENDERED`; the old Kenney `hatchback-sports`/`sedan-sports` files are gone). Credited on About. Rejected from the owner's `models_2`: AMC Matador sedan and Osaka City Bus (**CC BY-NC**, not allowed), pickup (a lifted monster truck), SUV and PS1 van (paint baked into texture atlases, can't be tinted), the 657k-triangle sports car (20 MB). **Third round (`models_3`)**: sedan = "Generic Toyama XR Sedan" by mk2design (CC BY 4.0, `Body_Paint`, hide `Shadow`, `colors` for the red/orange tail-light materials), van = "GMC Vandura 1976 Van" by snafuj (CC BY 4.0, `Body.001` — a textured body material still tints, because the mask only needs the material identity), files `sedan-toyama*` / `van-gmc*`. Rejected there: all five buses and the Ford F-350 / van-game-asset (**"SKETCHFAB Standard" licence — not CC, not redistributable**; always read `asset.extras.license` in the GLB), both pickups (single atlas material, body can't be separated), Bentley (plough + boat), PSX sedan (single material), Futuristic SUV (reads as an open-bed EV pickup). **Fifth round (`models_5`)**: pickup = "Pickup Truck" by Han66st (CC BY 4.0, material `pickup1_body`, 1.2k triangles, crew cab with closed tailgate; plate on the tailgate), files `pickup-silv*`; the Kenney `truck*` sprites are gone (`truck-flat*` stays). Passed over: Conquer '89 (compact single cab) and the roll-bar commercial truck. Only the Kenney van-family specials (taxi, police, ambulance, fire, garbage, delivery) and the Sketchfab motorbike are left from the earlier rounds. **Fourth round (`models_4`)**: SUV = "Mid Size Off Road SUV" by Houdini1561 (CC BY 4.0, material `carpaint`, 1.25M triangles / 44 MB — fine, it is only rendered offline; plate sits on the bumper under the spare wheel), bus = "Green Bus Low Poly" by cgart.com (CC BY 4.0, own livery, never tinted), files `suv-hummer*` / `bus-green*`; the Quaternius bus credit is gone from About. Rejected there: the MAZ 203 bus (476-unit scale, 17 MB, renders nothing at default camera), the rotted USSR bus (ground plane), the white city bus (fine, but the green one fits the style), Orange SUV and the other SUVs (single atlas material), Suburban (faces the other way, ~40 textured materials), the Dodge/VW/European vans (the GMC van already works). `render.html` specs gained `hide` (drops baked-in shadow planes); `serve.mjs` also serves already-saved sprites so plate rects can be measured on a grid.
- **Sixth round (`models_6`, 2026-10-11).** Bus = Sketchfab "City bus" by MaG80 (CC BY 4.0, material `BusPaint`, `hide: ['Shadow']`, `rearYaw` 180, `width` 1.6, `steer` 5, 14k triangles), files `bus-city*` — it replaces the green cgart bus (`bus-green*` deleted), and unlike it the bus now **takes the viewer's paint** (mask) and traffic buses get a random colour (`makeAtlas` passes `pick(colors)` to the heavies; models without a mask ignore it). Verified in the game: tint, plate on the bumper, steering direction. **Brand badge**: the badge position follows the per-view plate rect in `plates.json`, so those rects must be measured per steering view (the Kenney ambulance/police/garbage/firetruck/taxi ones were auto-detected wrongly and the badge stayed put or shrank — re-measured by hand on a gridded contact sheet); its size comes from the straight view's rect, never the steering one; `LOGO_LAYOUT` overrides size/height per model (bus: bigger, mid-panel). Rejected: Mentalist "Bus" (61k triangles, 24 textures, body material is a textured atlas shared with the interior), Ecoline (hollow — the interior shows through the rear), SMP bus (3 materials, no tail lights), White Bluebird (tints fine and is a school bus — runner-up). `render.html` needs `/colormap.png` to finish loading: for non-Kenney model folders drop any PNG named `colormap.png` into the out dir.
- **Seventh round (`models_7`, 2026-10-12) + siren/horn.** Own-livery replacements (never tinted, no masks; all CC BY 4.0, **credit them on About**): police = "Police car" by Mateusz Woliński (`police_car.glb`, `rearYaw` 180), ambulance = "russian ambulance" by REM_Yankee (`rearYaw` 180), firetruck = "Fire Engine" by elenaisakova248 (`rearYaw` 180), taxi = "Canyon '75 Taxi" by Daniel Zhabotinsky (`rearYaw` 270, `widthAxis: 'z'`). All four are in `CUSTOM_RENDERED` (no steering swap). Plate rects re-measured per view on a gridded sheet. No garbage truck was in the folder (the Kenney one stays). Rejected: `fire_truck.glb` (KHR_materials_pbrSpecularGlossiness renders black in three 0.170), Crown Victoria taxi (cyan glass), the Lancer police and the Raf/Shvan ambulances (runners-up). **Sound:** `SIRENS` (emergency bodies only) and `HORN_HZ` in `config.ts`; `sound.ts` `setSiren` / `setHorn` are synthesised, independent of the 🔊 toggle (the viewer's own click creates the AudioContext). Siren = toggle button (under the canvas and on the touch overlay; state keyed to the body, so switching car silences it); horn = hold the button, the touch 📯 button or the H key (`RacerInput.horn`).
- **Special vehicles.** `CAR_BODIES` also has taxi, police, ambulance, firetruck, garbage, bus (own livery, never tinted in traffic). `bodyForKind(kind, bodyText)` reads the registry `body` text (ПОЖЕЖ→firetruck, МЕДДОП/САНІТАР→ambulance, СМІТТЄВОЗ→garbage, ПІКАП→pickup, ХЕТЧБЕК→hatch, КУПЕ/КАБРІОЛЕТ→sport, МІКРОАВТОБУС/ФУРГОН→van); taxi/police are manual chips only (no registry value says taxi/police). `bodyText` is plumbed ResultCard/VinResult → RaceGameButton → RaceGameModal.
- **Top speed per category** `TOP_SPEED_KMH` (config.ts; sport/police/moto 120 … garbage 70; HUD km/h = speed/100, engine ceiling 120); acceleration scales with it. The numbers are guesses.
- **Photo backdrops.** `backdrops/bg-<id>-sky|ridge.webp` (1280x480, mirror-tiled so they wrap; ridge = the photo with the sky colour-keyed out, opaque dark base below the horizon at y=256) for `BACKDROPS` = carpathians (SAM_2970), spruce (DSC_0026), forest (SAM_2922), grove (20150819), all the owner's own photos (~50-120 KB per id, 408 KB in total). **Lazy**: `backdrop-assets.ts` fetches only the chosen id; the hook awaits it before the first frame and `setConfig` swaps it live. Day uses the photo sky; sunset/night/winter keep the generated sky (stars/moon) and wash the ridge (`PHOTO_WASH` in sprites.ts, `source-atop`). Random id at modal open, chips + 🎲 in settings, last part of the share token (`…-<hex>-<backdrop>`). Rebuild: `serve.mjs` + `/bg`, `build(photo, {skyX, skyY, ridgeX, ridgeY})` then `save(id)`.
- **Full screen + mobile (2026-10-11, untested on real phones).** ⛶ button (`requestFullscreen()` on the canvas + HUD wrapper in `RaceGameStage.tsx`; iPhone fallback = pseudo-full-screen `fixed inset-0` + ✕), `Racer.setInput` + `RaceTouchControls` / `RaceTouchButton` (pointer capture, `(pointer: coarse)` only), portrait "rotate" hint, settings in a collapsed `<details>` on touch, a "test drive" chip, touch intro/controls texts. Not done: landscape lock, lower default resolution on touch, tilt. Design notes: `GAME_PLAN.md`.
- **Live updates.** `setConfig` only swaps the player sprites when just colour/body/plate changed (road, scenery and traffic keep their state); scenery/lanes/traffic/quality still rebuild the world.

### VehiclesDB stage B — motorcycle / truck / bus matching ✅ BUILT (2026-10-08, stage B of DATASETS_PLAN.md)

- Migration 0046 adds `vehicle_kind` (car/motorcycle/truck/bus) to `registry.vdb_models` / `stats_vdb`; `vdbVehicleClass` maps the registry `kind`,
  `vdbCatalogKinds` limits which catalog kinds a class may match, so a truck never matches a car with the same name.
- `/api/vdb/stats` and the `/stats` Markets panel report coverage per class. Open items and gaps: DATASETS_PLAN.md "Known gaps".

### RDW specs (EU / NL) ✅ BUILT (2026-10-08, stages C / C2 / C3 + regroup of DATASETS_PLAN.md)

CC0 Dutch-registry aggregates shown as a collapsible "Specs" block ("EU (NL) data") on the result card. Convention, file map and gotchas:
`docs/features-reference.md` "RDW specs"; flags: `docs/commands-reference.md`; refresh cadence: `SCHEDULE.md` (6 months).

- **C** (`51f8395`, migration 0047): min / median / max of power, displacement, unladen mass and CO2 per kind/make/model/year from one
  server-side joined SoQL query per make (~17M raw rows never downloaded); `GET /api/rdw`, `rdwMatch.ts`, Specs block, About credit, Emissions
  section falls back to RDW CO2.
- **C2** (`26296e8`, migration 0048): gross mass, wheelbase, seats, doors, towing, length/width/height, top speed; partially filled measures
  carry `*_n` and are hidden under `RDW_MIN_DISPLAY_N` (10).
- **C3** (`495e77f`, migration 0049): NL new price (incl. VAT/BPM), kerb mass, cylinders, consumption, EV kWh/100 km and range, noise, jsonb
  tallies (fuel mix, colours, body types, energy labels) shown as `RdwShareRow` chips; hybrid fuel-row-2 join; ingest BATCH 500 (114 columns
  hit the bind-parameter limit).
- **Regroup** (`4e0927f`): rows in 📂 folders (`SPEC_GROUPS`), electric rows hidden for combustion cars and vice versa (`appliesToFuel`), the
  open-recalls row removed (data kept for stage D), Emissions rendered right after Specs.
- **Size-class scale bars** (`fd56f1f`): `RdwScaleBar` under wheelbase/length/width/height (class ticks, model min-max shade, median dot).

### VIN page: typical model data + localized decode ✅ BUILT (2026-10-08, `1bb6bfd`, `9334754`)

- **Typical data** (`components/vin/VinTypicalData.tsx`, `typicalLookup` in `helpers.ts`): VehiclesDB chips + RDW Specs + Emissions for the VIN's
  make/model/year, framed "≈ typical, not decoded"; NHTSA make/model/year/fuel/type/displacement are mapped to the registry-style inputs the
  plate-card components expect, and the block says so when those inputs were themselves estimates (registry / VIN prefix / year code).
- **Localized decode** (`vin-text.ts`, `use-vin-text.ts`): all 140 NHTSA variable names and ~330 enumerated values translated for ua/ru
  (compound values part by part, context overrides, localized units, plant country via `Intl`), English original shown beside; keys
  `vin.var.* / vin.val.* / vin.vv.* / vin.unit.*`. The Raw tab stays English. Fixed the wrong NHTSA names for ABS and rear cross-traffic assists.
- Crash ratings and wiki info render in the Overview tab only (`overviewExtras` slot of `VinDecodeTabs`), so Raw stays exact decode data.

### RDW recalls (stage D of DATASETS_PLAN.md) ✅ BUILT (2026-10-09, uncommitted when written)

Model-level recall campaigns from RDW open data as a collapsible "Recalls" block on the result card (EU (NL) data, RDW's Dutch text). Details, file map and decisions:
`DATASETS_PLAN.md` "Stage D — done"; conventions: `docs/features-reference.md` "RDW recalls".

### Small web polish (2026-10-08)

- **Copy on click:** clicking the plate or VIN on the result card copies it and still navigates (`use-copy-feedback.ts` shared with `CopyButton`).
- **Shareable AR scan:** the AR dialog's open state is `?section=ar` (`'ar'` in `SHARE_SECTIONS`) with a 🔗 button in the header.
- **No paid wording:** see PLAN.md Phase 5 Stage A.
- **AVIF-first images** (`ba6a5b5`, `d8abc4e`): backgrounds via vite-imagetools avif q50 + webp q70 in `image-set(type())` with a `CSS.supports()`
  guard; kind placeholders as `<picture>`; `public/logos` PNGs downscaled (8.45 -> 5.0 MB, kept PNG for the OG renderer / report export);
  `build.target` pinned to Chrome/Edge 111, Firefox 128, Safari 16.4.

### Load-performance pass ✅ BUILT (2026-10-09, uncommitted when written)

Trigger: the dev server showed ~22 MB / 337 requests before the first result. That was Vite's unbundled dev serving (HTTP/1.1,
`.tsx` sources), not production; the real first view was 446 kB gzipped JS+CSS (`pnpm preview:prod` + summing the
`index.html` references). After this pass: **302 kB gzipped** + one ~60 kB language file.

- **`LazySection`** (`components/LazySection.tsx`): result-card sections below the fold (specs, emissions, ratings, reviews, videos,
  wiki, nearby, photos, news, social, stock) mount only within 600 px of the viewport (`IntersectionObserver`), behind a
  collapsed-header-height placeholder, or at once when `?section=<id>` targets them (`sections` prop). Latched. Each section still
  scrolls/opens itself on mount, so share links keep working (a short delay while the chunk loads). Not lazy: basic, VIN, history,
  verification, value chip, paid sections (session-dependent).
- **Idle UI:** photo/camera/AR/VIN-photo buttons moved to `SearchButtons` (loaded via `useIdleReady`, reserved row height); favorite
  button and vehicle SVG icon lazy with reserved slots; `VinResult` lazy in `SearchRoute` (keeps VIN-only sections out of the entry graph);
  hero image `fetchPriority="high"`.
- **i18n per language:** `ua/ru/en.json` are separate chunks; non-ua also loads `ua` (the fallback — en lacks ~480 keys). `main.tsx`
  awaits `i18nReady`; `setLang` is async with `langLoading` (sidebar spinner, buttons disabled meanwhile, last pick wins, offline failure
  keeps the current language). Tests `await i18nReady`.
- **Chunking** (`vite.config.ts`): `vendor-react|query|i18n` for cache stability, `helpers-ratings|specs|value|media` for pure helpers
  shared by lazy chunks. Components are never grouped (would pull a group into the first load).
- **Tooling/docs:** `pnpm preview:prod` (+ `apps/api/preview.env`) builds and serves the SPA from Nest; `docs/deploy.md`
  (Caddy/nginx/Cloudflare h2/h3, Brotli, UDP 443).
- **Verified in Chrome** on the production build: no console errors; `?section=news` opens and scrolls to News. Not measured: Lighthouse,
  LCP/CLS before vs after.
- **Left:** the full prioritised list (measure for real, language preload, Brotli, edge cache, eager chunks, hero preload, PostHog delay) is tracked in PLAN.md Phase 4.

### Estimated value, weight rankings, community widgets and export ✅ BUILT (2026-10-09, `86cc500` … `bb9f055`)

Write-ups of the conventions are in `docs/features-reference.md` ("Estimated value", "Weight rankings", "Community posts", "Export, wiki text
and brand logos"); this entry records what shipped and why.

- **C4 estimated value** (`86cc500`, `1bd058a`, `fb512f5`, `ca1fe0a`): chip `~ € X–Y` = Dutch new price (RDW C3 median) x BPM depreciation
  curve, plus Ukrainian import customs (duty 10 %, excise, VAT 20 %) and NBU EUR/USD/UAH (`GET /api/fx`, cached 6 h, stale on error). No ingest
  except `rdw_specs.price_by_fuel` (migration 0050; RDW re-ingested, 106k rows). Range ±15 % to 10 y widening to ±35 % at 20 y+; 5 % old-car
  floor (our assumption, flagged). Per-fuel "New price by version" table, copy button (shown currency only), NBU "?" popover and dated-table
  link in the UI language. Never called a market price; AUTO.RIA is a link only. Design notes: `DATASETS_PLAN.md` "Stage C4 — done".
- **Weight rankings** (`3f7a596`, `131e5ba`): migrations 0051-0053 `registry.stats_weight`, `db:refresh-weight-stats`, `/api/stats/top`
  `weightBoards`, `/stats` panel with vehicle-group tabs, home cards, 🏋️ / 🪶 chips. Home fuel/safety/weight/news sections are `LazySection`s
  that start their fetch and chunk only on approach (`fallback` prop keeps placeholder height).
- **Stack Exchange + Lemmy** (`5e26e82`, `bb9f055`): keyless browser-side searches in the Social section and as a second side-widget column
  (>= 1760 px); About sources entries with icons (Stack Exchange, Lemmy, NBU, plus RDW / Belastingdienst from `565e57f`).
- **Export** (`2458f32`, `d360c7e`): "Copy all info" gathers RDW, VehiclesDB, reviews, value breakdown and NBU rates; new `chart` section; per-format
  icons in the menu. VIN typical data moved to the VIN page only.
- **Wiki** (`5606461`): "Read more" body, description subtitle, English fallback. Stage I (car generations) proposed in `DATASETS_PLAN.md`
  with a probe script (`scripts/src/wiki-generations-probe.ts`), not started.
- **Logos / chips** (`fb93ac6`, `f1d5cd5`, `565e57f`): brand logos as capped WebP (4.8 -> 1.8 MB), logo in the sticky header; stable header chip
  row with a skeleton + `animate-chip-in` (`useChipsPending`); side widgets latch once shown (`useScrolledOnRoute`); test-drive banner click hint.
- **Race** (`fb512f5`, `b202abb`): standalone `/race` route with presets per body type and a km odometer; car label in the modal title.
- **YouTube fallback Day 5** (`5c08787`): +39 models, CSV 1,792 videos (104 models left in the >= 1,000-car tier).

### topgir.com.ua feed and UI polish ✅ BUILT (2026-10-09, uncommitted when written)

- **News source `topgir`** (`scripts/news-sources.json`, `https://topgir.com.ua/feed/`, uk): WordPress automotive portal, 10 items (~1 day), robots.txt only blocks `/wp-admin/`. All 10 sampled items were car news and the `<category>` values are useless (mostly "Новини", some junk tags), so there is **no `onlyCategories`**. First run: 10 items, 5 with a brand, 2 with a model. `/news` chip in `NEWS_SOURCE_GROUPS`; About entry `about.source.topgir` (ua/ru/en) with `icons/sources/topgir.webp` (the site's square "ТЖ" icon at 64x64 webp, ~1 KB — the wide wordmark does not fit the 32 px slot).
- **360° modal:** the model/year chips row moved from the bottom to directly under the Exterior / Interior / Alt. interior tabs (all three views; hidden when there is only one model). Only the "… on CarShow360 / Winner Imports" note stays at the bottom.
- **Advanced-search tooltip** (`SearchField`): bold title `search.advancedToggle` ("Advanced search") + a muted second line `search.advancedHint`, `max-w` 13rem so it wraps instead of covering the "Advanced search" link; the button's `aria-label` is the short title only.
- **Estimated value:** the "Charts and explanation" folder content has `p-3` on all sides (wrapper in `EstimatedValuePanel`, not in `EstimatedValueDetails`, which the chip popover also renders and which is already padded).
- **`SegmentExplainer`** (plate and VIN segment chips + hint): root has `mt-3` above the chips.

### NHTSA recalls + complaints (stage F of DATASETS_PLAN.md) ✅ BUILT (2026-10-10, uncommitted when written)

Live NHTSA API behind a 7-day (recalls) / 30-day (complaints) in-memory cache, merged into the Recalls block as a collapsed "US (NHTSA) data" sub-section (footnote, complaints summary, campaigns) beside a collapsed "EU (NL) data" one, with SVG market flags. No migration, ingest, seed or schedule row.
Full decisions, API quirks (HTTP 400 for no match, `dd/mm` vs `mm/dd` dates) and spot checks: `DATASETS_PLAN.md` "Stage F — done"; conventions: `docs/features-reference.md` "NHTSA recalls + complaints".
Files: `apps/api/src/nhtsa/*`, `apps/api/src/safety/nhtsa-models.ts`, `packages/shared/src/nhtsaRecalls.ts`, `apps/web/src/components/NhtsaRecallList.tsx` / `NhtsaComplaints.tsx` / `RdwRecalls.tsx`.

### Model alias unification (stage M1–M3 of DATASETS_PLAN.md) ✅ BUILT (2026-10-10, uncommitted when written)

- **M1 — one source.** `modelFamily.ts` now holds the ZAZ / Daewoo / Lanos / Sens knowledge: `modelFamily`, `zazFactoryFamily(text, leading?)` and
  the `ZAZ_FAMILY_SEARCH` photo-name table. `wikiAliases.ts` reads the table and the code rules instead of its own copies. Checked against a snapshot of
  `wikiSearchName` / `modelFamily` / `vdbCandidateKeys` over all 74,988 distinct registry brand/model pairs before the change: the only difference
  was the intended `T13010` → Sens photo rule (4 pairs). Existing tests unchanged; new `aliasUnification.test.ts` pins the four Lanos spellings and both Sens codes.
- **M2 — the matcher.** `vdbCandidateKeys` appends the family name and the make-glued name (`lanos`, `daewoolanos`) as `alias` candidates, and
  `vdbRelatedMakeKeys` adds the `daewoo` / `zaz` catalog makes for family rows only. Own make and all earlier keys still win; a miss still hides the section.

  |                                             | before               | after               |
  | ------------------------------------------- | -------------------- | ------------------- |
  | `stats_vdb` cars matched                    | 12,397,984 (92.7 %)  | 12,406,985 (92.8 %) |
  | motorcycles / trucks / buses                | 46.7 / 66.5 / 37.5 % | unchanged           |
  | RDW-matched passenger cars (`stats_weight`) | 9,615,654            | 9,982,106           |

  Explained per group with the HEAD matcher against the new one: stats_vdb +9,001 cars = Sens 4,839 (`daewoo|sens`, `zaz|sens`), Lanos 2,829, Nubira 1,286,
  Leganza 47 (previously no match); RDW ≈ +333k newly matched = Lanos 327,577 (RDW files it as `daewoolanos`, so the plain key never hit), Leganza 2,613,
  Nexia 1,491, Nubira 1,286; a further 39k Nexia cars move from a trim row (`nexia15igl3d`) to the generic `daewoonexia`. The `stats_weight` delta (+366,452)
  is ~33k above that sum; not attributed (the rollup runs the RDW matcher twice, over a different candidate set and only for weight-valid groups of ≥ 200 cars, so it is not
  comparable one-to-one). Prefix → alias flips only drop the "loose match" caveat.

- **M3 — photo rules.** Geely `jl7162` (and `jl7152`) → MK, Chrysler `gr.voyager` → Grand Voyager, Citroen `c1sx` → C1, Skoda `octavia a8` → Octavia, ZAZ
  `t13010` → Sens (from M1). 21 stale `-alias` cache files deleted (`search`, `lead`, `lead-uk`), `ingest:wiki-images -- --aliased` re-run, `wiki-images.csv.gz` re-exported
  (112,846 rows). **`pnpm wiki-images:coverage`: 99.3 % of cars have a photo (13,272,102 of 13,371,190; was 99.1 %), 88.2 % of groups (was 88.0 %).**
- **M4 — stats grouping (2026-10-10).** Migration 0057 adds `registry.stats_model_grouped`: `stats_by_model` with every pair `modelFamily` knows folded into its family row (382 of 78,808 raw pairs → 78,448 rows), other pairs copied as-is. Rebuilt from `stats_by_model` alone (no registry scan, seconds, no 15-min refresh) by `scripts/src/model-family-stats.ts` (`pnpm db:refresh-model-family-stats`, part of `db:refresh-derived`; run after `db:refresh-stats`). `StatsService` top-models boards read it; `stats_by_model` stays raw for the search suggestions. Folded counts are sums, so a plate typed under two spellings counts twice. Result: **Daewoo Lanos is first (378,476 plates)**, ZAZ Sens sixth, Slavuta twelfth. Chevrolet Lanos stays its own row (`modelFamily` keeps the brand).

- **M3 follow-up (2026-10-11).** Tried four more photo rules; only Smart `cabrio` → Fortwo worked (787 cars; kept and pinned in `aliasUnification.test.ts`). The other three are
  genuine Commons gaps, so no rule was kept: Renault `taliant` (743 cars) has only PNG files (the pre-warm takes JPEG only); Honda `m-nv` (4,300) has one JPEG with no year in the
  title (the plan needs a year); BYD `leopard 3` has no Commons file under any name. `wiki-images.csv.gz` re-exported (114,507 rows); coverage 99.3 % of cars / 88.2 % of groups, unchanged.

## Body "-B" spelling merged ✅ DONE (2026-10-11)

`КАБРІОЛЕТ-B` (12,899 cars, registered 2013–2020) and `КАБРІОЛЕТ` (20,903, registered 2021–2026) are the same body type; 31 body names carry the suffix. `normalizeBody` + `mergeBodyStats` in `packages/shared/src/vehicleBody.ts` (tests in `vehicleBody.test.ts`), used by the result card, AR card, export, the field-info popover, `/api/stats`, `/api/stats/field/body`, body suggestions and the search filter. Read-time only: no migration, no `db:refresh-stats`. Browser-checked on АА6988ТХ (Smart Cabrio 2006): shows `КАБРІОЛЕТ`. Not checked: the advanced-search UI and the /stats page.

**Follow-up (2026-10-12).** `normalizeBody` now strips every licence-category suffix (`-A`…`-E`, `-B1`, Latin or look-alike Cyrillic): `МОТОЦИКЛ-A`, `СІДЛОВИЙ ТЯГАЧ-E`, `АВТОБУС-D`, `ФУРГОН-C` merge with their plain names in `/api/stats`, the body field page and search. Stats/search UI pages not browser-checked. Photo gaps closed with aliases: Renault `taliant` → Dacia Logan III (its own Commons files are PNG only), Honda `m-nv` → "Ciimo M-NV" (the Commons name; 2021/2023 files). Stale `search`/`lead*` cache files for the old `honda-m-nv` key had to be deleted before the re-run. BYD `leopard 3` stays a Commons gap.

**Matcher follow-up (2026-10-12).** `vdbMatch.ts`: Renault `taliant` → Dacia Logan (cross-make chip), `nuovo` stripped like `new`, engine figure after the nameplate ("A4 1.8", "6 2.5") retried as the base model, curated variant aliases (Grand Scenic, A4 Avant, A6 Allroad, CC Sport). `/api/vdb` also adds the names of catalog rows that list the matched row as an alias (Renault Symbol → "Dacia Logan"). About 25k more cars reach VehiclesDB / RDW / recalls. VW Multivan and Chinese models (Chery QQ, Geely CK, BYD …) left: no catalog row.

## UK MOT "Common faults" (stage G) ✅ DONE (2026-10-10)

Strategy, profiling numbers, decisions, size report and the all-years forecast: `DATASETS_PLAN.md` ("Stage G"). Conventions for working on it: `docs/features-reference.md` ("UK MOT Common faults").

- **What shipped.** Migration 0058 (`mot_keys`, `mot_stats`, `mot_issues`, `mot_baseline`, `mot_reasons`, `mot_meta`), `pnpm ingest:mot` / `:csv` / `export:mot:csv` (seed `scripts/seed-data/mot.csv.gz`, 3.22 MB, part of `ingest:ratings:csv`), `GET /api/mot`, contract `packages/shared/src/mot.ts`, the lazy "Common faults" section (`?section=faults`) with a fail-rate-by-mileage chart, per-group rows with their own lines and expandable specific reasons, a Both / Failed / Watch for toggle, a table view and a glossary, ua / ru / en strings (80 reasons translated), the About credit with the OGL v3 statement, a `SCHEDULE.md` row.
- **Data loaded:** DVSA 2021 + 2022 + 2023 (cars 95.7M, vans 2.8M, motorcycles 2.9M normal tests; 4,422 stored make/models; 250,766 rows, ≈ 64 MB). 2019 / 2020 were not available locally; 2018 and older are not loaded (decision 0).
- **km-vs-miles check (user-guide warning):** median mileage per vehicle age agrees across 2021 / 2022 / 2023 within a few per cent → 2021 kept, plus a plausibility filter (> 40,000 miles per year of age dropped).
- **Findings worth remembering:** the ZIPs are **Deflate64** (Node zlib / `unzipper` cannot read them → `unzip -p` / bsdtar); the **2021 pair is 12 quoted comma-delimited part files whose item rows are scattered across all parts** (so "tests with the issue" needs exact per-test bookkeeping — a per-run counter over-counted by ~36M rows); the 2022 item ZIP carries a `__MACOSX` resource-fork `.csv`; `rfr_id` → top group is class-independent; 2,515 ids merge into 2,022 reason codes (top 80 ≈ 90.6 % of counts).
- **Opel = Vauxhall:** the MOT-only alias `opel -> vauxhall` lifts Opel matches from a few hundred tests to millions (Astra 2.2M); the service takes the larger of the two samples.
- **Browser-checked** on the dev stack (real DB): shared link `?section=faults` opens and loads, band highlight across charts, group → reasons expand, dark and light, 390 px mobile (no horizontal overflow), English and Ukrainian, no console errors. Not checked: Russian visually, a real touch device, the production build / service worker (`/api/mot` is online-only), a car with no MOT match in the browser (API returns `match: null`, the section shows the usual empty line).
- **Known gaps:** shares use a "." decimal in ua / ru; motorcycles match only 18 % of the registry (Chinese / UA-market brands are absent from MOT); the stored band edges and the 200-test cutoff are fixed at ingest time (re-run to change).

### UK MOT refresh, step 1: 2025 merged into the DB ✅ DONE (2026-10-12)

Stage G2 of `DATASETS_PLAN.md`, 2025 only (2024 = step 2). Numbers and decisions are in that stage's "Step 1 result". Built: `mot-zip.ts` reads Zip64 / stored ZIPs through 7-Zip (falls back to unzip / tar.exe), parses the 2024+ `\"` quote escape; `mot-lookup.ts` reads the loose `dft_item_*_extract.csv`; `mot.ts` finds `dft_test_*_extracts_<Y>.zip`; `mot-aggregate.ts` skips short rows and drops the unused sliding window in exact mode; **`--merge`** (`mergeMotData` / `mergeMot` in `mot-store.ts`, migration 0064 `mot_meta.years`) adds a year onto the tables and refuses an already-pooled year; the CSV seed carries the exact year list. Tests: `mot-store.test.ts`, `mot-zip.test.ts` (escaped quote). Browser-checked in step 2. Known gap: the old 2021–23 run reported 32.8M `revisitedBeyondWindow` rows, i.e. the sliding-window path may have under-counted 2022/23 issue rows — unverified; exact mode for all years would settle it (needs those ZIPs again).

### UK MOT refresh, step 2: 2024 merged into the DB ✅ DONE (2026-10-12)

Stage G2 of `DATASETS_PLAN.md`, 2024 (stage complete; pool = 2021–25, 6,265 tracked models). Runbook: dry-run on 2024 alone (35.0M tests indexed; car fail rate 22.8 % vs 22.4 % for 2025 and 22.8 % for 2021–23, so no anomaly), backup (`scripts/.data/mot/backup-before-2024.csv.gz`), `--reuse-aggregate --merge`, `pnpm export:mot:csv` (seed 4.55 -> 4.78 MB), browser check of "Common faults" (Ford Focus: 4 754 680 checks, 2021–2025, charts render). No code changes. Gotcha: pnpm here forwards `--` literally, so run `pnpm ingest:mot --dir …` without it. Remaining known gap unchanged: the 2021–23 sliding-window under-count risk.

UK MOT follow-up A — **Follow-up A (2026-10-12) — 2021–23 counting verified, gap closed.** Dry-ran 2022 and 2023 in window mode (`RECENT_TESTS`) and in exact mode (new `--exact` flag on `ingest:mot` forces `MotFiles.scattered` for single-file years): per-year totals (tests 34,203,099 / 34,640,366; fails; advisories; dangerous), all 13 group fail/advisory counts and every model×band row (16,345 / 20,614) are **identical (0.000 %)**, and the window run never raised `revisitedBeyondWindow` / `interleavedTests`. The old 32.8M `revisitedBeyondWindow` therefore did not come from 2022 or 2023 (2021, multi-part, is exact). No UI rate moves; no rebuild needed.

### UK MOT trim families (query-time pooling) ✅ DONE (2026-10-12)

After merging 2024–25 (1,843 new keys, 69,718 more registry vehicles matched, mostly recent EVs / hybrids) a prefix match showed one trim only (EV6: 2,109 of 7,230 tests; Highlander 1,109 of 1,755). `apps/api/src/mot/mot-family.ts` pools all trim keys on a prefix match (tests `mot-family.test.ts`); no re-ingest, exact matches unchanged. Not done: folding trim keys into an existing base key at ingest (≈ 3 % of big models such as Kuga, BMW X5) — it needs a real-model list to avoid merging "range rover sport" into "range rover".

### Registration status — last-operation chip + advanced-search filter ✅ BUILT (2026-10-10)

Result card shows a chip with the latest operation (🪖 Тимчасовий облік (військовослужбовець) · 2024, 🚫 Знято з обліку, 🔁 Зміна власника …); Advanced search got a "Registration status" dropdown (grouped by status, with a vehicle count per operation code). Migration 0059 (`ix_current_reg_oper_code`, `stats_by_oper`). Conventions: `docs/features-reference.md` → "Registration status".

### /fuel Powertrains panel ✅ BUILT (2026-10-10)

Electric/hybrid/gas/… breakdown on `/fuel`: table of classes (cars, % of fleet, models, brands, top model, avg CO₂) with a drill-down for top models, top brands, rare models and the model-year trend. Details: `docs/features-reference.md` "Powertrains panel".

### Canada recalls ✅ BUILT (2026-10-10, stage H cut down)

Third market group ("Canada (Transport Canada)") in the Recalls block, holding only the Canadian safety campaigns with no US (NHTSA) twin: 1,595 campaigns / 10,762 model-year links of 7,648 since 2010 (79.1 % have a twin).
Why cut down: overlap research the same day showed ~97 % of Canadian campaigns repeat NHTSA; the rest are Canada-specific rules and models the US does not sell (Qashqai, X-Trail, Sprinter CDI names).
Full write-up, twin rule, numbers and files: `DATASETS_PLAN.md` "Stage H — done"; conventions: `docs/features-reference.md` "Canada recalls without a US twin".

### Wikimedia hero-image cache — alias passes and coverage run log (moved from PLAN.md 2026-10-11)

**2026-10-09 — alias passes done (✅):** `packages/shared/src/wikiAliases.ts` (`wikiSearchName`) maps registry factory indexes / engine-code
names to searchable names (VAZ 21104 → VAZ-2110, Niva, Priora, Kalina, ZAZ Sens/Slavuta/Tavria, GAZ, UAZ, Geely MK, Mercedes
E-Class/ML/Sprinter, BMW "116 i" → 1 Series, trailing engine sizes stripped); rows keep the registry key, only the search uses the alias.
`pnpm ingest:wiki-images -- --aliased` ran 3 passes (447 + 752 + 919 models, 0 failures left). The coverage script had a whitespace
mismatch (registry `DAEWOO  LANOS`) and showed a false "33% not processed"; fixed. **Real coverage: 62.8% → 98.0% of cars** (13.10M;
266k cars / 2.0% still `not_found`, mostly tiny trim-code models like "307 xs 2.0 e"). No wider pre-warm is needed. Soviet/UA photo sites
(autoussr.ru, zaz.drive.place, sovietcarmodels.com, 24tv) were **not** used: copyrighted. Write-up: `docs/plan-done.md`.
**2026-10-10 follow-up (✅):** live fallback now uses `wikiSearchName`; ~40 new alias rules; `--aliased` stopped early (≈1,800/2,212 models); **coverage 98.0% → 99.0%** (126k cars still not_found). Details: `docs/plan-done.md`.
**2026-10-10 second session (✅):** `--aliased` finished, `--retry-failed` cleared, tail rules added (Doblo, Sorento, Mitsubishi, Peugeot trims, Geely LC/FC), diacritics fixed in title matching; **coverage 99.1%** (114.7k cars not_found), CSV re-exported. Details: `docs/plan-done.md`.

### Modal motion + MOT "My car's mileage" modal full height ✅ BUILT (2026-10-11)

`MotCarModal` panel is always full viewport height (`h-full`, content scrolls inside) so switching range chips no longer resizes it. Open / close animate: `animate-modal-backdrop` + `animate-modal-panel` (`global.css`, reduced-motion = none); closing sets `data-closing` and unmounts on the panel's `animationend` (400 ms timeout fallback; immediate under reduced motion). Content under the chips is keyed by band (`animate-fade-in`) and its group / reason rows stagger in with `animate-row-in`. `Model360Modal` does not use these yet. Conventions: `docs/features-reference.md` "UK MOT".

### Car generations (stage I) ✅ BUILT (2026-10-11)

Chip "XV40 · 2006–2011" (🧬) next to the VehiclesDB chips on the plate card and in VIN typical data; popover = previous / next generation, body styles, platform, credit. Shown only when the car's model year falls inside a known span (a boundary year shared by two generations picks the newer and says so).

- **Data:** `registry.model_generations` (0061; key = `makeKey`/`modelKey` of the registry spelling, shown names from the article title). `scripts/src/generations.ts` + pure `generations-parse.ts`: targets = top 300 pairs of `stats_model_grouped` folded through `wikiSearchName`; per target Wikipedia search → series article → generations from Wikidata P179, else "Series (code)" prefix titles, else article section headings (trusted only when ordinals are consecutive); years from the infobox (`model_years` + `production`, first range only, earlier start / later end), end filled from the next start, last end from the series infobox. Variants nested in another generation's span (X5 M) are dropped. Result: **152/300 models, 614 generations, 60.7 % of the pairs' cars**; seed `seed-data/model-generations.csv.gz` (in `ingest:ratings:csv`).
- **API/contract:** `apps/api/src/generations/`, `packages/shared/src/generations.ts` (own file; `pickGeneration`, `generationSpan`); matcher = `matchVdbModelAcrossMakes`. Web: `GenerationChip.tsx`, `generationQuery` (offline `rdw` group), About credit (Wikidata CC0 / Wikipedia CC BY-SA).
- **Known gaps:** VAZ/ZAZ/Daewoo and Audi A4/A6/Lanos have none; chains with a missing generation leave a hole (no chip rather than a guess); a few Wikidata spans are off by a year (Mercedes W212); discontinued models whose article lacks a production end show an open last span. Not in "Copy all info". No override CSV yet. Browser-checked on a Camry 2008 (mobile width, dark theme); light theme and desktop not checked.

### Generation specs from Wikipedia (stage K) ✅ BUILT (2026-10-11)

Section "Generation specs" (📖, share id `engines`, collapsed by default) under the plate card: one key/value card per engine of the car's generation (power kW + hp, displacement, fuel, cylinders, engine code, chassis code), a "Drive and gearbox" folder, and "Dimensions and mass" only where the Dutch register (RDW) has no row for the model. Every block names its Wikipedia edition and links to the article; copy says the figures are catalogue values for the generation, not for this car. A miss hides the section.

- **Parser:** `packages/shared/src/wikiSpecs.ts` — infobox + body-table parser (en / ru / uk / de / cs / ja / ko aliases, `convert`/`cvt` expansion, "one unambiguous value or null", sanity bounds); 17 real-article fixtures in `packages/shared/src/fixtures/wiki/`. Probe: `scripts/src/wiki-specs-probe.ts`.
- **Data:** `registry.model_spec_wiki` (0062), `ingest:wikispecs` (`scripts/src/wikispecs.ts` + `wikispecs-merge.ts`, cache `scripts/.data/wikispecs/`), seed `wikispecs.csv.gz` = 606 rows / 614 generations / 152 models. Each block (dimensions, engines, drive) comes from one edition (`src_*`, `engines_*`, `drive_*`). Fill: engines with power 66 %, layout 90 %, transmission 38 %, dimensions 5 % (only where RDW has no model).
- **API/web:** `apps/api/src/wikispecs/` (`GET /api/wikispecs`, matcher = `GenerationsService.locate()`, shared with the generation chip), contract `packages/shared/src/wikiSpecsApi.ts`, `WikiSpecs.tsx`, query key `['rdw','wikispecs',…]` (cached offline with the rdw group), ua/ru/en strings, About credit. Gap dimensions live in this section, not in `RdwSpecs.tsx` (they exist exactly when the Specs block is hidden).
- **Checks (step 5):** format, lint (0 errors), type-check, 1022 tests pass, shared built. Browser: СЕ9990СВ (Prado J250, 4 engines), СЕ9031СХ (Teana J32: engines + drive + RU dimensions), КА2209ТВ (Golf, 33 engine cards from DE, drive from EN, no dimensions) at 485 px, dark and light, via `?section=engines` (opens and scrolls); no horizontal overflow, no console errors.
- **Follow-up done (2026-10-11):** the matching engine is highlighted/first with deltas for the rest, year-in-generation line, kerb mass shows the car's registered mass, and drive/gearbox became translated key/values (`WikiDrive.helpers.ts`).
- **Known gaps / follow-ups:** a few engine titles lack a fuel (Golf "2.0 л · 135 кВт") or show a min–max range for hybrids; engine vs chassis code split (`splitWikiCodes`) is a shape heuristic; the card bundle (`CardService`) does not carry wikispecs yet, so the section makes its own request; VAZ/ZAZ/Daewoo/Chery have no rows until stage I covers them.

### Spec rankings + section skeletons ✅ BUILT (2026-10-11)

/stats gets a second ranking panel under Heaviest / Lightest: highest and lowest passenger-car models by power, engine displacement, height, length and fuel tank, with metric tabs (top 5, expandable to 10, each linking to advanced search). Every lazy result-card section that fetches on expand now shows a skeleton instead of a "Loading…" line.

- **Data:** `registry.stats_spec` (0063), `scripts/src/spec-stats.ts` (`db:refresh-spec-stats`, listed in `DERIVED_REFRESH_SCRIPTS`). Power / displacement = 5th / 95th percentile of the registry column (range-checked; 99th let an 835 kW Kyron win; pure-electric capacity is a placeholder and skipped). Height / length = matched RDW year-medians (well-sampled years), else the model's Wikipedia generations; fuel tank = Wikipedia only. Matcher = `matchRdwModel`; registry spellings of one reference model merge.
- **API/web:** `specBoards` in `/api/stats/top` (floor 500 vehicles, default `{}`), `SPEC_METRICS` in `packages/shared/src/specMetrics.ts`, `SpecModelsPanel` / `SpecModelList` (+ `.helpers.ts`), `stats.spec.*` strings in ua/ru/en.
- **Skeletons:** `components/ui/SectionSkeleton.tsx` (rows + `role="status"`) replaces the loading line in the ratings sections, recalls, MOT, EV, fuel economy, news, social, photos, videos, stock and the VIN / plate history blocks. Specs, Engines and Wiki specs are left alone: they hide on a miss.
- **Checks:** type-check, 1041 tests pass. Real DB: 662 length, 521 height, 5 fuel-tank, ~1800 power, ~2100 displacement model rows.
- **Known gaps / follow-ups:** fuel tank has only 5 ranked models (18 of 606 Wikipedia rows carry a tank) until `ingest:wikispecs` covers more; registry-filed vans (Crafter, Transit) rank as cars; spec boards are passenger-only (no group tabs, trucks / buses not ranked); not on the home page; no committed seed (rebuilt from existing tables).

### /stats, /fuel, /safety explanations + sources, collapse-all scoped ✅ BUILT (2026-10-11)

Every /stats section now has a ❓ explanation (what the data means, where it comes from, what is and is not listed) ending in a "Sources" line; the floating collapse-all button shows on plate / VIN result pages only.

- **Explanations:** `SectionInfo` (`section.about.<key>`) keys `statsSummary` (page header), `statsTopBrand|Model|Color|Region` (one per leaderboard card), `statsWeight` (group tab row), `statsSpec` (metric tab row), `statsTable` (next to the Table / Map toggle); titles `stats.weight.title`, `stats.spec.title`, `stats.table.title`. ua/ru/en. The VehiclesDB "Markets" panel already had `stats.vdb.info`.
- **Sources named:** data.gov.ua registrations dataset (MVS service centres), the plate-prefix → region table, RDW open data, Wikipedia generation specs. Thresholds are worded "a few hundred vehicles" (weight and spec floors are 200 in `weight-stats.ts` / `spec-stats.ts`).
- **Collapse-all:** `ScrollButtons` renders it only when the path is one segment outside `ROUTE_TITLE_KEYS` (the `/:query` plate / VIN route); "back to top" stays everywhere.
- **/fuel and /safety:** same treatment. Keys `fuelSummary|fuelPowertrain|fuelChart|fuelModels|fuelDistribution` and `safetySummary|safetyChart|safetyModels|safetyDistribution` (titles `fuel|safety.chart.title`, `fuel|safety.models.title`); the model lists take an `info` prop, so the ❓ also shows on the home page boards. Floors worded from the code (brands 2000, models 1500 matched cars; sources EEA/EPA and Euro NCAP / JNCAP / C-NCAP / KNCAP / IIHS).
- **Known gaps / follow-ups:** `STATIC_ROUTES` in `use-header-vehicle-label.ts` lacks `/fuel` and `/safety` (`ROUTE_TITLE_KEYS` is the complete list); the spec floor is 200 in `spec-stats.ts` (stored) and 500 in `stats.service.ts` (shown) — `docs/features-reference.md` now says both.

## Wikimedia photos for КРАЗ trucks (2026-10-11)

The pre-warm skipped trucks (`kind ILIKE '%легков%'`) and `63221` had no alias to the `KrAZ-6322` article, so КРАЗ plates (e.g. `04ВЕ9280`, КРАЗ 63221, 2012) showed no photo.

- **`ingest:wiki-images --all-kinds`** drops the passenger-car filter in `loadGroups`; default behaviour unchanged.
- **`wikiSearchName`**: brands `краз` / `kraz` → `KrAZ-<number>` (`6322xx` → `6322`); test in `wikiAliases.test.ts`. `krasz` deliberately excluded (trailer codes).
- **`leadLanguages`**: `краз` added to the `ru` list (en → ru → uk).
- **`--brand` filter** now also matches `"<brand> <model>"` brands — the first run missed `краз 63221` (stored `not_found` by an earlier live lookup) until this was fixed and `--retry-not-found` was run.
- **Run:** `pnpm ingest:wiki-images -- --all-kinds --min-cars 1 --brand краз --brand kraz --rps 2` (+ `--retry-not-found`): 64 of 118 groups with a photo, 0 failed; `краз 63221` 11/19 years. The API's in-memory image cache holds earlier `null` answers until restart.
- **Not done:** re-export of `wiki-images.csv.gz`; other truck brands (МАЗ, КамАЗ, ЗІЛ).

## Wiki photo origin label, on-demand refresh, RAF-2203 alias (2026-10-12)

`01АР8763` (РАФ 220301, 1992) showed no photo: `220301` is a trim of the RAF-2203 article and an earlier live lookup had stored `not_found`. A first attempt to switch live lookups off (`WIKI_IMAGE_LIVE`) was dropped in favour of showing where a photo comes from.

- **Origin:** `wikiImageResponseSchema` gains optional `from: 'db' | 'live'`; `WikiService` tracks it through `Resolved` (`peekImage` → `db`). Hero label "DB" / "Wiki live" top-left.
- **Refresh:** `?refresh=true` on `/api/wiki/image` and `/api/wiki`; "Update photo" button bottom-left (ua/ru/en `wiki.imageRefresh*`). A miss never overwrites an `ok` row.
- **`wikiSearchName`:** РАФ/RAF `2203`, `2203-xx`, `2203xxx` → `RAF-2203` ("РАФ-2203"); inputs are now lower-cased inside (upper-case registry brands never matched the lower-case rules, e.g. ГАЗ / УАЗ).
- **Stale rows:** models that now match an alias but were stored `not_found` stay so until "Update photo" or `ingest:wiki-images --retry-not-found`. No test yet for the RAF alias itself.

### Stages I / K coverage round ✅ BUILT (2026-10-11)

Measured on the real registry (top 1,500 model groups = 15.4M cars): generation rows covered 53 %, engines 50 %. After this round the top 600 targets give **376 models / 1,098 generation rows covering 86.5 % of their cars** (was 152 / 614 / 60.7 % for the top 300), and **1,093 spec rows, engines on 94 % of generations (was 66 %), with power 72 %**.

- **Heading parser** (`generations-parse.ts`): ordinal headings may carry a platform code (`First generation X76 (FC/KC; 1997)` → code X76); code headings are read as the longest run of consecutive codes of one shape (`C4 (Typ 4A, 1994)`, `Vectra A (1988–1995)`, `Zafira C/Zafira Tourer (2011)`), so `S6 (2012–2018)` / `A6L` variants and other brands' articles are ignored. Fixes Audi A4/A6, Kangoo, Vectra, Zafira.
- **Source choice** (`chainDefects`, `chainScore`, `fillGaps`): Wikidata, "Series (code)" titles and headings are all considered; score = generations − 2 × defects (holes, clamped mid-list spans, a stale tail for a model still produced); generations of the losing sources that start inside a hole or after the tail are merged in (Polo Mk6, Corolla E160). `Series Mk6` titles count as prefix articles. Generations starting after the current year are dropped (Rogue "T34; 2027").
- **Cross-make search:** `SERIES_BRAND_ALTS` (Renault→Dacia, Opel→Vauxhall, Chevrolet↔Daewoo); `resolve` tries each candidate article until one has a chain (Duster: "Renault Duster Oroch" has none, "Dacia Duster" has).
- **Single-generation models:** one row, `source = 'single'`, empty code/label, span = the widest production span of the article (`productionSpan`: Lanos 1997–2020 because ZAZ built it). Fallback only — a real chain from any candidate wins. `GenerationChip` hides when `total < 2`; the specs section uses model-level strings (`wikispec.footnoteModel`, `wikispec.info.leadModel`). The row exists so stage K can attach engines (VAZ-2109, Lanos, Sens).
- **Pinned titles:** `scripts/src/generations-titles.csv` (registry name → article; VAZ-2109 → Lada Samara, 2107 → Lada Riva, Sprinter, M-Class, Prado …), the stage I twin of `wikispecs-overrides.csv`.
- **Stage K parser** (`wikiSpecs.ts`): ru/uk `{{Двигатель}}` templates (`engineTemplates`: объём cc, мощность kW, мощность лс hp, fuel from name / АИ / ДТ); an article with one infobox per generation is read through `yearFrom` (`blockByYear`: closest production start, narrowest span wins over the model-wide block). Fixture `mazda6.ru.wikitext`. `wikispecs.ts` passes `yearFrom`.
- **Run:** `ingest:generations -- --limit 600` then `ingest:wikispecs` (both resumable; Wikipedia cache in `scripts/.data/`), seeds re-exported (`model-generations.csv.gz` 20 KB, `wikispecs.csv.gz` 204 KB).
- **Checks:** format, lint (0 errors), type-check, 1,055 tests, shared rebuilt. API-checked (A6 2008 → C6 + 20 engines; Logan 2010 → L90/U90/F90; Sens → 1 row, 9 engines, no chip; Polo 2019 → Mk6; Mazda 6 2010 → GH1/GH2). **Not browser-checked** (the chip hide and the model-level strings are untested in the UI).
- **Not done:** model-name leaks that the matcher already folds (Octavia a5/a7/Tour — verify on real plates before adding aliases), Passat B7 (no separate article), Opel Vivaro, Peugeot Partner / Expert, Ford Fusion (separate Europe/Americas articles), Chery/Geely, widening past 600 targets.

### Stage K follow-ups + alias-leftover audit ✅ BUILT (2026-10-12)

- **Card bundle:** `wikiSpecs` is a new part of `GET /api/card/:plate` (`CardService` calls `WikispecsService.wikispecs(brand, model, year)`, only with a year; `WikispecsModule` now exports the service; `cardBundleResponseSchema.wikiSpecs` is `.nullable().optional()`). `seedCardBundle` writes it under `wikiSpecsQuery`'s key, so the "Generation specs" section no longer fires its own request. Tests: `card.service.test.ts`, `queries.card.test.ts`.
- **Engine / chassis split** (`splitWikiCodes`, `WikiSpecs.helpers.ts`): checked against the 577 distinct codes stored in `wikispecs.csv.gz`. Found 80 bare numbers (displacements the table put in the code column — `1798`, `2995` …) and chassis-shaped engine families (`B38/B47/B48`, `TU1–5`, `XU7`, `XUD7/9`, `DV6`, `DW8/10`, `EP3/6`, `HR12`, `EA211/288/888`, `VR5/6`, `M274`). Numbers are now dropped, the families filed as engines (`ENGINE_FAMILY`). Toyota/Mazda/Mitsubishi codes such as `ALE20`, `GSE20` stayed ambiguous until the parser stored the two kinds separately (next bullet; the re-ingest from the cache takes seconds, not an hour).
- **Audit — already done, notes were stale:** `de` is in `BASE_WIKI_LANGS` (`en, ru, uk, de`); the "extra makes have no generation rows" carry-over is wrong for VAZ / Lada / ZAZ / Daewoo / Chery / Geely / BYD (`generations-titles.csv` pins them; the seed has 13 / 3 / 5 / 3 / 1 / 3 / 3 rows) — bikes and buses still have none; the stage M leftovers (Geely `jl7162`, Chrysler `gr.voyager`, Skoda `octavia a8`, Citroen `c1sx`, Smart `cabrio`, Renault `taliant`, Honda `m-nv`) all have rules in `wikiAliases.ts` (BYD `leopard 3` and a dated Honda photo are real Commons gaps).
- **Left as misses (data is not on Wikipedia yet):** Tucson NX5, Qashqai J12.
- **Engine vs chassis codes stored separately (2026-10-12):** `WikiEngine.engineCodes` (also `WikiEngineJson`, `wikiEngineSchema`, `engineJson` in `wikispecs-merge.ts`; jsonb, no migration). The table parser splits the old `code` column kind into `engineCode` / `chassisCode` / ambiguous `code` by header; engine columns also take "OM 607" and digit-less all-caps codes ("CJZA"). `engineKey` includes the engine codes, so variants that differ only in code are no longer merged (golf7.de fixture 33 → 38 engines). Web: `wikiRowCodes` uses the stored split when `engineCodes` is present, else `splitWikiCodes`. New fixtures: `bmw7e32.uk`, `citan.ru`, `civic3.de`, `golf4.ru`, `lodgy.en`. Re-ingest from the cache: 1,093 rows, 2,350 of 8,970 engines carry the marker, 288 rows with chassis-list codes stay ambiguous (guess). Spot-check (Camry, 3 Series, Lexus IS, Golf, 206): Lexus IS `GSE20` / `ALE20` are chassis, `4GR-FSE` / `2AD-FTV` engine; BMW `M20`, `M30`, `S14`, Golf `EA888` are engines (the shape guess had filed them as chassis). Cleaned up afterwards: gearbox words (`3-phase`, `N-speed`) are dropped by `chassisOf` (`GEARBOX_WORD`) and guarded in `splitWikiCodes` for old rows; a trailing hyphen is stripped from codes (Prado `E-VZJ95W-GKPGK` is cut at 9 characters, now `E-VZJ95W`; fixture `prado90.en`). Peugeot 206 has no code column at all. Browser-checked `?section=engines` on КА2209ТВ (Golf 2014: "Код двигателя EA888").
- **Checks:** format, lint (0 errors), type-check, 1,090 tests, shared rebuilt. **Not browser-checked** (card bundle seeding of the section).

### On-device "Translate" for all untranslated source text ✅ BUILT (2026-10-11)

Owner decision: the stage D2 full translation run is skipped; the real-time "Translate" button (already on recall fields) is the pattern for every untranslated key/value. Added: `WikiSpecRow sourceLang` (engine note / raw text, raw drive rows), `DriveRow.raw`, `untranslatedReasons` / `reasonText` (UK MOT reasons without a static label, one link per group and in the car modal), and a link under the generation chip's body styles. Convention written in `docs/features-reference.md`. Checks: web type-check, 274 web tests (+2). **Not browser-checked.**

### UK MOT follow-up B: trim keys folded at ingest ✅ DONE (2026-10-12)

DVSA's 2024+ files put the trim in the model, so exact matches only saw their own key (Kuga: 1.24M of 1.35M tests under "KUGA"; X5 419k of 447k) and trim keys under 200 tests per run were untracked. Built: `scripts/src/mot-fold.ts` (`MotFold`, `MOT_KEEP_SEPARATE`, `baseModelName`), `mot-real-models.json` (829 keys, from `mot-fold-build.ts`), `KeyCache` folds per row, `foldCensus` folds the cached censuses so the tracked set uses folded keys. Rule and the false folds it needed a keep list for are in `docs/features-reference.md` "Matching / Trim families". Tests: `mot-fold.test.ts`. **Full rebuild of 2021–25** from the ZIPs (backup `scripts/.data/mot/backup-before-fold.csv.gz`): tracked models 6,265 -> 4,437 (cars 2,438, vans 123, motorcycles 1,876), `mot_stats` 248,906 rows, seed 4.78 -> 3.57 MB. API after: Kuga 1,357,045 tests (exact), X5 448,491, Transit Connect 833,598 and Range Rover Sport 587,187 stay their own keys, EV6 (prefix) 7,611, Highlander 349, "IONIQ 5" its own key. Browser check: Land Cruiser Prado "Common faults" renders (111,545 tests). Known leftovers: Niro EV / Soul EV pool into Niro / Soul (trims of the same name); a new post-2021 model with an old-model prefix is folded until it is added to the keep list.

### UK MOT follow-up C: electric trims split from the base model ✅ DONE (2026-10-12)

An electric trim folded into its base model diluted both charts (a pure EV has no exhaust faults, other brake/tyre wear): Kia Niro mixed 55k hybrid tests with ~39k EV ones a year. Built: `MotFold.split` (`scripts/src/mot-fold.ts`) counts a trim whose words after the base contain a standalone `EV`/`BEV`/`ELECTRIC` word under `<base>ev` ("NIRO 4 + EV" -> `niroev`, name "NIRO EV"); not split: `MOT_EV_ONLY` (Zoe, Leaf) and kept-separate models. `ingest:mot` gates it on the pooled census (`evAllowed`: 17 of 30 `ev` keys reached `MOT_MIN_KEY_TESTS`, the rest fold back). API: optional `fuel=electric|other` on `GET /api/mot` (`MOT_FUEL_HINTS` in `packages/shared/src/mot.ts`, so offline-cached answers still parse); an electric car on an exact match uses `<base>ev` when it has >= `MOT_MIN_EV_KEY_TESTS` (1,000) tests (`evKeyOf`), else the base. Web sends the hint only when `registryFuelClass` is known (`motFuelHint`; hybrids = `other`). Tests: `mot-fold.test.ts`, `mot-family.test.ts`, `MotFaults.helpers.test.ts`. **Full rebuild of 2021–25** (backup `scripts/.data/mot/backup-before-ev-split.csv.gz`): tracked models 4,437 -> 4,454, seed 3.57 -> 3.58 MB. Checks: Niro 193,258 + Niro EV 79,901 = 273,159 (old total); Kuga 1,357,045, X5 448,491, Transit Connect 833,598, Range Rover Sport 587,187, Highlander 349, EV6 (prefix) 7,611 unchanged. Other new `ev` keys: ZS EV 40.9k, Cooper S 30.7k, 208 21.2k, 2008 19.3k, Mokka 9.0k, Kona 6.1k, Soul 5.9k, XC40 4.9k. Browser check: electric Niro (2020) shows "KIA NIRO EV" 79,901 tests, petrol Niro (2019) "KIA NIRO" 193,258. Known leftovers: pre-2024 files carry no EV marker, so the `ev` key holds 2024-25 tests only and earlier EV tests stay in the base; EV-only models split over trim keys (Polestar 2, MX-30) are not folded (prefix pooling covers them); bare `E` suffixes (Corsa-e) are not recognised.

### UK MOT follow-up D: keep-list audit and abbreviation aliases ✅ DONE (2026-10-12)

Audited every key `MotFold` folds (2024-25 censuses, groups >= 250 tests/yr, first word after the base) for post-2021 models or renames that extend an older model's name and were wrongly folded. Added to `MOT_KEEP_SEPARATE`: `car|suzuki|sx4scross`, `car|vauxhall|grandlandx`, `car|vauxhall|crosslandx`, `car|ds|ds3crossback`, `car|volkswagen|tiguanallspace`, `car|ford|tourneocourier` (no van-kind keys exist for them). New `MODEL_ABBREVIATIONS` in `scripts/src/mot-fold.ts` expands "DISCOVERY SPT", "RANGE ROVER SPT" and "TIGUAN ASPACE" before the prefix lookup (these used to fold into Discovery, Range Rover, Tiguan); `baseModelName` expands them too. Tests: `mot-fold.test.ts`. **Full rebuild of 2021–25** (backup `scripts/.data/mot/backup-before-keep-list.csv.gz`): tracked models 4,454 -> 4,459, seed 3.58 -> 3.59 MB. Checks (API, parent before -> parent + new): Grandland 261,946 -> 169,652 + Grandland X 92,294; Crossland 247,826 -> 195,698 + Crossland X 52,128; SX4 207,607 -> 199,330 + SX4 S-Cross 8,278; Tiguan 1,077,792 -> 1,063,833 + Allspace 13,959; Tourneo 66,557 -> 65,595 + Courier 962; Discovery 779,941 -> 768,946 (Discovery Sport 510,340 -> 521,335); Range Rover Sport 587,187 -> 587,536; DS3 162,540 -> 162,055 + DS 3 Crossback 4,054 (its electric tests moved out of `ds3ev`, which has no split any more). Kuga 1,357,045, X5 448,491, Transit Connect 833,598, EV6 (prefix) 7,611 and Niro 193,258 unchanged. Not split, on purpose: see the list in `docs/features-reference.md` "Matching / Trim families".

### Stage K leftover, Step 5 — empty rows, pins, browser check (2026-10-12)

`wikiSpecs.ts`: `Infobox UK Bus` added to `INFOBOX_NAME` (MAN Lion's Coach now stores 3 rows; fixtures `lionscoach.en` / `lionscity.en`), `parseEngine` reads decimal cc. `generations-titles.csv`: Bajaj Dominar → "Dominar 400". Still empty: Suzuki Intruder (empty infobox, prose only), SV650 (transposed model-year table — needs a new table parser), MAN Lion's City (RDW has it). Per-language pin proposal (Neoplan/Setra de, Jawa ru) and the reasons for each unmatched bike are in `DATASETS_PLAN.md` "Step 5 done". Bike + bus cards checked in the browser (dark desktop, light mobile).

### Stage K leftover, Step 6a — per-language title pins (2026-10-12)

`generations-titles.csv` is now `query,title,lang` (`lang` default `en`, two-column rows still parse; `parseTitlePins`). `fetchSeries` reads `https://<lang>.wikipedia.org`; the stored `wiki_title` becomes `de:Title` (no migration; `splitWikiTitle` / `wikiTitleUrl` in shared). A non-en series skips the en-only Wikidata and "Series (code)" sources (headings or a single row from the article's infobox years; `productionSpan` also reads `Produktionszeitraum` and the ru/uk years fields). `ingest:wikispecs`: `editionTargets` makes the prefixed edition primary and takes the others from its langlinks. No reader needed a change: the web never uses `wikiTitle`, the spec source link uses the page's own `lang`/`title`. Tests: pin parsing, title helpers, `editionTargets`, de production field. **Coverage: none.** de "Neoplan Cityliner" (N116) is prose only (no infobox/table) → no years, pin not kept; N316 not covered by it; de has no "Setra S 300" article and no S 215/315/215 HD/315 HD articles (only S 315 HDH, GT-HD, UL, NF, S 417 HDH, S 431 DT, which need de `Infobox Bus` in `INFOBOX_NAME`). First real use of the path: 6b Jawa 350.

### Stage K leftover, Step 6c — transposed model-year tables (2026-10-12)

`wikiSpecs.ts`: a third table layout in `tableSpecs` — `Model year | 1999–2002 | 2003 | 2017–present` as header, one row per attribute (`modelYearColumns` detects it, `modelYearSpecs` reads it). `yearFrom` (now passed to `tableSpecs`) picks the column whose range holds it; colspans were already expanded by `expandSpans`, so a merged cell covers every column and an empty / missing cell stays empty (never a neighbour's). Per cell only the first line counts (the base "naked" model before the S / A variants). Only engine / power / displacement-by-label / dimension rows are read; dry weight is skipped (wet weight = kerb), section-title rows (one repeated text) are skipped. Such a table is used even in a `series` article (headings name no generation — the year is the selector). Side fixes: `powerKwOf` reads decimals ("64.2 hp"), and "Fuel capacity" is the `tank` column, no longer `displacement` (matched `capacity` first). Result: Suzuki SV650 1999 / 2003 / 2017 store engines (645 cc 48 kW / 645 cc 55 kW / 56 kW — the 2017 column's engine cell has no cc, so none); dimensions NULL (RDW). A full `ingest:wikispecs --dry-run` (424 models) ran clean; the seed CSV differs from HEAD only by the three SV650 rows.

### Stage K leftover — motorcycles and buses (2026-10-12)

Scoped pass: 35 pinned Wikipedia titles (Honda, Yamaha, Suzuki, Kawasaki, BMW, Bajaj bikes; Iveco Daily, MAN, Mercedes T2/Citaro buses), `MODEL_ALIASES` for bare Sprinter / T2 / Citaro / LT / Daily codes, `wikiSpecs.ts` reads `wet_weight` and the bike `power` field. Coverage: 7.7 % of motorcycle and 56.9 % of bus registrations resolve to a generation row. Details and the unmatched list: `DATASETS_PLAN.md` "Step 4 done".

### Stage K-M4 — Kawasaki / BMW motorcycle pins ingested (2026-10-12)

The 17 pins of commit `bb9bd40` (`generations-titles.csv`) were ingested on the real DB with owner approval limited to `registry.model_generations` and `registry.model_spec_wiki` (`registrations` / `ingested_resources` untouched).

|                     | before | after                                          |
| ------------------- | ------ | ---------------------------------------------- |
| `model_generations` | 1,155  | 1,172 (+17: Kawasaki 10, BMW 7; all `single`)  |
| `model_spec_wiki`   | 1,147  | 1,165 (+18: Kawasaki 10, BMW 7, Bogdan A092 1) |

- **How:** the default `--limit 300` never reaches bikes (90–680 cars each vs ~7,970 at rank 300), so each pin ran as `ingest:generations --only "<query>"` (replaces only that make/model key). `ingest:wikispecs` then ran in full (cache in `scripts/.data/`, no `--refresh`).
- **Wikispecs side effect:** the full run rewrote 98 existing non-bike rows (mostly `engines`: parser changes since the last ingest plus live-article drift). Reverted: the seed is HEAD + the 18 new rows, loaded with `--from-csv` and re-exported; diff = 18 additions, 0 changed, 0 removed. Re-run the whole table later as its own reviewed step (Audi A5 regresses to a Russian summary line; Audi 80 and Chevrolet Aveo 2023 improve).
- **Checks:** Versys 650 = 649 cc / 50 kW (OK). **Versys 1000 is not 1,043 cc / 87 kW**: 9 engines from another table (the closest, "R4 1043 88 kW"). Browser: Kawasaki Versys 650 (`ВІ1923АВ`) and BMW F800GS (`АА4938АХ`) cards, `?section=engines`, light and dark, render correctly.
- **Pins that are poor data:** BMW K1600GT 2011–2011; F700GS and F800GS both 2008–2013 (shared "F series parallel-twin" article); card model name for F-series is the article title.
- **Registry spellings without a pin** (cars): Ninja 400R 236, Ninja 250R 123, Ninja 650 102, K1600GTL 198 + 116, R 1200RT 311 + 146, S 1000 R 235, S 1000XR 198, R 1300GS 156, F 750GS 132, F 850GS 125, R 1250 RT 122, R 1200R 105, R 18 97. `--only` does not report unmatched spellings, so this list comes from a registry query, not the ingest.

### Stage K-M5 — K-M4 follow-ups: Versys 1000, F-series years, 11 more pins (2026-10-12)

DB scope as in K-M4 (`model_generations`, `model_spec_wiki` only). Counts: `model_generations` 1,172 → 1,184 (+11 pins; S 1000 XR has 2 generations), `model_spec_wiki` 1,165 → 1,177 (+12). The wikispecs seed is HEAD + the changes below (diff: 12 added, 2 replaced, 0 other changed); the 98 drifted rows are still not taken.

- **Versys 1000 root cause** was not the English article (it has no body table). The row came from the **German** article: `Infobox Motorrad` was not in `INFOBOX_NAME`, so its `Hubraum` / `Leistung` were never read and the competitor comparison table (KTM, Ducati, Triumph … with `Hubraum`, `kW`) was taken for the model's engines. Fixes in `packages/shared/src/wikiSpecs.ts`: `Infobox Motorrad` recognised; `Hubraum` + `Leistung` (`88/120 bei 9000` = kW/PS) read into one engine when the engine field has none; a table that shares **no displacement (±3 %)** with the infobox no longer overrides it. Fixture `versys1000.de.wikitext` + 2 tests. The live en article now wins for Versys 1000 anyway (1,043 cc / 87 kW); Versys 650 unchanged (649 cc / 50 kW).
- **F700GS / F800GS years** (`scripts/src/generations-parse.ts` `productionSpan`): the shared article's field `F800GS (2008–19)<br/>F800GSA (2013–19)<br/>F700GS (2012–19)<br/>F650GS (2008–12)` was read with 4-digit years only (`2008–19` gave 2008), so max = 2013. Short ends are expanded, and a multi-model field is narrowed to the entries naming the target model. F700GS now 2012–2019, F800GS 2008–2019. Test added.
- **cc over litres** (`parseEngine`): a bike's vertical spec table folds the oil capacity into the engine text (`248 cc … SAE 10W40/1.9 L`) and the litres pattern won (Ninja 250R stored 1,900 cc). An explicit cc figure now wins.
- **11 pins added** (`generations-titles.csv`): Ninja 400R, Ninja 250R, Ninja 650 (→ "Kawasaki Ninja 650R"), R 1200 RT, R 1200 R, S 1000 R, S 1000 XR, R 1300 GS, F 750 GS, F 850 GS, R 18. All resolved. Not pinned: **R 1250 RT** (no en article) and **K1600GTL** (same "BMW K1600" article as K1600GT, whose infobox says only "March 2011").
- **Still open:** a lone production year with no end ("March 2011") becomes `2011–2011` in `productionSpan` (BMW K1600GT, Honda NC750XD 2012–2012, VW Beetle 2003, KrAZ 6510 1992); treating it as open-ended would be right for bikes but wrong for dead models, so it needs a decision. F700GS shows the article's 63 kW (the F800GS figure; the real F700GS is ~55 kW) because both share one article.

**K-M5 follow-up (lone production year).** `productionSpan` now returns an open end (`to = null`) for a lone start year with no range or "present" when the article uses `Infobox motorcycle` / `Infobox Motorrad` (rule chosen by the owner). Cars and trucks keep the one-year span (VW Beetle 2003, KrAZ 6510 1992). Re-ingested BMW K1600GT (2011–now), NC750XD (2012–now); new pin `Bmw k 1600 gtl` → "BMW K1600" (2011–now). `model_generations` 1,184 → 1,185. Still open: R 1250 RT (no en article), F700GS shows the F800GS 63 kW, 98 drifted wikispecs rows (not in the seed), pre-existing lint error in `use-car-hero-image-actions.ts`.

**K-M5 follow-up 2 (wikispecs drift, 98 → reviewed).** A full cached `ingest:wikispecs` against the HEAD seed changed 150 rows (engines 137). Cause of the car regressions: the K-M4 rule "a table naming no engine (no displacement, no engine code) loses to the infobox" also fired on cars, replacing per-variant power figures with an infobox line holding displacement only (Audi 80, Lexus IS, Toyota Corolla, Mercedes M-class, 25 more). `parseWikiSpecs` now lets such a table win when the infobox states no power at all (`infoboxHasPower`). Result vs HEAD: worse 38 → 13, better 27, neutral 14, displacement rounding only 58. The seed keeps the HEAD row for the 13 still-worse rows (audi|a8|2009, bmw|r1200gs|2004, honda|cb400sf|1992, mazda|cx7|2006, mercedesbenz|cclass|2007 and 2014, opel|corsa|1993, peugeot|206|1998, renault|zoe|2012, tesla|model3|2017, tesla|models|2012, toyota|camry|1991, zeekr|001|2021), so it no longer equals pure parser output for those; a re-ingest will regress them until the parser handles them. New rows: bmw|k1600gtl|2011, suzuki|intruder|1985. `model_spec_wiki` 1,177 → 1,179.

**K-M5 follow-up 3 (F700GS power).** `ParseOptions.model` (folded model key, passed by `scripts/src/wikispecs.ts`): a bike infobox whose `power` field lists several models (`75 hp @ 7,300 rpm (F700)<br/>…(F800)`) gives a lone engine the line whose paren tag starts the model key (`modelPowerKw`), else the first line as before. F700GS 63 → 56 kW; F800GS stays 63. A full cached re-ingest changed no other row vs the seed besides the 13 held at HEAD. Still open: R 1250 RT (German-only article, generations ingest reads en only), the 13 held wikispecs rows above.

**K-M5 follow-up 4 (13 held wikispecs rows).** Three parser rules in `wikiSpecs.ts`: (1) `infoboxVague` — an infobox whose engine lines are all ranges (`200–930 kW`, `1,0–1,6 л (33–78 кВт)`) or name no displacement/code loses to a longer body table (Zeekr 001, Tesla Model 3/S, Zoe, Opel Corsa); (2) `CC_RE` — one cc pattern (`cm³`, `cm3`, `см³`, `см3`), and a cc figure in the _power_ cell (`1595 cm³ 95 kW`, de/ru tables) beats a litre figure of the engine cell (fuel consumption `5,7 l` was stored as 5700 cc); thousands separators stripped first; (3) `powerKwOf` takes `135 + 10 кВт` (mild-hybrid boost) as 135. Of the 13 held rows: 4 fixed (Tesla ×2, Zoe, Zeekr), Corsa fixed, C-Class 2007/2014 now clean en data, and for A8, CB400SF, CX-7, 206, R1200GS, Camry the new output is equal or better than the HEAD seed (HEAD had 8000 cc W12, 3600 cc CB400, a list of unrelated R1200 engines, later-generation Camry engines). Full cached re-ingest vs HEAD seed: 16 changed rows (13 held + dacia|solenza|2003 45→46 kW, nissan|navara|2014 gains a cc-only line, porsche|panamera|2016 +2 rows with cc); the rest are cc precision gains (Hilux, Golf, Note, Actyon). Seed re-exported with all new rows except dacia|solenza|2003 and nissan|navara|2014, which stay at their HEAD values.

**K-M5 follow-up 5 (the two held wikispecs rows).** Cause: `mergeEditions` picked the engine edition by total entry count, so de's split fragments (`1,4 Liter` + `(55 kW)` = 2 entries for one engine) outscored uk's two whole engines (Solenza 2003). It now ranks editions by entries **with power** (`wikispecs-merge.ts`; test added). Full cached re-ingest vs the previous seed: 21 rows changed, power-bearing engine count never dropped; fragment lists became whole engines (Orlando, Cerato, Premacy, SX4, Hilux, Vectra, Lexus NX). Known trade-off: toyota|corolla|2012 now en, 5 engines with power but no displacement. Solenza 2003 → en 56/47 kW; navara 2014 keeps the new cc-only line (real data). Seed re-exported in full, so seed = parser output. Not done: de-only articles (R 1250 RT) — the generations ingest reads en only.

**K-M6 step 1 (measure, 2026-10-12; read-only, no code, no DB writes).** Registry 24,721,694 rows; generations 1,185; wikispecs 1,179 (unchanged). Brand/model folded with `makeKey`/`modelKey` (Cyrillic brands already fold, `БАЗ` → `baz`, `БОГДАН` → `bogdan`), kind `АВТОБУС` (434,468 rows, 3,443 keys) / `МОТОЦИКЛ` (713,435 rows, 6,624 keys).

_1a Bus coverage._ Only **8.2 %** of bus registrations sit on a key that has generations (32 keys); of the top 40 keys 29.6k / 212k. Gaps by registrations (gen = spec = 0 unless noted):

| Key                                                                                                              | Regs                                                                               | Note                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| baz 07914 / 07923 / 2215 / 07904 / 22154 / 07924 / 07919                                                         | 14.0k / 7.2k / 5.7k / 4.6k / 4.2k / 2.7k / 2.5k                                    | БАЗ А079 "Etalon" family (en/uk/ru article: Etalon)                                                              |
| bogdan 09202 / 091 / 09201 / 092 / 09212                                                                         | 12.7k / 7.2k / 7.2k / 3.2k / 2.6k                                                  | Bogdan A091/A092                                                                                                 |
| ruta 25 / 20 / 22 / 17                                                                                           | 9.8k / 9.2k / 3.5k / 2.4k                                                          | Ruta (Etalon-based, uk only)                                                                                     |
| mercedesbenz 312d / 313cdi / 311cdi / 412d / 310d / 308d / 609d / sprinter519cdi / 312d / 416cdi / 311cdi / 412d | 10.4k / 8.7k / 4.9k / 4.3k / 4.2k / 3.4k / 3.1k / 3.5k / 3.5k / 2.7k / 2.6k / 2.6k | Sprinter / T1 / T2 trims; `sprinter` already has 3 gens → a **model-key fold** (trim → `sprinter`), not new pins |
| volkswagen lt35d / lt35                                                                                          | 8.2k / 5.0k                                                                        | LT; article "Volkswagen LT"                                                                                      |
| paz 4234 / 32054 / 3205 (1 gen, 0 engines)                                                                       | 5.1k / 4.9k / 2.7k                                                                 | ПАЗ                                                                                                              |
| gaz 32213                                                                                                        | 4.6k                                                                               | GAZelle (article exists)                                                                                         |
| ataman a092h6                                                                                                    | 2.7k                                                                               | Ataman                                                                                                           |

Already covered: Sprinter (3 gens), Crafter (2), Transit (4). Largest single lever: the Mercedes trim fold (~50k regs) and Etalon/Bogdan/Ruta (~80k).

_1b Pin queries without an en article._ Default `ingest:generations --dry-run` (limit 300, cached): 236/300 models have generations (90.3 % of the targets' cars), 64 give `none`. Mostly name-shape, not de-only: car trims/variants (`skoda octavia a5/a7/tour`, `volkswagen golf variant`, `opel astra sports tourer`, `land range rover*`, `mercedes-benz sprinter 311 cdi`), Chinese/odd brands (chery, lifan, geely), trailers/trucks (schmitz, krone, kogel, daf xf, man tgx) and generics with no per-generation article (`peugeot partner/expert/boxer`, `fiat scudo`, `opel vivaro/movano`). Motorcycles: only **6.8 %** of 713k registrations are covered (generations: bmw 67, honda 45, suzuki 23, kawasaki 14, yamaha 8). Top uncovered bike keys are Chinese/Ukrainian-market brands with no Wikipedia article (musstang mt125-8 12.5k, lifan lf175-2e 10.7k, lifan lf150-2e 10.0k, bajaj boxer bm150x 8.6k, jawa 350 6.1k …) — not pinnable. R 1250 RT / K1600GTL are outside the top-300 target list, so a pin only works through `--only`; the de-article parse is step 2.

_1c Power quality (1,115 spec rows with engines, 9,158 engines)._

| Check                                     | Count                                       | Main offenders                                                                |
| ----------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| engines without `powerKw`                 | 1,349 (14.7 %)                              | —                                                                             |
| rows with >50 % engines w/o power         | 255                                         | toyota 54, nissan 32, ford 21, renault 17, lexus 15, mitsubishi 10, subaru 10 |
| `powerKwMax` outside 0.8–1.25 × `powerKw` | 165                                         | bmw 49, tesla 20, mercedes 13, vw 11, hyundai 9, renault 9                    |
| kW/cc outside 0.015–0.12                  | 149 (101 high, 39 low, rest bikes/boundary) | bmw 35, yamaha 14, kawasaki 13, honda 12, porsche 11, suzuki 11               |

Pattern: BMW PHEV rows take the electric-motor line (`kw=8/14/40/50` with `max=110–250`, e.g. 3series 2018 / 1series 2024 / 5series 2023) — the "kW" is the motor or a mis-split `(8 kW)` fragment while max is the combined output; Audi/BMW M/Tesla high ratios are real turbo/EV combined figures vs one engine's cc (kW/cc>0.12 is partly legitimate for performance trims). The Lada 2101 `44 kW`/`max 48` lead from the plan is in the same farMax class.

**K-M6 step 2 (de-only articles).** Cause was not the generation table parser but the year source: a de `Infobox Motorrad` keeps the span in `Produktion von` / `Produktion bis` (no `production` field), so `productionSpan` found no years and the `single` generation was dropped. `productionSpan` now falls back to that pair (missing `bis` = open; lone start on a Motorrad = still produced); 2 tests. Pinned `Bmw r 1250 rt` → `BMW R 1250 RT` (`lang=de`): generation 2018–2024, wikispecs 100 kW / 1254 cc, drive Kardanantrieb. Counts: generations 1,186, wikispecs 1,180; seeds re-exported. No other de-only bike with registrations outside the top-300 target list was found to be worth a pin (the uncovered bike tail is Chinese/Ukrainian-market brands with no article).

**K-M6 step 3 (bus & bike tail) — and a correction to step 1.** Step 1 counted coverage by exact folded key, which understated it: the lookup goes through `matchVdbModelAcrossMakes` (curated `MODEL_ALIASES`, prefix rules), and the БАЗ А079 / Bogdan / ПАЗ 3205 / VW LT / Mercedes Sprinter folds already exist. Measured through the matcher: **buses 57.8 %** of 434k registrations match a generation row (41.4 % with engines), **bikes 10.2 %** of 713k. Remaining bus misses are mostly articleless (Ruta 31.6k, Neoplan, Setra, MAN, Van Hool, ЛАЗ, МАЗ). Real gaps fixed: pins `Ataman a092` / `Ataman d093` (→ Ataman A092; catches `A-092H6`, `D-093S2` by prefix), `Baz 2215` (→ BAZ-2215; catches 22154), and bikes `KTM 390 Duke`, `KTM 200 Duke`, `Yamaha MT-03`, `YZF-R3`, `TMAX`, `Honda Forza 250` (→ NSS250), `CBF600` (2 gens), `CMX500 Rebel`, `BMW G310R`. Not pinned: `KTM 390 Adventure` (redirects to the 390 series, would claim 2013), `BMW F 900 R` (no article found), Ruta, ПАЗ 4234. Mercedes aliases widened: `308D CDI` style suffix (`d?cdi`) and the T2 range now includes `711 D`. Counts: generations 1,199, wikispecs 1,193.

**K-M6 step 4 (power quality).** `cellPower` (exported, tested): a power-cell line under a quarter of the strongest line is the hybrid's electric motor / 48 V booster ("195 kW … 8 kW (11 PS)") and is dropped, so BMW mild-hybrid rows no longer give `powerKw 8/14` with `powerKwMax 195`. Full cached `ingest:wikispecs` vs the previous seed: 20 rows changed (BMW 1/3/5-series, X1, X5, Lexus NX/RX, Peugeot 3008/5008, Suzuki Swift/SX4/Vitara, Kia Forte, Toyota C-HR, VW Jetta, Honda HR-V, Mercedes S-Class, Tesla Model S), the power-bearing engine count never dropped; every changed value moved from an auxiliary figure (8–15 kW motor, German-tax `DE: 66 kW`) to the engine/system figure. Tesla Model S still has some odd front-motor values (165 kW). Not changed: the Lada 2101 `44` vs `max 48` case (the article's own net/gross figures), kW/cc above 0.12 (real turbo/EV figures), the 255 mostly-null rows (source gaps).

**K-M7 step 1 (more pins, 2026-10-12).** Re-measured through `matchVdbModelAcrossMakes` (kinds `['any']`): buses 61.1 % → 61.7 %, bikes 10.0 % → 10.1 % of registrations with a brand and model (`current_registration`). Six pins added (`generations-titles.csv`): `bmw f 900r` → de `BMW F 900 R` (2020–now, 77 kW / 895 cc; the 35 kW line is the article's reduced version), `mercedes-benz 0303` → `Mercedes-Benz O303` (1974–1992, 213 kW V8 from the ru edition), `volvo b7 r` → `Volvo B7R` (1997–2019; catches B7RLE by prefix), `volvo b12` → `Volvo B12` (1991–2011), `volvo b12 b` → `Volvo B12B` (2001–2009), `yamaha yzf 600r` → `Yamaha Thundercat` (the redirect target IS the YZF600R, 1994–2007, 75 kW / 599 cc). The old `Bmw f 900 r` pin had no en article; it now carries `,de`. Wikispecs: B12 has no data (0 rows stored), B7R/B12B only length/width. Caveat: B7R `kerbKg 18000` was the infobox "weight" (a gross figure) — fixed by `GROSS_WEIGHT_KEYS` in `wikispecs-merge.ts` (deny-list of `make|model|yearFrom`, tested; B7R kerb is now null); `lengthMm 11500` is the midpoint of the article's 10.5–12.5 m range (kept). The other bus/truck rows with kerb ≥ 4.5 t (Ural-375, PAZ-3205, ZIL-130/131, Ataman A092, BAZ A079) are plausible kerb weights.
Not pinned (reason): Honda Steed / XR 150 / Yamaha Majesty 250 (no en/de article, it Majesty stub has no generations), Suzuki Address 125 (de article gives none), Honda PC 36 (redirects to CB600F 1998–2013, the whole Hornet run), Harley XL883N (Sportster 1957–now), KTM 390 Adventure (redirects to the 390 series), Mercedes Tourismo / O350 (the de article parses only its first generation, 1994–2006), MAN A21 (redirects to MAN Truck & Bus), ПАЗ 4234 (redirects to PAZ-3205, 1989–now). Counts: generations 1,205, wikispecs 1,198; both seeds re-exported.

**K-M7 step 2 (wikispecs quality leftovers, 2026-10-12).** Parser fixes in `packages/shared/src/wikiSpecs.ts` (tests in `wikiSpecs.tables.test.ts`), full `ingest:wikispecs` from the cache (1,198 rows, no row lost). (1) **Tesla Model S 165 kW:** a footnote row ("Elektromotor vorne leistet 165 kW") spans the whole table and `expandSpans` repeated it into every engine column; a first body cell with `colspan ≥ 5` that states a power is now dropped (group titles without a figure stay, they carry the fuel). The same row removal cleans the stray "ab 02/2020 mit 48 V … 8 kW" lines out of BMW 3/4/5/7/X1 `raw`. (2) **`cellPower` system total:** a line naming the total (`zusammen`, `Gesamt`, `combined`, `system power`, `суммарн…`, `сумарн…`, `разом`; the label may stand alone on the line before the figure) is the figure and the per-axle / engine-only lines are ignored — Model S Performance 205/585 → 585, plug-in hybrids (BMW 4/5 Series, Santa Fe, Sonata, Renegade, Superb, Passat, Tiguan, Duster, Accord, HR-V, A7, SX4) went from a min–max (`80/210`) to the system output. (3) **`Dauerleistung laut Zulassung`** (registration-limited rating, "DE: 66 kW") is no longer a power row; the Model S old-model table now reads 175 / 225 / 235 … from "Max. Leistung" (22 → 19 engines: identical columns merge). Model 3 (de) drops 4 rows whose only figure was that registration rating (100 / 110 / 120 / 153 kW; 7 → 3 engines) — fewer but no wrong figures. (4) **Toyota Corolla E160:** header `Displacement, engine code` held "1329 cc I4 (1NR-FE)" and was read as a bare code column; a header naming both displacement and engine code is now an `engine` column (5/5 engines got displacement; the engine code is not stored for such tables). (5) **K1600GT `2011–2011`** was already fixed (motorcycle infobox lone start = open end, `loneStart` in `productionSpan`; DB `year_to` empty) — stale entry. (6) **Lada 2101 DIN rule:** a column-per-engine table with several rated-power rows by standard (GOST 46/51, DIN 44/48, SAE 48/–) now keeps only the row labelled `DIN` (`dinOnly` in the column-per-engine branch of `wikiSpecs.ts`, test in `wikiSpecs.tables.test.ts`) — 2101 reads 44 kW (1.2 L) and 48 kW (1.3 L), no `powerKwMax`; Lada 2106 keeps its powers (only the extra raw text dropped). **Seeds re-exported** (`wikispecs.csv.gz` 1,198 rows, `model-generations.csv.gz` unchanged at 1,205): the diff vs the previous seed touched 23 rows, all from the step 2 fixes plus the Lada rule (Tesla Model S 22 → 19 engines, Model 3 7 → 3, plug-in hybrids now system output). **Null-power rows (308 of 1,198 with no engine power, 66 of them with no engines at all):** no rule added; sampled Toyota Avalon / HiAce, Honda Accord, Nissan Sentra, Ford Kuga — the figure is either prose only ("making {{convert|192|hp}}"), absent (en bullet list "1.6 L HR16DE I4"), or in a table of another generation (HiAce H300, Accord 10th gen). A prose rule would pick wrong ratings (Avalon quotes 280 hp and 268 hp for the same engine).

**K-M7 step 3, option B (more ru/uk/en pins, 2026-10-12).** Checked candidates in the en/ru/uk editions before pinning. Pinned (ru): `Maz 5551` → МАЗ-5551 (1985–2019), `Izh 2717` → Иж-2717 (1997–2005; also catches 27175), `Izh 2715` → Иж-2715 (1972–2001); all three reach the registry rows through `matchVdbModelAcrossMakes` (МАЗ 5551, ИЖ 27175 / 2717 / 2715; ≈ 6.4k cars). Rejected: Bajaj Boxer (redirects to CT 100, the BM 150 X is not the CT 100), Jawa 350 (en article has no infobox / years), МАЗ-5337 (`{{Годы автомобиля|1987|}}` open-ended template gives no generation row — a parser gap, ~1.5k cars), МАЗ-5334, Moskvich 412 (no result), Ruta (no article in any edition; `Рута (автобус)` redirects to the Chasiv Yar repair plant), Lifan (no en article), ЛАЗ (the registry volume is below the top lists; articles exist: en LAZ-695 / LAZ-699, uk ЛАЗ-695). Result: generations 1,208, wikispecs 1,201; remaining articleless tail needs option E (hand-curated seed) — separate decision. Izh 2717 engine rows are messy (the ru table puts "(74 л.с., 120 Нм)" in its own row).

**K-M7 step 4 (verify in the app, 2026-10-12).** Checked the API and DB for the newly covered buses, bikes and Izh cars (Ataman A092G9, БАЗ 2215, МАЗ 5551А2, KTM 390 Duke, Yamaha MT 03, BMW R 1250 RT, ИЖ 2717 / 2715): a model-year outside the pinned range correctly gets no generation chip (Ataman 2018 > 2015, БАЗ 2215 2011 > 2010, ИЖ 2717 2008 > 2005), in-range cars get the right chip and years. Bug found and fixed: BAZ-2215's wiki "weight" (3,980 kg) is the gross figure — added `baz|2215|2003` to `GROSS_WEIGHT_KEYS` (with a test), re-ingested that one model (`--only "baz 2215"`), wikispecs seed re-exported; counts unchanged (generations 1,208, wikispecs 1,201). The bikes have no wiki spec rows (generation chip only). Not changed: Ataman A092 kerb 5,000 kg vs ~5,840 kg in the registry (likely unladen vs registry own weight); messy Izh-2717 / Ataman engine rows. `pnpm test` (1166), `lint` (0 errors), `type-check` green.

**K-M7 open decision 1, МАЗ-5337 parser fix (2026-10-12).** Two gaps in `generations-parse.ts`: (1) `cleanWikitext` turned the ru card template `{{Годы автомобиля|1987|}}` into a bare `1987` (a one-year span); it now reads it as `1987–present` (open end) and `|1985|2019` as a range. (2) `infoboxField` ended a field only at a Latin `| name =` line, so a ru field ran on through the whole infobox and `productionSpan`'s model narrowing picked a later "MAZ-5337" mention (no years) → no row; the boundary now accepts any letter (`\p{L}`). Tests added to `generations-parse.test.ts`. Pinned `Maz 5337,МАЗ-5337,ru` (≈ 1.5k cars, also 53371 / 533702 by prefix); МАЗ-5551, Иж-2717, Иж-2715 re-ingested unchanged. Generations 1,209 (МАЗ-5337 1987–), wikispecs 1,202; both seeds re-exported.

**K-M7 step 5, phase 1 (curated seed plumbing, 2026-10-12).** Policy (agreed): sources = manufacturer pages (facts only, nothing copied) + our own registry data, no scraped third-party catalogues; one citation per row (URL + access date) shown as "source", never as Wikipedia; a row with fewer than 3 sourced figures is dropped; an unsourced figure stays empty. Built: migration `0065_model_spec_curated.sql` (`source_label` / `source_url` / `source_accessed` on `model_spec_wiki`; the language/title columns cannot hold URL + date); `scripts/src/wikispecs-curated.csv` + `wikispecs-curated-parse.ts` (validation, PS→kW, drop rules, tests); `pnpm ingest:wikispecs:curated` (`--dry-run` supported) upserts one `model_generations` row (`source='curated'`, `year_from` 1900, open end) + one spec row per model; `ingest:wikispecs` skips curated models so a refresh cannot wipe them; both seed exporters/importers carry the new columns. Contract: `wikiSourceSchema` gains `url` / `accessed` (`.nullable().optional()`), `CURATED_LANG` / `CURATED_YEAR_FROM` / `isCuratedSource` in `wikiSpecsApi.ts`. UI: `WikiSourceLine` shows "Source: Bajaj Auto · accessed 2026-10-12" linking the manufacturer page; `WikiSpecs` uses curated footnote / info strings (ua/ru/en, "not Wikipedia"), hides the span and "year N of M". Rows: Bajaj Boxer BM 150, BM 150 X, BM 125X (bajajauto.com regional pages; registry-name ↔ Bajaj-name mapping is an assumption). Counts: generations 1,212, wikispecs 1,205; old seed rows unchanged. Sourcing finding: Ruta, Musstang, Lifan, Loncin, Spark have no official spec pages (only ads / third-party databases, excluded by policy), so many of the ~30 targets will be dropped; Geon, Viper, Forte, Shineray still to try.

**K-M7 step 5, phase 2 (2026-10-12, closes step 5).** Sourcing sweep of the top registry bikes: Geon (Dakar GNS 300, Scrambler 250, X-Road 250), Viper (V150A, ZS150-J, V250L), Forte (FT125-K9A), Shineray (XY250GY-6C, XY200-4 Intruder; shineraymoto.com lists category pages only, no spec figures and no XY250GY-6C) have no official spec pages reachable (only dealer / marketplace / third-party databases, excluded by policy), so no rows; buses (Ruta, Neoplan, Setra, MAN, Van Hool, ЛАЗ) not pursued for the same reason. Added one row: Bajaj Boxer BM 100 ES (bajajauto.com/en-ng/bikes/boxer-100es-spoke; registry "BOXER BM 100ES" ↔ Bajaj "Boxer 100ES" is an assumption; fuel left empty because the page does not state it). Other Bajaj registry models skipped: Avenger / Dominar / Pulsar already have Wikipedia rows. Counts: generations 1,213, wikispecs 1,206 (+1 each); seed diff shows one added line per file, none removed. Browser check (СВ1206АВ Boxer BM 100ES, АЕ5032АС Boxer BM 150 X): "Source: Bajaj Auto · accessed 2026-10-12" linking the manufacturer page, footnote "manufacturer catalogue values … not Wikipedia data", no year-span / year-of-N line, generation chip hidden. Remaining articleless tail stays empty by policy.

## Own ALPR real-photo pass — findings and fixes (moved from PLAN.md, 2026-10-12)

**Real-photo pass (2026-09-30 / 10-01) — 88 own Ukrainian photos** (kept in a
gitignored `services/alpr/eval/images/`; `services/alpr/eval.mjs` runs them
through the container and writes `eval/results.json`, scoring recall once an
`eval/labels.csv` (`file,plate|plate`) exists — **no labels yet, so no recall
figure**). Findings and fixes:

- **EXIF orientation was ignored** (the biggest miss): phone portrait shots are
  stored sideways with an EXIF flag, so plates reached the detector rotated 90°.
  `app.py` now applies `ImageOps.exif_transpose`. Every previously-empty phone
  photo then read correctly. (The web flow hid this: the canvas downscale drops
  EXIF; a direct upload did not.)
- **Truncated reads.** The detector box is tight/cut on angled plates
  ("BC15"): `app.py` now OCRs a padded crop and retries with wider padding when
  the read isn't 8 chars. A box touching an _inner tile edge_ is a plate cut by
  a seam ("388CX" beat "BE8388CX" in the merge) — such boxes are skipped and
  full-length reads win the duplicate merge.
- **Candidate filter.** `isUaPlate` (`packages/shared/src/plate.ts`) keeps only
  complete plates in shapes verified against the registry (16.7M rows):
  `LLDDDDLL` ~91% — besides the 12 Cyrillic look-alike letters it uses Latin
  Y/Z/J/F/D/G/… (~6% of rows; all electric-car series, e.g. `ВС1554ZА`) — and
  the legacy `DDLLDDDD` ~8% (region digits first; registry dates from 2013, so
  re-registered old plates). Signs ("HOTEL"), foreign plates and partial reads
  no longer appear as boxes or in "Also found". `repairOcrPlate` is now
  shape-aware, repairing by slot (0/O, 1/I, 8/B, 2/Z, 5/S).
  Known cost: the legacy shape lets an occasional junk read through (`98II1166`
  on a small object) — require a higher score for it if it gets annoying.
  Not matched on purpose: 6 digits, 4 letters + 4 digits, diplomatic, …
- **Photo EXIF in the UI.** `lib/photo-meta.ts` reads capture date + GPS from
  the original file (`exifr`, before the downscale); `PhotoMetaInfo` shows them
  (GPS links to OpenStreetMap), warns when the photo is ≥1 year old (plate may
  now be on another car) and when it predates 2013 (registry data starts
  2013-01-02 — e.g. `АТ9998АХ` is read right but legitimately absent). None of
  the 88 photos carries GPS (stripped/disabled), so that line is untested on
  real data. Zoom dialog: 🏷 button / `B` hides the plate labels.
- **Two-row / stacked car plates — fixed 2026-10-01.** The registry has ~119k
  4-letter + 4-digit plates (`KA EO` over `3881`, stored `KAEO3881`); the
  whole-plate OCR reads them in an unstable order. `app.py` `_read_stacked`: a box
  with width/height < 2.4 is split into two overlapping rows, each OCR'd (each must
  read exactly 4 chars), joined top+bottom; otherwise the normal read.
  `LLLLDDDD` added to `PLATE_SHAPES`/`isUaPlate`/`repairOcrPlate`. Verified on
  `ua_kaeo3881.jpg`, `images.jpg`, the EV and Passat stacked plates.
  **Tried and rejected:** reordering LLDDDDLL→LLLLDDDD from box aspect alone —
  angled single-row plates also have aspect 1.3-2.4 and it scrambled ~25 correct reads.
- **Motorcycle (3-row) plates — partly fixed 2026-10-01.** Row-by-row OCR does not
  work (this OCR model returns nothing for a lone short row like `AI`), so
  they go through the whole-plate read, which keeps their order but misreads
  small soft plates (`ua_ai1920ja.jpg`: `AL1930JA`, truth `AI1920JA`). Fix in
  `_read_plate`: when no plain read reaches 0.97 (0.9 was too low: the web's q0.85 JPEG re-encode turned the plain read into `AL1930JA` at 0.94 and the retry never ran), retry on a tight crop upscaled 2x
  and sharpened → `AI1920JA` 0.98. Padding hurt that plate (wider crops read
  `AI1930JA`/`AU1533JA`). Cost: ~+13% latency (414→469 ms/photo avg). The
  sharpened retry also changed 8 other reads among the 88 photos; on the one checked
  by eye (`20241103_135726.jpg`) it was better (`BC3847EI`), but with no
  `labels.csv` there is still no recall number.
- **Legacy-shape junk — fixed 2026-10-01.** `recognize.mapper.ts` drops a
  digits-first (`DDLLDDDD`) read scoring < 0.7 (`LEGACY_MIN_SCORE`).

## Own ALPR: moped plates, constrained decoding, alternative reads (2026-10-26)

Three user photos failed: a three-row moped plate (`AB 1918 AB`, steeply tilted, read as junk), `AH 4018 AC` (read `AH4078AC`), and a car plate `BX 5213 BO` (read `BX5215BU`). Fixes, all in `services/alpr/app.py` unless noted:

- **Row-wise reader (`_read_rows`).** For near-square / tall boxes (width/height < 1.6) the general text OCR (RapidOCR, the VIN route's reader) reads each row on its own: crop scaled to a 400 px long side, the `UA` flag line dropped, rows sorted top to bottom, accepted only as `LLDDDDLL`. A box taller than wide also tries steep rotations (±30…85°). It runs **once per merged plate**, after the tiles are deduplicated. It replaces the plate OCR's read only when that read is weak (not 8 characters, or below 0.9) or the row read is more confident; the same text keeps the plate OCR's score.
- **Constrained decoding (`_plate_ocr`).** The OCR's per-slot probabilities are re-picked within the slot's class once the shape (`LLDDDDLL`, `LLLLDDDD`, `DDLLDDDD`) is known: letters from `ABCEHIKMOPTXYJFDGZ`, digits from digits. The letter set is measured, not assumed: a 2% sample of `registry.registrations` has Y 7.7k, J 6k, F 4.9k, D 2.3k, G 1.6k, Z 1.2k and L/U/N/R/Q/V/S under 100 each. A first version with only the 12 Cyrillic look-alikes turned `AA2762YA` into `AA2762XA`. Fixes `BX5215BU` -> `BX5215BO` (the model had `U` 0.88 vs `O` 0.12).
- **Alternative reads (`_alternatives`).** When variants disagree on one character (3/5 on a blurry plate), up to 2 other full-length reads that differ by exactly one character and score >= 0.55 are returned on the same box. They are clamped just below the primary's score, because the API sorts by score and opens the top one. The web groups equal boxes (`components/plate-groups.ts`): chips joined by a chain icon, numbered and colored per plate, matching the outline in the photo.
- **Latency regression found on the way.** The first row reader ran per tile and enlarged crops 3x with 9 rotations: one 800 px false detection cost ~8.5 s x 7 tiles, the worst eval photo took 98 s and the API's 10 s upstream timeout showed "photo search failed". After the fix: median 0.64 s, max 2.6 s, 60 s for all 88 photos (baseline ~50 s). **Always time the eval (`results.json` has `ms`) after touching the pipeline**, and never run an eval while using the app: the service handles one image at a time.

Eval (88 photos, no labels): top read unchanged on 87; the one change is a junk read the API repairs to the same plate. `BX5213BO` is not the primary for its photo (the OCR genuinely sees 3/5 as ambiguous at ~235 px); it is offered as the alternative.

## Own ALPR: web upload resize (2026-10-26)

`eval.mjs --shrink` re-encodes each photo like `shrinkImage` (sharp: orient, fit in `SHRINK_MAX` px, JPEG `SHRINK_Q` stepping down by 15 to <= 2.5 MB), writes `results.shrink.json` and lists reads that differ from `results.json` plus the count of confident (>= 0.9) original reads lost. Measured on 90 photos:

| max side, quality          | confident reads lost |
| -------------------------- | -------------------- |
| 3200, 85 (old web default) | 5                    |
| 3200, 95                   | 4                    |
| 4608, 85                   | 1                    |
| none, 85                   | 1                    |

The pixel cap, not the JPEG quality, costs the reads: 4000-4128 px phone photos lose `BC9779IX` (parking) and others. The single remaining loss is the wrong alternative `AI1930JA`. `MAX_DIMENSION` in `apps/web/src/lib/image.ts` is now 4608 (the 2.5 MB byte target and the API's 4 MB multipart limit are unchanged). sharp's encoder is not Chrome's, so confirm in the browser. Eval ground truth so far: `labels.csv` with `AB1918AB`, `AH4018AC`, `AI1920JA` = recall 3/3, 4 extra reads (`AH4078AC`, `3UK6`, `AI1930JA`, `AL1920JA`); total time 59 s, slowest photo 2.6 s.

## Own ALPR: alternatives noise (2026-10-26)

`_alternatives` in `services/alpr/app.py` took every one-character variant scoring >= 0.55, so a correct 0.987 read (`AH4018AC`) came with `AH4078AC` (0.943), and `AI1920JA` with `AI1930JA` / `AL1920JA`. Now, when the primary scores >= `ALT_CONFIDENT_SCORE` (0.97), an alternative more than `ALT_CONFIDENT_GAP` (0.03) behind it is dropped. A first version that dropped all alternatives behind a confident primary also removed `BT1372BK` (0.985 beside `BT1572BK` 0.986 on `20230221_105943.jpg`), a real near-tie, hence the gap. Eval (90 photos): 6 alternatives dropped, 0 added, no top read changed, recall 3/3 with extra reads 4 -> 1; total 59.4 s (was 59.2 s), slowest photo 2.9 s. Only 3 plates are labelled, so the 0.97/0.03 values are untuned; which of `BT1572BK` / `BT1372BK` is right is unknown.

## Own ALPR: registry check of alternatives (2026-10-26)

OCR cannot settle an ambiguous glyph (`BX5213BO` vs `BX5215BO`), the registry can. `LocalRecognizeService` now passes the mapped candidates through `RegistryRankService.rank` (`apps/api/src/recognize/registry-rank.service.ts`, pure logic in `registry-rank.ts`): only reads that share a box with another read are looked up (`selectDistinct plate … where plate in (…)` on `registry.registrations`); if a plate's best read is not registered and an alternative is, they swap scores inside the group, so the top candidate (the one the web opens) is the registered one. Both or neither registered: OCR order stays. A failing lookup logs a warning and keeps the OCR order. No schema change (a visible flag would need `schemas.ts`). Tests: `registry-rank.test.ts`; existing recognize tests pass a pass-through rank service. Not run against the real registry yet.

## Own ALPR: concurrency (2026-10-26)

`/recognize` and `/recognize/vin` were `async def` around CPU-bound inference, so one upload held the event loop and the rest queued: 3 simultaneous uploads of `20151209_132029.jpg` took 3.0 / 6.1 / 9.4 s (the API times out at 10 s). They are now plain `def` (FastAPI's threadpool; `_read_capped` reads `image.file` synchronously). Same test after: 6.5 / 5.7 / 6.5 s wall, identical reads, `/healthz` stays at ~10-30 ms. Sequential eval over 90 photos: every read and score identical, total 53.2 s (was 59.4 s), slowest 2.4 s. The gain is limited because the requests share one CPU and ONNX's own threads; multiple uvicorn workers were not tried (each would load the models again). Thread safety of the shared models is only evidenced by the identical reads under three parallel uploads.

## First VPS deploy (2026-10-27)

Contabo Cloud VPS 6 (EU, Ubuntu 24.04, no Contabo backup add-on), DNS on Cloudflare (Full strict, origin certificate, HTTP/3, DNSSEC turned off at
Squarespace before the nameserver change; Cloudflare was active within minutes), Resend domain verified through its Cloudflare auto-configure. Order that worked:
`bootstrap.sh` as root, GitHub Environment `production` (secrets + variables), `deploy-api` with `sync_only`, `deploy-alpr`, DB copy, `deploy-api`, `deploy-web`.
Verified from outside: `/healthz` `{"status":"ok","db":"up"}` in ~0.2 s, `/`, `/sitemap.xml`, `/robots.txt`, `/api/plate/*` all 200, `alt-svc: h3`.

**Problems found, all fixed in `docs/deploy.md`:**

- `deploy-alpr` before `deploy-api` fails: its deploy step needs `docker-compose.prod.yml`, which only `deploy-api` delivers. Order is `deploy-api` (`sync_only`) first. Both `carsua-*` packages must be Public before the VPS can pull.
- Merging to `main` starts the path-filtered deploys at once, and `deploy-api` without `sync_only` would migrate the empty DB before the restore. Merge with `[skip ci]` until the data is in.
- The `ci` job gates `deploy-api`: `prettier --check` failed on `docs/plan-done.md` and `pnpm audit --prod --audit-level=high` on `undici` 7.29.1 (via `scripts > cheerio`). Fixed with an `overrides` floor (`undici@>=7.18.0 <7.30.1: ^7.30.1`) in `pnpm-workspace.yaml`.
- Windows dump: `pg_dump … > file` in PowerShell re-encodes the binary. Dump inside the container (`-f`), then `docker cp`. In Git Bash the container path needs `//tmp/…` (else rewritten to a Windows path); `docker cp` produced `carsua.dumpcarsua.dump`.
- The documented `pg_restore -j 4 … < dump` cannot work (parallel restore does not read stdin) and the backups folder is not mounted in the container: copy the dump in with `docker compose cp`, run detached with `nohup`. `ALTER ROLE` is not needed (`pg_dump` carries no roles).
- A "finished" check built on `docker compose exec … || echo finished` printed "finished" while `COMPOSE_FILE` was unset in a new SSH session and the restore was still building indexes. Done = no `pg_restore` process **and** no active `REFRESH MATERIALIZED VIEW`.
- `deploy-api.sh` ran as `bash -s` from stdin; `docker compose run -T … migrate.js` consumed the rest of the script, so the step passed with no api container (Caddy: `lookup api-blue … server misbehaving`, public health check timed out). Fixed with `</dev/null` on the migrate run and the caddy reload.
- Link-preview cards rendered **without text** (`og.controller.ts` looked up the Noto Sans files once at boot; the api first started before `deploy-web` had put `fonts/` in `/web/current`, so the list stayed empty for the process lifetime, while logos are read per render and still showed). Cloudflare then cached the text-less PNG for 24 h (`cf-cache-status: HIT`). Fixed: fonts are resolved on the first render, a card without fonts is neither kept in the LRU nor given the 24 h `Cache-Control`, and `deploy-api` now purges the `/og/` prefix at Cloudflare after the health check (best-effort; prefix purge may need a paid plan, fallback `{"purge_everything":true}`). Verified: card 134,533 B -> 166,761 B, `cf-cache-status: MISS` after the purge. Telegram/X keep their own preview cache (`@WebpageBot`, X card validator).

**Measured:** dump 1.28 GB for 24.7M rows (tables 14.3 GB incl. indexes + 8.9 GB matview on disk; indexes and matviews are rebuilt on restore), upload 43 s, restore with `-j 4` about an hour, the last step (`REFRESH MATERIALIZED VIEW registry.current_registration`) alone over 42 min. VPS DB 21 GB vs 23 GB local. `registrations` 24721694, `current_registration` 16723888, `app.users` 2 on both sides; restore log had 0 errors; the migrator reported "up to date" on the restored DB.

**Follow-up the same day (R2 backups, SSH, Turnstile):**

- R2 backups: bucket `carsua-backups` + object-scoped Account API token. The first upload failed with 403 AccessDenied: rclone checks/creates the bucket before uploading and a bucket-scoped token may not. Fix `RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true`, written to `backup.env` by `deploy-api`. A `501 NotImplemented` on attempt 1 then success on attempt 2 is normal. Verified: nightly dump (8.6 MB) restored into a scratch `postgres:18.6` (create schemas `app` + `registry` first; 9 + 6 tables), full dump (1.28 GB, ~10 min to create) passes `pg_restore --list` (68 `TABLE DATA`). Restore runbook added to `docs/deploy.md` "Restore from R2" (nightly-over-full path not yet tested on a populated DB).
- SSH: password login was still on. sshd keeps the first value it reads and the provider's `50-cloud-init.conf` loaded before `99-carsua.conf`. Renamed to `00-carsua.conf` (`bootstrap.sh` writes that name), reloaded; `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password` is now refused. `deploy` has no sudo, so the root edit went through the `docker` group (privileged container + `nsenter`).
- Turnstile widget created and `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` set.
- Nightly cron confirmed 2026-10-28: `/etc/cron.d/carsua-backup` (not the user crontab; installed by `bootstrap.sh`) ran at 03:30 server time (02:30 UTC), `nightly-20261028T023002Z.dump` is in R2 and the healthchecks.io `backup` check logged Started + OK. `backup.sh archive` runs clean but is a no-op until the first VPS ingest fills `/opt/carsua/archive`. On the VPS, rclone has no config file: load `/opt/carsua/env/backup.env` (`set -a; . …; set +a`) before any manual `rclone` call. Opening the ping URL in a browser counts as a ping, so don't.

Cloudflare settings confirmed 2026-10-28 (Always Use HTTPS, Min TLS 1.2, HTTP/3, Browser Cache TTL, Bot Fight Mode, WAF rate-limit rule `api-lookup-limit` 30 req / 10 s per IP on `/api/plate*` + `/api/vin*`, tested: ~30 × 200 then 429); HSTS comes from Caddy, not Cloudflare.

**Open (ordered list with the concrete steps: `docs/deploy.md` "Still open"):** populated-DB restore test, `backup.sh archive` + `full` after the first VPS ingest, security checklist §7, browser smoke test (login, mail, VIN, camera), secrets rotation, `ingest-cron` (monthly delta ingest and `ingest:wanted` are manual on the VPS until then), CSP is Report-Only, Lighthouse on the VPS.

## Own ALPR: letter set re-measured (2026-10-26)

`PLATE_LETTERS` in `services/alpr/app.py` was measured on a 2% sample. Re-measured over all 24.2M 8-character plates in `registry.registrations` (24.7M rows, read-only): the 12 Cyrillic look-alikes dominate (А 20.9M … Р 3.6M); Latin Y 389k, J 303k, F 240k, D 133k, G 80k, Z 62k; L 10.5k, U 5.6k, N 3.8k, S 2.1k, R 1.6k, V 1.5k, Q 0.5k (L is 0.04% of plates). Same 18-letter set, unchanged. Not done: sharing the set with TypeScript. `isUaPlate` accepts any Latin letter and `repairOcrPlate` maps `5`->`S`; the own ALPR constrains letter slots itself, so it never sends that case, and the ALPR build context (`services/alpr`) cannot import `packages/shared` without a copied file.

## infocar video crawl and YouTube fallback — run log and no-video model list (moved from PLAN.md, 2026-10-12)

**Step 2a — infocar video crawl: done 2026-10-04; models with no video → YouTube fallback (ingest built 2026-10-05; daily runs + lookup/UI open).** Full crawl:
153 brands, 3,739 videos (`registry.car_videos`, committed as `scripts/seed-data/infocar-videos.csv.gz`, loaded by
`ingest:ratings:csv`). `youtube_id` is the real YouTube id scraped from infocar's `/video/` pages (infocar embeds
YouTube), not an infocar-internal id; thumbnails are infocar-hosted. 83% have a model slug + generation id, but only 42%
of all videos have a generation present in the version catalog (the year filter needs it; 41% fall back to the title
year, 15% have neither). Measured `videoLookup` over the 400 most-registered (brand, model) pairs: 245 have ≥1 video
(74.1% of those registrations); on the top 60, 52 have one, only 41 once the car's year is applied. **No-video models,
by registrations (the to-do list for alternative sources):**

- Ukrainian/Soviet-built, largely outside infocar's coverage: Daewoo Lanos (~230k incl. ЗАЗ/ZAZ-Daewoo spellings), Sens,
  Nexia; ВАЗ 2101/2103/2105-2109/21043/21063/21093/21099/2121/21101/21104/211540/217030/21150/21213; ЗАЗ 110307/1102/
  110557; ГАЗ 3110/3302; Chevrolet Niva.
- Western passenger cars: VW Touran (63k), Ford Fusion (59k), Mitsubishi Lancer (86k), Fiat Doblo (77k), Renault Laguna
  (28k), Opel Omega (38k), Volvo V50, Chery Amulet (34k), Dodge Journey, Hyundai Getz (30k) / ix35, Nissan Note /
  Primera / Tiida, Ford C-Max, Opel Meriva / Movano, Peugeot 307 / 207 / Expert, Fiat Scudo / Ducato, Mercedes Vito,
  Chevrolet Nubira, VW Bora / LT 35, Audi 100 / 80, Mazda CX-7 / 626 / 5, Mitsubishi Colt.
- Commercial/odd registry entries (MAN TGX, DAF XF, Krone SD, ПГ/ПА trailers, Honda Dio, Geely MR-7151A, Musstang):
  skip — not worth video matching.
- Also: old-year gaps (model has videos but none for a 2007–2008 car): Toyota Camry, Hyundai Tucson / Santa Fe /
  Accent, Mazda 3, Nissan Qashqai, Mitsubishi Outlander, VW Caddy, Opel Zafira. Intended (no wrong-generation videos).
- Re-derive/extend the list with the registry query + `videoLookup` (top N pairs, 0 results) — the 400-pair run is
  what the numbers above come from; the registry spells many models twice ("LANOS LANOS"), collapse them first.

**YouTube fallback — trial done 2026-10-04; full build + crawl is the next session's job.** Search YouTube for gap
models only, as an **offline batch** that stores results next to `car_videos` (new `source` column or a sibling table;
links + facts only, same lookup path) — never live per request. Per (brand, model, generation), not per year.

**Build status (2026-10-05): ingest built (steps 3, 4, 6-tooling, 7); real run: ≥5,000 tier done, ≥1,000 tier done (day 7, see below); lookup integration done 2026-10-07 (`ReviewsService.lookup` falls back to `youtube_videos` through `videoLookup` when infocar has no video for the model; the Videos section needed no UI change, only the source footnote); the response video now carries `source` (infocar|youtube) + `lang`, the Videos section shows a "found by a YouTube search" note for fallback videos and lists the UI language first (`preferLanguage`, client-side — the API still caps at 6 newest, language-blind).**
**Run log:** `pnpm ingest:youtube-videos -- --min-cars 5000`, once per Pacific day (after ~10:00 Kyiv). Day 1 (2026-10-05): 67
models, 443 videos, 9,090 units, 0 errors; obscure ВАЗ trim codes fell through to 3 queries (303 units each), so fewer than the
~89 models/day estimate. Afterwards ВАЗ trim codes were folded into the base model (`baseModel`: 21063 → 2106, 210994 → 21099,
217030 → 2170; day-1 rows re-keyed, their run rows dropped), so the ≥5,000 tier is now 131 models with ~85 left (≈ 1 more
day). Day 2 (2026-10-06): 65 models with videos, 4 none (ЗАЗ 1102xx/1103xx), 0 errors, 459 videos, 8,988 units; daily budget
reached with 16 models left in the tier. Day 3 (2026-10-07): **≥5,000 tier finished** — 16 models with videos, 0 none, 0 errors, 112 videos,
2,222 units; the remaining budget went to `--min-cars 1000`: 44 models with videos, 5 none (ЗАЗ TF698K, Mercedes 200, Fiat NUOVO DOBLO,
Daewoo T13110, ЗАЗ 110307-40), 0 errors, 308 videos, 6,764 units (8,986 total); 194 of 243 models left in that tier (≈ 2 more days;
next in line: Mercedes-Benz ML 320 down to 3,033 cars). Day 4 (2026-10-08): `--min-cars 1000`: 50 models with videos, 5 none (Daewoo FSO LANOS TF69Y, ЗАЗ TF69YO, ЗАЗ 110377-40, …), 0 errors, 302 videos, 8,984 units; daily budget reached, 151 of 206 models left in that tier (≈ 1.5 more days; next in line: ≤ 2,254 cars). CSV re-exported (1,574 videos). Day 5 (2026-10-09, run after the 10:00 Kyiv reset; a first attempt at 09:10 found the quota still spent and did nothing): `--min-cars 1000`: 39 models with videos, 8 none (АЗЛК 2141201, заз-Daewoo T13010, Chrysler GR.VOYAGER, …), 0 errors, 221 videos, 9,080 units; daily budget reached, 104 of 151 models left in that tier (≈ 2–3 more days; next in line: ≤ 1,662 cars). CSV re-exported (1,792 videos). Day 6 (2026-10-10, run at 11:06 Kyiv): `--min-cars 1000`: 54 models searched (48 with videos, 6 none — БОГДАН 211120, Audi 80 1.8 S, ЗАЗ 110270, Mercedes-Benz 208 D, …), 0 errors, 279 videos, 8,986 units; daily budget reached, 50 of 104 models left in that tier (≈ 1 more day at ~54 models/day; next in line: ≤ 1,267 cars). CSV re-exported (2,063 videos). Day 7 (2026-10-11, run at 10:44 Kyiv): `--min-cars 1000`: 49 models searched (43 with videos, 6 none — Geely FE-2, Geely JL7152, ЗАЗ 110377, ЗАЗ 110216, Mitsubishi GALANT 2.0 I, ЗАЗ 110380-40), 1 error (Dacia SUPER NOVA: a `videos.list` item had no `contentDetails.duration`, probably a live/upcoming video; fixed by making it optional, a missing duration now counts as 0 and the item is filtered as "short"), 258 videos, 8,379 units. Re-run the same day: Dacia SUPER NOVA 3 videos, 303 units (8,682 total). **≥1,000 tier finished**; CSV re-exported (2,320 videos). **First partial CSV seed committed 2026-10-06** (`a0b278a`: 881 rows over 110 models in the DB and the CSV; the per-day
sums above are 902 — the difference was not investigated). **Next:** nothing required — the YouTube fallback is complete and committed; generation/year matching is parked (Remaining item 2) and `--min-cars 500` stays deferred (newer models have fewer videos, 101-303 units per model, ≈ 9+ days). Commit `scripts/seed-data/youtube-videos.csv.gz`.
Migration `0031_youtube_videos.sql` (`registry.youtube_videos` + `youtube_model_runs` resume/quota ledger),
`scripts/src/youtube-videos.ts` (+ `youtube-videos-filter.ts`, tested), CSV export/import wired into `ingest:ratings:csv`.
The target list is derived (`--list`): 5,142 passenger-car gap models; tiers by registered cars at ~101 units/model, ~89
models/day: ≥10,000 cars = 99 models ≈ 1.1 d · ≥5,000 = 164 ≈ 1.8 d · ≥2,000 = 299 ≈ 3.4 d · ≥1,000 = 435 ≈ 4.9 d ·
≥100 = 1,334 ≈ 15 d. So "1.5-2 days" buys the ≥5,000 tier (3.17M of the 4.15M gap cars); run `--min-cars 5000` first.
Known gaps: the same model under two brand spellings is searched twice (Daewoo/ЗАЗ LANOS); Cyrillic aliases exist only for
the curated table in `youtube-videos-filter.ts` (others need the Latin model name in the title); no generation matching yet.
Dry-run on 2 models (Lanos, Lancer): 8 kept each, 101 units each.

## Stage K-M leftovers log (moved from PLAN.md, 2026-10-12)

- ✅ Stage K leftover: generation chip + specs for ~35 motorcycle / bus models (2026-10-12; bikes 7.7 %, buses 56.9 % of registrations; `docs/plan-done.md` "Stage K leftover — motorcycles and buses").
- ✅ Stage K Step 5 (2026-10-12, partly): `Infobox UK Bus` parsed (MAN Lion's Coach), Dominar pinned, bike + bus cards browser-checked. Open: SV650 transposed table, per-language title pins (Neoplan/Setra de, Jawa ru) — `DATASETS_PLAN.md` "Step 5 done".
- ✅ Stage K Step 6c (2026-10-12): transposed model-year spec tables parsed (Suzuki SV650 1999/2003/2017 now store engines); `docs/plan-done.md` "Step 6c".
- ✅ Stage K Step 6a (2026-10-12): per-language title pins — optional `lang` column in `generations-titles.csv`, `de:` prefix in `wiki_title`, `editionTargets` (primary edition); no Neoplan/Setra row gained data (de articles are prose-only or missing). Open: 6b Jawa 350 (ru `Ява-350`), 6c SV650 table (`docs/plan-done.md` "Stage K leftover, Step 6a").
- ✅ Stage K-M4 (2026-10-12): 17 Kawasaki / BMW bike pins ingested (generations 1,155 → 1,172, wikispecs 1,147 → 1,165; seeds re-exported, additions only). Open: Versys 1000 stores the wrong engines, K1600GT 2011–2011, 13 unpinned registry spellings, 98 drifted wikispecs rows not taken — `docs/plan-done.md` "Stage K-M4".
- ✅ **Stage K-M6 — motorcycle & bus tail (done 2026-10-12; write-ups in `docs/plan-done.md` "K-M6 step 1–4"; step 1 coverage figures were exact-key only, re-measured through the matcher in step 3).** Original plan kept below for reference. DB scope: only `registry.model_generations` + `registry.model_spec_wiki` (re-ingestable; `SELECT count(*)` guard first; never `registrations` / `ingested_resources`). Counts before: generations 1,185, wikispecs 1,179. Each step ends with `pnpm format`, a write-up in `docs/plan-done.md`, a one-line ✅ here, a `DATASETS_PLAN.md` line and a suggested commit message.
  1. **Measure (read-only, no code).** (a) Bus coverage: top ~40 bus brand/models by count in `registry.registrations` (vehicle kind = bus) vs rows in `model_generations` / `model_spec_wiki`; list gaps by registrations. (b) Models whose pin query finds no `en` article (candidates for step 2). (c) Power-quality scan: wikispecs rows whose engines have `powerKwMax` far from `powerKw`, kW/cc outside plausible bounds, or `powerKw` null for >50 % of entries. Output: three short tables in `docs/plan-done.md`; the bus gaps and de-only list decide the scope of steps 2–3.
  2. **de-only articles (R 1250 RT).** `generations.ts` already carries `Series.lang` (Stage K Step 6a), so the `lang=de` pin returning 0 generations is most likely the generation parser finding no rows in a de article (de `Infobox Motorrad` / table layout), not an en-only ingest. Debug with the cached page: parse it in a scratch script, find why no generation is emitted, fix in `generations-parse.ts` (+ test), then pin R 1250 RT and every other de-only model from step 1b. Ask before widening beyond bikes/buses.
  3. **Bus gaps.** Pin the biggest uncovered bus models from step 1a in `scripts/src/generations-titles.csv` (per-language `lang` where needed); `ingest:generations --only "<query>"` then `ingest:wikispecs --only "<makekey modelkey>"`; review drift against the seed (diff by `make_key|model_key|year_from`), re-export both seeds. Buses without a Wikipedia article stay unpinned (note them, no invented data).
  4. **Quality sweep.** From step 1c: fix the parser rules that explain most implausible rows (e.g. Lada 2101 `44 kW` with `powerKwMax 48` from a "46 kW at 5600" line; Corolla 2012 now without displacement), or add bounds in `parseEngine`; full cached `ingest:wikispecs`, row-by-row diff vs the seed, ask before overwriting rows whose output got worse.
  5. **Close-out.** Docs, `features-reference.md` if a convention changed, counts, commit message.
- ✅ **Stage K-M7 — K-M6 tail (done 2026-10-12; steps 1–5 below, step 3 resolved as option B + step 5 curated rows).** Start a session with "Stage K-M7 step N". Same DB scope as K-M6 (only `registry.model_generations` + `registry.model_spec_wiki`; `SELECT count(*)` guard first; never `registrations` / `ingested_resources`). Counts before: generations 1,199, wikispecs 1,193. Measure coverage **through the matcher** (`matchVdbModelAcrossMakes` over `model_generations` keys), never by exact key. Each step ends with `pnpm format`, a write-up in `docs/plan-done.md`, a one-line ✅ here, a `DATASETS_PLAN.md` line and a suggested commit message.
  1. **More pins (cheap).** Registry bikes/buses still unmatched but with a likely en/de article: Honda XR 150 / Steed / PC 36 / CBF 600 SA, Yamaha Majesty 250 / RJ 07 / YZF 600R, Suzuki Address 125, Harley-Davidson XL 883N, BMW F 900 R (no article found in K-M6 — try de/it), KTM 390 Adventure (own generation row: article is the 390 series, would claim 2013), Mercedes O303 / O350 / Tourismo, Volvo B7 / B12, MAN A21, ПАЗ 4234. Check each article's production field and redirect target before pinning (a redirect to a wider series = wrong years); `ingest:generations --only` then `ingest:wikispecs --only "<makekey modelkey>"`, review drift, re-export both seeds.
  2. **Quality leftovers.** Tesla Model S front-motor values (165 kW); toyota|corolla|2012 engines with power but no displacement; K1600GT `2011–2011` (lone year); Lada 2101 `44` vs `powerKwMax 48` (article's net/gross — decide keep or take the first); the 255 rows mostly null on power (source gaps: Toyota 54, Nissan 32, Ford 21, Renault 17, Lexus 15 — try another edition or a body-table rule where the article has the figure).
  3. **Articleless tail (decision, no code unless approved).** Ruta (31.6k buses), Chinese/Ukrainian-market bikes (Musstang, Lifan, Bajaj, Jawa, Spark, Viper, Geon, Forte, Shineray, Loncin …; ~90 % of the bikes still unmatched), Neoplan / Setra / MAN / Van Hool / ЛАЗ / МАЗ. Wikipedia has nothing; a different source (RDW/NHTSA bike data, manufacturer pages) needs its own licence/ToS review. Write the options and ask before building.
  4. **Verify in the app.** `pnpm dev`, open a plate/VIN page of a newly covered bus (Ataman A092, BAZ 2215) and bike (KTM 390 Duke, Yamaha MT-03, R 1250 RT): chip and Generation specs render, no wrong year; run full `pnpm test`.
  5. **Close-out.** Docs, counts, commit message.
- ✅ Stage K-M7 step 1 (2026-10-12): 6 pins (F 900 R de, O303, Volvo B7R / B12 / B12B, YZF600R); buses 61.7 %, bikes 10.1 %; generations 1,205 / wikispecs 1,198; B7R gross weight dropped via `GROSS_WEIGHT_KEYS` (`docs/plan-done.md` "K-M7 step 1").
- ✅ Stage K-M7 step 2 (2026-10-12): wikispecs parser fixes — full-width footnote rows dropped (Tesla 165 kW), system-total power for multi-motor / plug-in cells, `Dauerleistung laut Zulassung` ignored, `Displacement, engine code` column; Lada 2101 takes the DIN net rating (44/48 kW, no max); both seeds re-exported (`docs/plan-done.md` "K-M7 step 2").
- ✅ Stage K-M7 step 3 (2026-10-12): option B only — 3 ru pins (МАЗ-5551, Иж-2717, Иж-2715; ≈ 6.4k cars), the rest of the articleless tail has no usable Wikipedia article; generations 1,208 / wikispecs 1,201 (`docs/plan-done.md` "K-M7 step 3"). Next: step 4.
- ✅ Stage K-M7 step 4 (2026-10-12): verified in the app/API; BAZ-2215 gross weight (3,980 kg) no longer shown as kerb weight (`GROSS_WEIGHT_KEYS`), seed re-exported; tests/lint/type-check green (`docs/plan-done.md` "K-M7 step 4"). Next: step 5 (close-out).
- ✅ K-M7 open decision 1 (2026-10-12): МАЗ-5337 parser fix — `{{Годы автомобиля|1987|}}` reads as open-ended, ru field boundary accepts Cyrillic names, pin `Maz 5337`; generations 1,209 / wikispecs 1,202 (`docs/plan-done.md` "K-M7 open decision 1").
- ✅ **K-M7 step 5 (done; planned, option E — ~3–5 h; start only after the policy is agreed):** hand-curated seed for the articleless tail (~30 rows: Ruta 20/25/22, Musstang MT125, Spark SP125, Lifan LF150/LF175, Viper, Geon …; est. +5–8 pts bikes, ~+7 pts buses). A new manually sourced data source, so: (a) **policy (agreed 2026-10-12):** sources = manufacturer pages (facts only, nothing copied verbatim) + our own registry data, no scraped third-party catalogues; one citation per row (URL + access date) shown as "source" in the UI, never as Wikipedia data; a row with fewer than 3 sourced figures is dropped; (b) **plumbing** (~1–1.5 h): committed curated CSV, a `source` marker so the rows are not shown as Wikipedia data, loader + exporter, migration only if existing columns do not fit; (c) **UI attribution** (~45–60 min): citation + "not Wikipedia" label, tests; (d) **sourcing** (~1.5–2.5 h): ~30 rows, can be split — plumbing + 3–5 well-sourced rows first (~2 h), the rest in batches; (e) docs, `pnpm format`, full test/lint/type-check, seed re-export (~30 min). Then close-out. Options C (RDW/NHTSA bike data: no Chinese brands, new ingest, licence review) and D (manufacturer pages / scraped catalogues: licence/ToS risk) were not recommended.
- ✅ K-M7 step 5, phase 1 (2026-10-12): curated-seed plumbing (migration 0065, `wikispecs-curated.csv`, `ingest:wikispecs:curated`, "source" attribution in the UI) + 3 Bajaj Boxer rows; generations 1,212 / wikispecs 1,205 (`docs/plan-done.md` "K-M7 step 5, phase 1"). ✅ Phase 2 (2026-10-12): sweep found official pages only for Bajaj Boxer BM 100 ES (+1 row; Geon/Viper/Forte/Shineray/Ruta/Musstang/Lifan/Loncin/Spark/buses have none); browser-verified; generations 1,213 / wikispecs 1,206. **Step 5 closed** (`docs/plan-done.md` "K-M7 step 5, phase 2").
- ✅ Stage K-M6 steps 3–4 (2026-10-12): coverage re-measured through the matcher (buses 57.8 %, bikes 10.2 %); 13 bus/bike pins, Mercedes alias widened, hybrid motor line dropped in `cellPower`; generations 1,199 / wikispecs 1,193 (`docs/plan-done.md` "K-M6 step 3" / "step 4").
- ✅ Stage K-M6 step 2 (2026-10-12): `productionSpan` reads de `Produktion von/bis`; R 1250 RT pinned (de), generations 1,186 / wikispecs 1,180 (`docs/plan-done.md` "K-M6 step 2").
- ✅ Stage K-M6 step 1 (2026-10-12, measure only): bus coverage 8.2 %, bike coverage 6.8 %, 64/300 default targets without generations, 165 power-max outliers (mostly BMW PHEV) (`docs/plan-done.md` "K-M6 step 1").
- ✅ Stage K-M5 follow-up 5 (2026-10-12): engine edition ranked by entries with power; the two held rows resolved, seed = parser output (`docs/plan-done.md`).
- ✅ Stage K-M5 (2026-10-12): Versys 1000 engines fixed (German `Infobox Motorrad` + competitor-table guard), F700GS/F800GS years, cc beats litres, 11 more bike pins (generations 1,184, wikispecs 1,177). Follow-up: a lone start year in an `Infobox motorcycle` is open-ended (K1600GT/GTL, NC750XD 2012–now; cars keep one-year spans), generations 1,185. Open: R 1250 RT unpinned. Follow-up 4: the 13 held wikispecs rows are fixed in the parser (seed re-exported; solenza 2003 and navara 2014 kept at HEAD) — `docs/plan-done.md` "Stage K-M5".

## Sitemap, bot protection and legal notes ✅ BUILT (2026-10-12)

- **Sitemap/robots:** `SeoController` serves `/sitemap.xml` (all `STATIC_PAGES` except `/history`, `/favorites`) and a generated
  `/robots.txt` (`Disallow: /api/`, `/og/`, `Sitemap:` line) from `PUBLIC_SITE_URL`. `/fuel`, `/safety`, `/features` gained
  `STATIC_PAGES` entries (they were `noindex` before). The static `apps/web/public/robots.txt` is now shadowed in production and can be deleted.
- **Rate limiting:** global per-IP throttler on `/api/*` only (30/1 s, 150/60 s, 1500/1 h — looser than the PLAN's 10/1 s because a page
  load fires a burst of lazy-section queries and mobile carriers share IPs); `/api/plate/*` 100/60 s, `/api/vin/*` 30/60 s;
  `/api/auth/me` skipped. Static assets, `/og`, `/healthz` and the SPA catch-all are not counted (`skipIf`). Tests: `throttle.test.ts`.
- **Hardening:** `TRUST_PROXY` env → Fastify `trustProxy`; `requestTimeout` 60 s; `nosniff` / `referrer-policy` / `x-frame-options`
  `onSend` hook. CSP and HSTS deliberately left to the proxy (embed allowlist) — see PLAN.md "Deploy-time security checklist".
- **Not done:** per-user tracker, Redis throttler store, Turnstile, Cloudflare — deploy-time items.
- **Legal research** (cookies/consent, "All rights reserved" vs MIT, ads/paid-content risks per data source) saved in
  `docs/legal-and-monetization.md`. Key finding: PostHog defaults to cookie + localStorage persistence — decide before enabling telemetry in prod.

## Wiki photo aliases for trucks + legacy VIN chip ✅ BUILT (2026-10-13)

- **Trigger:** ВХ0449ІС (ГАЗ 5203, 1969) and ВС8907ТР (MAN TGS 28.320) had no hero photo although Wikipedia has the articles
  (ГАЗ-52, MAN TGS). Cause: the registry stores factory indexes / weight codes that Commons and Wikipedia do not know, and the
  default pre-warm skips non-passenger kinds.
- **Aliases** (`packages/shared/src/wikiAliases.ts`, tests in `wikiAliases.test.ts`): ГАЗ 51/52/53/66/69/21/24/3307/3110, the 3302
  family (33021, 330202, 3302-14 …) → Gazelle; ЗИЛ 130/131/157/4331/4334 (4333xx → 4331); ПАЗ 3203–3206 → 3205, 672; УАЗ 3741/3303/452д
  → 452; MAN TGX/TGS/TGA/TGL/TGM → family article, `l 2000` / 6–10 t codes → L2000, `f 2000` / 19–35 t codes → F2000; Mercedes
  `4xx/6xx/8xx d|cdi` → Vario, `310` / `312d-п18` → T1. Lead query is Cyrillic for Soviet models (the uk edition holds the article; the
  en edition often returns the plant instead and is rejected by the title guard). Not aliased: ЗИЛ-164 / 5301 (no article), KrAZ 250 /
  65101 (search returns the generic KrAZ article, rejected by the guard — needs a different query). MAN numeric codes 8.xxx → L2000 and
  19/26/… → F2000 are an inference from weight classes, not verified; 14.xxx / 18.xxx left unmapped.
- **Re-scrape** (`pnpm ingest:wiki-images --aliased --all-kinds --min-cars 1 --brand X --rps 1`, one brand at a time; stale
  `not_found` rows were deleted first, unnecessary — `--aliased` retries non-`ok` rows itself): ГАЗ 198 photos / 201 none, ЗИЛ 208 / 159,
  ПАЗ 53 / 5, УАЗ 48 / 48, Mercedes-Benz 226 / 533 (whole brand is scanned), MAN 927 / 326. `--retry-failed` needs `--all-kinds` for trucks.
  Seed CSV re-exported: 124,316 rows after the first batch, 131,243 after MAN (2,567 KB).
- **Legacy VIN chip:** a registry `vin` that is not a 17-char ISO 3779 VIN (pre-1981 / Soviet chassis numbers like `382590`) is shown
  as plain text with an "old-style number" chip and tooltip (`result.vinLegacy*`, ua/ru/en) in `ResultCard.tsx`; it is not a link, and
  the VIN decode section, NHTSA request and VIN registry history query are skipped for it. Not checked: Copy-all-info / report export
  still pass the short value as `vin`; whether `/api/vin/…` rejects non-17-char input.
- **Workflow rule:** after any change to `registry.wiki_image`, re-run `pnpm export:wiki-images:csv` (added to `CLAUDE.md`).

## Email sign-in, /profile, sudo mode ✅ BUILT (2026-10-13)

Decisions: passwordless (6-digit code + magic link in one mail, 15 min, single use) instead of passwords; Resend as the default provider
behind a provider-agnostic `MailService` (`log` / `smtp` / `resend`; Mailpit in `infra/docker-compose.yml` for local mail); React Email templates
in code (ua/ru/en); no backup email — Google, Telegram and email are each other's recovery paths.

- **DB** (migration 0067): `app.email_challenges`, `app.known_devices`; `app.sessions` gains `id`, `auth_at`, `last_seen_at`, `method`, `device_hash`;
  `app.users` gains `lang`, `deletion_scheduled_at`.
- **API**: `OriginGuard` (CSRF), `EmailChallengeService`, `TurnstileService`, `MailModule` (+ dev preview controller), `AccountSecurityService/Controller`
  (methods, sessions list/revoke, re-auth by email/Google/Telegram, set email, link/unlink, sudo-protected delete), `AccountPurgeService`.
  Production env assertions (`AUTH_SECRET`, real `PUBLIC_SITE_URL`, a real mail transport).
- **Web**: `EmailSignInForm` in the login popover, `/auth/email` link page, `/profile` (identity, sign-in methods, devices, danger zone) with
  `ReauthGate`; account deletion moved out of the dropdown.
- **Verified**: unit tests (crypto, device parsing, origin guard, every template × language, safeNextPath); live API run of sign-in, wrong/replayed
  code, cross-site 403, set-email, `REAUTH_REQUIRED`, re-auth, new-device mail, revoke-others, delete → restore by sign-in, purge after the grace
  period; browser run of sign-in, re-auth dialog + automatic retry, email change.
- **Deferred**: `notifyNewSignIn` opt-out setting, bounce/complaint webhook handling, passkeys/TOTP, a Redis-backed throttle (DB counts suffice for now).

## Stock news, mobile sidebar, info popups, tunnel, /install ✅ BUILT (2026-10-13)

Smaller items shipped the same day as email sign-in and the truck aliases (above).

- **Yahoo Finance news widget** (`55a1fcb`): `GET /api/stocks/news?brand=` (`apps/api/src/stocks/`) merges Yahoo's search endpoint (images,
  publishers) with the per-ticker RSS feed, matched by ticker (share-class aware, so `GOOG`/`GOOGL` do not mix), deduped, cached 15 min;
  `stockNewsResponseSchema` (optional `publisher` / `imageUrl`) and `yahooFinanceNewsUrl` in `@carplates/shared`. Web: `StockNewsWidget` under
  the mechanics Q&A in the right column (3 → 10 headlines, "Show more ↓/↑", "More ↗" to Yahoo) with a shared `StockNewsCard`; a
  "💹 <Company> news" group in the Social section, counted in its total. Same unofficial-Yahoo caveat as the share-price widget (PLAN.md).
  The new-cars widget "in stock" link now uses ↗ (external).
- **Pixabay photos removed from saved/copied reports** (`export-report.ts`, `export.photoN` key dropped); the on-page "What it might look like" section stays.
- **Mobile sidebar** (`ffceeff`, `e9f9f09`, `b51c3c6`): below `md` the Layers and Profile buttons move from the header into the drawer (`inSidebar`
  prop; popovers span the drawer width); drawer is `w-72` capped at 85vw; sign-in form inputs are `w-64 max-w-full`; `LoginButton` takes `onNavigate`
  so the drawer closes after a profile-menu item. "Full report" removed from "Under consideration" features.
- **`FieldInfoButton` popup** (`d6a3216`): the panel is portalled to `body` with fixed, viewport-clamped coordinates (it used to overflow the left
  edge on phones), width/height capped to the viewport, opens upward when there is more room, closes on outside scroll/resize but not on scroll inside it.
  `RdwRecalls`, `MotFaults` and `OpenEv` always render the header "?" (even before data or without a match) with the "what is this" text (`fb659d9`).
- **Test-drive racer** (`565fff6`): responsive controls and fullscreen layout on phones.
- **Account nav** (`a55630f`): `AccountNav` (profile / settings / features / admin) on the four account routes; admin "Dashboards" tab linking to Resend and Cloudflare/Turnstile.
- **`/install` page** (`61b6bc5`): PWA guide + install button, sidebar link, footer quick link, `STATIC_PAGES` entry (conventions in `docs/features-reference.md`).
- **`pnpm tunnel`** (`de87fde`, `scripts/src/tunnel.ts`): db up/migrate → build → `cloudflared` quick (or named) tunnel → API with `PUBLIC_SITE_URL` = tunnel URL →
  smoke checks → prints the manual steps (Google origin, Telegram `/setdomain`, Turnstile). Needed because Telegram login requires https. README "Testing through a Cloudflare tunnel".
- **Telegram login** (`e2d6a2b`) and **sign-in guide** (`58efa3f`, `docs/logins.md`); **security audit + pre-deploy checklist** (`2c9efea`, `docs/security-checklist.md`).
- **Seed CSVs** (`94f71f8`): news items, social posts and recall translations are exported/loaded like the other scraped tables (`export:news:csv`, `export:social:csv`).
- **AUTO.RIA link fix** (`c92a721`): Cee'd no longer 404s; "In stock" also links RST/OLX searches. **Catalog pages** `/cars/:make/:model/:year` planned in `docs/catalog-plan.md`.

2026-10-14: the 8 auction link-out sites (Bidfax, Bid.cars, Poctra, Copart, IAA, Stat.vin, OPENLANE, Encar) added to About sources as logo-less tiles. Their terms pages were mostly unreachable (403/404); the reachable ones (Stat.vin, Encar) say nothing about logo reuse, so no logos until permission or brand guidelines are found. Stat.vin states it is not affiliated with Copart/IAAI. Telegram Login got its logo (`icons/sources/telegram.webp`, 64 px circular WebP) in place of the placeholder tile.

## Size & parking section ✅ BUILT (2026-10-14)

Files: `apps/web/src/components/size/` — `VehicleSize.helpers.ts` (merge, shape, class, forecast), `fit.ts` (norms, verdicts, tips), `silhouettes.ts`, `use-vehicle-size.ts`, `VehicleSizeSection.tsx` + four lazy tab chunks (`SizeSchemaTab`, `SizeParkingTab`, `SizeGarageTab`, `SizeNormsTab`), `SizeClassChip.tsx`. No API or migration change; every source is an existing query.

- **Merge:** per field RDW median (cm → mm) → Wikipedia generation dimensions → VIN `Wheel Base (inches)`; `completeSize` forecasts the gaps from the best known figure with per-shape typical proportions (`SHAPE_TYPICAL`; growth exponents length / wheelbase 1, width 0.5, height 0.3) and tags them `estimate` (dashed, ≈). A model with no figures but a known body shows the typical shape (`typicalOnly`); buses and trucks are never forecast.
- **Verified norms only:** ДБН В.2.3-15:2007 п. 5.2 (2.5 × 5.3 m; 2.3 × 5.0 m on temporary lots; safety gap 0.5–0.7 m) and п. 4.6 (design car 6 × 2.1 m); ПДР п. 22.5(а) (width 2.6, height 4.0, single vehicle 12, tractor + semi-trailer 18.75, road train 22 m); German Garagenverordnung (Saxony § 4); one US city code (Lindon, UT, 9 × 18 ft). Garage sizes (3 × 6 m box, 6 × 6 m double) are labelled _typical_. Mirrors are an assumed +20 cm. The ДБН Додаток Є class table could not be read from any text version, so the A–F cuts are the rule-of-thumb segments, labelled approximate. The US and German links answer browsers but not bots (403 for curl).
- **UI:** `LazySection sections={['size']}`; tabs are separate chunks and the VIN is decoded only once the section is open; the header chip `📏 C-class · 4.28 m` opens the section (`openSignal`); every figure, verdict, tip and norm has a ❓; sources are ↗ links. UA / DE flags added to `MarketFlag`. Helpers are grouped in `vite.config.ts` as `helpers-size`.

## Size & parking polish, section links, export (2026-10)

- `ChipChevronButton` is the shared round ↓ of header chips (size class, "Imported" / "Was imported").
- Drawing tab: pointing at / tapping a figure row or a dimension arrow lights that dimension and fades the others, with its ❓ text under the drawing; every source pill (RDW, Wikipedia, VIN) has a ❓. The size-class ❓ lists all classes incl. van and pickup.
- UA parking place: ДБН В.2.3-15:2007 blurb + official e-construction.gov.ua link; ПДР sign 5.38 drawn as SVG in `SizeRoadSign.tsx` (swap in an official scan later).
- Specs groups link (`SpecGroupJump`, `GROUP_JUMP`) to Generation specs / Size & parking / Estimated value / Emissions: each section takes an `openSignal` bumped from `ResultCard`.
- "Save as" report now has Generation specs and Size & parking (`lib/export-size.ts`; `computeVehicleSize` is the pure core of `useVehicleSize`).

## Chip explainers, weight tab URLs, mobile polish, VIN-since-2021 note (2026-10-14)

- **Header chips:** `VdbChips`, `GenerationChip`, `TopStatBadges`, `Model3dButton`, `Model360Button` and `SizeClassChip` share one pattern — chip + "?" `InfoPopover` explainer (and `ChipChevronButton` where the chip opens a section). Size is shown in metres only (no mm/ft toggle).
- **Weight tab URLs:** the `/stats` heaviest / lightest panel keeps its group in `?weight=<group>` (`WeightModelsPanel`); arriving on a `?weight=` deep link (result-card ranking chip) scrolls the panel into view once the boards load.
- **Mobile polish:** `PhotoZoomDialog` pinch-zooms (two pointers: zoom around the midpoint + pan, `touch-none`); `VehiclePhotos` swipes between photos (`SWIPE_MIN_PX` 40, a swipe ending on the photo link does not follow it); external links carry a ↗ marker; header layout tightened.
- **"VIN data starts in 2021" note** (`vin/VinSince2021Note.tsx`, `vin.since2021.*`): the open registry only publishes VINs from 2021, so older plates/owners are not linked by VIN. Shown under the registry history on the VIN page (`VinRegistryHistory`) and on the plate card — full text under the VIN history, short `noVin` variant when the plate itself has no VIN.
- Ukrainian wording: «застосунок» (not «додаток») for the app.

## Wanted / stolen vehicle check (2026-10-15)

- **Source:** National Police open dataset "Інформація про транспортні засоби, що перебувають у розшуку у зв'язку з їх незаконним заволодінням (включаючи ідентифікаційні номери…)" on data.gov.ua (`2cd12755-834b-4c43-9026-fe356ce93af5`, CC BY, refreshed several times a day, ~79 k records, ~36 MB JSON, plate + body/chassis numbers). It is also what stolen.in.ua shows (that site has no public API). The older MVS dataset (`9b0e87e0-…`) is frozen by a Cabinet resolution — do not use it.
- **Built:** migrations 0068/0069 (`registry.wanted_vehicles`), `pnpm ingest:wanted` (`scripts/src/wanted.ts` + `wanted-parse.ts`), `GET /api/wanted?plate=&vin=` (`apps/api/src/wanted/`), contract `packages/shared/src/wanted.ts`, section `WantedCheck` (plate card under Verification, VIN page above Auctions, `?section=wanted`).
- Conventions: `docs/features-reference.md` "Wanted vehicles".

## Releases page (2026-10-15)

- `/releases` ("What's new"): day-by-day change log back to the first commit (2026-09-09) with group filter; sidebar link, `STATIC_PAGES` SEO entry, link from the PWA update bar. Conventions: `docs/features-reference.md` "Releases page".

## Cross-links, update-bar button, About features (2026-10-15)

- **Cross-links** (`6df9280`, `5bed8de`): `JumpTarget` (`RdwSpecs.helpers.ts`) covers a section, `history`, `vin` or `specs-<group>`; `ResultCard.jumpToSection` handles them and is shared as `CardJumpContext` (`card-jump.ts`). Basic-section rows get a chip-style `RowJump` arrow (only when the target section exists), `SpecsJumpLink` / `SpecGroupJump` link Specs groups to the sections that expand on them. `ResultCard.tsx` was split up along the way. Conventions: `docs/features-reference.md` top section.
- **"Update & see what's new"** (`58c92a3`): the PWA update bar sets the URL to `/releases` before the normal update, so the reload lands the new shell on the change log (`use-pwa-actions.ts`).
- **About page** (`c1951da`): a features list (ua/ru/en) plus two new source tiles (МТСБУ `mtsbu.webp`, stolen.in.ua `stolenin.svg`); the new entries were also added to `releases.ts`.
- **Static routes read as plates** (`51f4cde`): `use-header-vehicle-label.ts` now ignores `ROUTE_TITLE_KEYS` paths (`/releases`, `/install`, …).

## Wanted vehicles ingest — original design (planned 2026-10-01, built 2026-10-15; moved from PLAN.md)

Source: data.gov.ua dataset `ac1a3a9d-512b-446b-9b0c-1383d38ce474` (National
Police, CC-BY, "more than once daily"). Resource `CarsWanted.json`
(`2d69d196-02f1-49b9-97fa-0fb69077e05f`), ~36 MB, one JSON array replaced in
place. Fields (all required): `id`, `brand`, `model`, `cartype`, `color`,
`vehiclenumber`, `bodynumber`, `chassisnumber`, `enginenumber`,
`illegalseizuredate`, `organunit`, `insertdate`. No status / found-date field.
Record count unverified (~80-100k estimated) — check on first download.

**Key finding:** the file is a full snapshot of the _current_ list, so a found
car most likely just disappears from the next file. CKAN revision history is
patchy (see registry data). We must keep our own history → tombstones, never
hard-delete.

Design:

- Table `registry.wanted_vehicles`: `source_id` PK, normalized `plate`, `vin`
  (from `bodynumber`/`chassisnumber`, validated), brand/model/color/cartype/
  organunit, `seized_at`, `inserted_at`, `raw jsonb`, `first_seen_at`,
  `last_seen_at` (or a `sync_run_id` to avoid rewriting every row daily),
  `resolved_at` (null while listed). Indexes: plate, vin, resolved_at.
  Separate table joined at query time — not a column on the registry.
- `scripts/src/wanted.ts` (same style as `ingest.ts`): `package_show` → compare
  resource `last_modified` with the stored value, exit if unchanged → stream
  download + stream-parse (`stream-json`, not whole-file `JSON.parse`) with Zod
  per row → staging table → one set-based upsert → mark rows missing from the
  run `resolved_at = now()`.
- **Safety guard:** abort without resolving anything if the file fails to parse
  or has < ~80% of the previous row count (truncated download must not mass-
  "recover" cars).
- Match by plate, and by VIN for plateless cars (2026 plate removal). Police
  free-text fields are likely messy — normalize with `normalizePlate`, validate
  VIN, measure the match rate on real data first.
- Schedule: daily is enough; the `last_modified` check makes a 2-6 h cadence
  nearly free. Add to `ingest:all`.
- UI: label as "listed as wanted as of <date>", not a flat claim (stale for
  hours, found cars may linger).

Load estimate (unmeasured): ~36 MB download (~5-8 MB gzipped) per changed run,
tens of MB RAM when streamed, seconds to low tens of seconds of DB work for
~100k narrow rows, sub-ms indexed lookups. No meaningful VPS impact.

First steps when picked up: download the real file locally, confirm count and
plate/VIN quality, then migration + Zod schema in `packages/shared` + `wanted.ts`
with a fixture test.

## Deploy tooling (2026-10-15)

Written the repo side of PLAN.md Phase 4 (not yet run on a VPS — see [deploy.md](deploy.md) "Status"). `apps/api/Dockerfile` (pnpm deploy, non-root,
HEALTHCHECK; migrator ships as `node_modules/@carplates/db/dist/migrate.js` — its entrypoint check now compares realpaths, it silently did nothing under
pnpm's symlinks), ALPR hardened (non-root, `read_only` + tmpfs, `cap_drop`, 6 MB upload cap, HEALTHCHECK), `infra/docker-compose.prod.yml` (caddy,
api-blue/green, alpr, postgres 18.6 tuned), `infra/Caddyfile` (Cloudflare origin cert + trusted proxies, `X-Forwarded-For` forced to the verified client IP,
zstd/gzip, HSTS, CSP Report-Only, maintenance flag + `handle_errors` page/JSON), `infra/vps/{bootstrap,deploy-api,deploy-web,backup}.sh`, three
workflows + CI + Dependabot, `MaintenanceError`/`MaintenanceBanner`. `spa.controller.ts` re-reads `index.html` by mtime so a web deploy needs no api restart.
Found while testing: stock Caddy has no `br` (docs said it did); `pg_dump --schema` is ignored with `-t` (the first backup script would have omitted all `app`
tables); `RelaxRoute.tsx` was unformatted and would have failed the CI `format:check` gate.

### Pre-public secrets audit, production DB-credential guard, first Dependabot round ✅ DONE (2026-10-15)

**Secrets audit (repo about to go public).** Checked tracked files and file names across history; no real secrets found. Only `apps/{api,web}/.env.example`
are tracked (`.gitignore`: `.env`, `.env.*`, `!.env.example`); no `.env`/`.pem`/`.key` ever appeared in history. Token-pattern grep (Telegram bot token, AWS,
GitHub, OpenAI-style, Google API key, Slack, private-key blocks) found nothing. Every secret is read from env and declared optional in `apps/api/src/env.ts`
(`TELEGRAM_BOT_TOKEN`, `AUTH_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `PLATE_RECOGNIZER_CLOUD_TOKEN`, `PIXABAY_API_KEY`,
`POSTHOG_PERSONAL_API_KEY`); `deploy-api.yml` takes them from GitHub Actions secrets and fails if one is missing. The Telegram bot **username**, Google client
id, Turnstile site key and domain are public by design and live in Actions _variables_. Left in the repo knowingly: the local-only dev DB credentials
(`carplates:carplates@localhost`, docker port bound to `127.0.0.1`), the maintainer's email in `package.json` and the ingest User-Agent strings
(`wikispecs.ts`, `wiki-specs-probe.ts`, `generations.ts`), and Cloudflare's published IP ranges in `infra/Caddyfile`.
**Not verified:** the contents of the two `.env.example` files (read denied in that session) and every past commit's contents — run
`gitleaks detect --log-opts="--all"` before flipping the repo public. `scripts/seed-data/*.csv.gz` is open-data scrapes (check for personal data, not secrets).

**Production DB-credential guard.** `DATABASE_URL` had a dev default, so a production deploy missing the variable would silently use `carplates:carplates@`.
`assertProductionEnv` (`env.ts`) now rejects a missing or default-credential URL (`DEV_DB_CREDENTIALS` constant, also used for the dev default). Production
gets the real password from the `POSTGRES_PASSWORD` secret via `deploy-api.yml`. Not covered: `packages/db` `LOCAL_DATABASE_URL` (ingest scripts/migrator
fallback). Running the API locally with `NODE_ENV=production` now needs a non-default DB password.

**First Dependabot round (12 PRs, applied by hand as one commit).** Applied: vitest 4 → 5 (5.0.5), `@sentry/nestjs` 10 → 11.7 (`instrument.ts` uses only
`dsn`/`environment`/`release`/`tracesSampleRate`/`beforeSend`; runtime event delivery untested), domhandler 5 → 6, the 27-update minor/patch group
(drizzle-orm 0.45.4, react-router 8.4, vite 8.3, eslint 10.12, typescript-eslint 8.71, zod 4.6.6, tsx 4.23, …) and five Actions majors (checkout 7,
setup-node 7, docker login 4 / setup-buildx 4 / build-push 7; the Docker ones only run in `deploy-*.yml`, so first proof is the next deploy). Verified:
`pnpm build`, `pnpm lint` (0 errors), `pnpm test` (162 files, 1261 tests).
Not applied, with reasons: **node 24 → 25** (engines `>=24 <25`, 25 is not LTS), **python 3.12 → 3.14** (ALPR wheels unverified), **`@tanstack/react-table`
8 → 9** (rewrite; only consumer is `routes/stats/StatsTable.tsx`, CI failed). `dependabot.yml` now ignores node major and python major/minor.
**jsdom is held at `~30.0.1`:** with vitest 5.0.5, jsdom 30.1.x makes `expect(Promise.reject(new Error('404'))).rejects.toThrow('404')` fail in the web
project (`expected [Function] to throw error including '404' but got ''`); found via `queries.card.test.ts`, bisected by pinning jsdom. See the pin table in PLAN.md.
Gotcha: a worktree under the deep scratchpad path fails `pnpm` (task-state path too long) and `git worktree remove` can't delete its `node_modules` — use a
short path (`C:\tmp\…`) and `fs.rmSync` with a `\\?\` prefix for cleanup.

## Specs: Performance and "What can I do with it" panels (2026-10-15)

`RdwPerformance.tsx` (Engine group) and `RdwTowing.tsx` (Mass group) sit under the Specs rows, derived only from the RDW figures + the registry's own masses (`RdwInsights.helpers.ts`, tested): hp/tonne, estimated 0-100 (`0.78·(kg/kW)^0.95`, labelled estimate), top speed on a track of speed anchors + Ukrainian limits (20/50/90/110/130) with Kyiv-Lviv trip times, power in horses/people/kettles; payload = gross - kerb (registry mass + 75 kg driver preferred) with people/luggage sliders, trailer preset chips vs braked/unbraked limits, licence category (`licenceFor`: B ≤3.5 t, trailer ≤750 kg or train ≤3.5 t; BE; C1/C1E/C/CE) and the 85 % caravan tip. i18n `rdw.perf.*` / `rdw.tow.*`. Done in the follow-up (same day): registry percentile bars, interactive GVM/TBM/GTM/ATM/GCM schema with a truck variant, import-excise estimate. Not done: OSAGO-by-cc hook (sources contradict each other and there is no single official tariff since 2025 — do not ship numbers without the MTSBU/NBU source).

The "Ukrainian rules and limits" `<details>` box in `RdwTowing` carries only figures checked against the ПДР text (zakon.rada.gov.ua 1306-2001-п) on 2026-10-15: 50 km/h in settlements (12.4), 80 km/h car with trailer outside them (12.6а), 20 km/h residential zone (12.5), 50 km/h towing a vehicle (12.7), 22.5 height 4 m / length 12 m truck, 22 m road train, 18.75 m tractor + semi-trailer, 40 t / 24 t gross (state / local roads), axle 11.5 t / 7 t; resolution 879 = per-km fee for exceeding. Vehicle width (2.55 m) was NOT confirmed in the text and is left out. Licence B/BE wording follows the MVS explanations (trailer ≤750 kg, or train ≤3,500 kg).

Follow-up details: `GET /api/stats/distribution` (`stats_distribution`, buckets 5 kW / 10 hp·t⁻¹ / 100 cc over sane-range passenger cars, rebuilt by `db:refresh-spec-stats`) → `percentileOf` (shared `distribution.ts`) → `RdwFleetRank`. `RdwImportExcise`: Tax Code 215.3.5-1 base rates (petrol 50/100 € up to/over 3,000 cc, diesel 75/150 € up to/over 3,500 cc) × litres × age factor 1–15; the statute text was confirmed from law 2611-VIII, but the current wording and how the current year is counted were NOT (the Tax Code text is not fetchable), hence the age slider and the "ask customs" note; electric/hybrid/gas-only rules are not modelled. `RdwMassSchema` = original artwork (do not copy third-party diagrams).

### Small polish, 2026-10-16/17

- **Brand logo (`83a4927`):** new `public/logo.png` + `brand-icon.png` replace `favicon.svg`; used for the favicon, PWA icons (`vite.config.ts`), the header (`Layout.tsx`) and the link-preview card (`og-card.ts`, `og.controller.ts`).
- **News cards without an image** get a placeholder tile (`NewsCard.tsx`); **favorites rows** are compact on mobile (`LocalRecordRow.tsx`).
- **Copy all info** also exports news, social threads, finance news and the data-source list (`lib/export-news.ts`).
- **About** lists the wanted statistics and the stolen.in.ua history; the sidebar links to `/wanted` (`7a372fd`).

## Read guides (`/read`, 2026-10-16)

**Third article `/read/fleet` (2026-10-16):** colours, fuel and registration years on the existing field rollups — `year` added to `STATS_FIELD_DIMENSIONS` (+ `StatsService.field`), no migration. Route, `ROUTE_TITLE_KEYS`, `STATIC_PAGES`, `ARTICLES` entry (the matching "coming next" item removed), `nav.readFleet` / `read.fleet.*` keys in ua/ru/en.

A hub of explainers built on the registry: **`/read`** (cards + a "coming next" list), **`/read/body-types`** and **`/read/sizes`**. Split by question, not by data source: _what shape is it_ vs _how big is it_; a third page on fleet statistics (colours, fuel, age) is next and only reuses `/api/stats*`.

- **Body types:** one card per shape (sedan, hatch, wagon, coupe, SUV, MPV, van, pickup) with the Size section's silhouettes, a definition, "how to spot", and 2–3 real models with size, fleet count and an on-demand "Show real plates". "SUV or crossover?" compares ladder-frame and unibody (a stated explanation — frame type is not in our data), and the body-field share bars link to `/stats?dim=body`.
- **Sizes:** the A–F / J / M table built from `CLASS_CUTS` / `SUB_CUTS`, fleet split by class, a "will it fit?" table (`fitInBay` against the four `PARKING_REFS`), and an explorer (shape select, class chips, name text) whose state is in the URL.
- **Plate card ↔ guide:** the body row gets a 📖 link to the matching shape card; the size chip's ❓ links to the explorer preset to the car's shape/class with "your car" first.
- **Data:** `registry.stats_size_models` (migration 0071), 3.7k models of which about 2.5k have a length (RDW year-medians, thin RDW samples as a fallback, Wikipedia after). Building it showed that **a model-level body is unreliable**: the registry files SUVs as "УНІВЕРСАЛ", RDW's tally calls Tucson-size crossovers MPVs and Passat a stationwagen, and a model sells in several bodies. `profileModel` therefore takes a _majority_ shape with named SUV/van overrides; the article says so (`QUIRK`).
- **Not done / deliberate:** no `LazySection`s (the pages are light and the heavy part, plates, is click-loaded); no offline cache (`stats` stays online-only); no seed CSV (derived table). The plate card links label the card's own shape, so a RAV4 filed as "УНІВЕРСАЛ" reads "wagon" there — the card's existing registry-first rule, left alone.

**Fourth article `/read/plates` (2026-10-16):** number plates — anatomy (current `КА1234ВС` and legacy `11АА1234` split by the plate card's `PlateSegments`), a "type a plate" prefix lookup and the full region table (27 regions: letter pairs + legacy digit codes, each linking to the advanced search), and the region-less `DІ`/`ЕD` series. Route, `ROUTE_TITLE_KEYS`, `STATIC_PAGES` (ua/ru/en), sitemap test, `nav.readPlates` / `read.sec.*` / `read.plates.*` keys, `ARTICLES` entry (moved out of `UPCOMING`). No data fetch, no migration. Conventions: `docs/features-reference.md` "Read guides".

**Fifth article `/read/generations` (2026-10-16):** how a model grew across generations — eight curated models (Octavia, Golf, Passat, Camry, Civic, Focus, Tucson, A4), each a table of length (with a bar), width and wheelbase per generation, a "longer by N cm (+P %) from X to Y" headline, wheelbase gain and a length-class move (e.g. C → D), real plates on demand and links to the size explorer / advanced search. Per-generation sizes did not exist as rows (`model_spec_wiki` dimensions are empty for models RDW covers), but `rdw_specs` holds per-model-year medians, so `GET /api/generations/growth` derives them on request from the generation spans — **no migration, no rollup**. Route, `ROUTE_TITLE_KEYS`, `STATIC_PAGES` (ua/ru/en), sitemap test, `nav.readGenerations` / `read.sec.*` / `read.gen.*` keys, `ARTICLES` entry; `UPCOMING` is now empty and the hub hides its "Coming next" card. Conventions: `docs/features-reference.md` "Read guides".

**Sixth article `/read/electric` (2026-10-16):** electric cars in Ukraine — what the registry calls electric (`ЕЛЕКТРО` alone = `bev`, next to a fuel = `hybrid`; PHEV and self-charging hybrids are not separable), model-year columns with the share of that year's passenger cars, top regions, top pure-electric models and a static plug guide (Type 2, Type 1/CCS1, CCS2, CHAdeMO, GB/T). New rollup `registry.stats_ev` (migration 0072, `scripts/src/ev-stats.ts`, in `db:refresh-derived`; derived, no seed CSV) and `GET /api/stats/ev`. Figures are current registrations by model year, not import year. Local run: ~331k BEV + ~207k hybrid of ~12.8M passenger cars.

**Seventh article `/read/imports` (2026-10-16):** cars from abroad — used imports vs cars sold through a trade organization per year of the operation, the most imported models, the VIN build country (1/4/5 = USA, 2 = Canada; US + Canada called out) and a what-to-check list linking the plate-card checks (auction history, recalls, wanted). New rollup `registry.stats_imports` (migration 0073, `scripts/src/imports-stats.ts`, `db:refresh-imports-stats`, part of `db:refresh-derived`, no seed CSV). The import flag is read from the whole `registrations` history (a resold import is not the latest operation, so `current_registration` alone would miss it); brand/model/VIN/still-registered come from `current_registration`. Rule = `isImportOperation` (codes + ПРИВЕЗЕН/ВВЕЗЕН minus new-car / de-registration) with `торг` = dealer. Real data: 3.17M imports, 1.38M dealer-sold, 278k US/CA-built, 39% with no VIN country. `GET /api/stats/imports`, route, `ROUTE_TITLE_KEYS`, `STATIC_PAGES`, `nav.readImports` / `read.sec.imp*` / `read.imports.*` keys, `ARTICLES` entry.

**Eighth article `/read/safety` (2026-10-16):** crash tests — the five programmes (Euro NCAP, IIHS, JNCAP, C-NCAP, KNCAP) with their scales and how many registered cars each rates, the fleet's coverage / average / score distribution by colour band, the average score by model year, the best and weakest common models (linking to the advanced search) and what a rating does not tell (generation, trim and market, condition). **No new backend, rollup or migration:** it reads the existing `GET /api/safety/stats` (`safetyStatsQuery`, the `registry.stats_safety` rollup of `/safety`). Route, `ROUTE_TITLE_KEYS`, `STATIC_PAGES` (ua/ru/en), `nav.readSafety` / `read.sec.saf*` / `read.safety.*` keys, `ARTICLES` entry, release note.

**Ninth article `/read/fuel` (2026-10-16):** fuel and CO₂ — what the passenger-car fleet runs on (share and count per fuel class, linking to `/read/electric`), the fleet's estimate coverage / average g/km / distribution by colour band, the average CO₂ by model year, the cleanest and most CO₂-heavy common models (linking to the advanced search) and how the figures are estimated (EPA + EEA sources, matching, tailpipe only, test cycles). **No new backend, rollup or migration:** it reads the existing `GET /api/fuel/stats` (`fuelStatsQuery`, the `registry.stats_fuel` rollup of `/fuel`). Route, `ROUTE_TITLE_KEYS`, `STATIC_PAGES` (ua/ru/en), `nav.readFuel` / `read.sec.fuel*` / `read.fuel.*` keys, `ARTICLES` entry, release note.
**Tenth article `/read/vin` (2026-10-16):** VIN explained — a "type a VIN" breakdown (six colour-coded parts via `SegmentExplainer`, maker + country from the WMI table, model year from position 10, check-digit verdict worded for non-North-American VINs), the 30-year year-code table, and where to find the VIN plus registry notes (VINs since 2021, local body numbers, plate-less registrations). Linked from the plates article. **Static: no API, rollup or migration.** Route, `ROUTE_TITLE_KEYS`, `STATIC_PAGES` (ua/ru/en), sitemap test, `nav.readVin` / `read.sec.vin*` / `read.vin.*` keys, `ARTICLES` entry, release note.
**Eleventh article `/read/extremes` (2026-10-16):** record holders — heaviest/lightest models by vehicle group (`WeightModelsPanel`, `?weight=`) and highest/lowest passenger cars by power, engine size, height, length and fuel tank (`SpecModelsPanel`), plus a "how to read" section. No new API, rollup or migration: both panels read `statsTopQuery()`.

**Twelfth article `/read/recalls` (2026-10-16):** recalls vs common faults — a static "recall is not a worn part" explainer, a model picker (five curated models, `recalls/content.ts` `EXAMPLES`) driving two live blocks over the existing per-model endpoints: campaign counts per market (`rdwRecallsQuery`, `nhtsaRecallsQuery`, `caRecallsQuery`) and UK MOT fail rate by mileage vs the UK average plus the top fault groups (`motQuery`, folded in `recalls/helpers.ts`). No new API, rollup or migration. Wording stays model-level and market-labelled, never "your car has a recall".

### Card → guide cross-links (2026-10-16)

Each plate-card / VIN-page section now ends with a `ReadGuideLink` (pill, guide emoji, right arrow) to the /read guide on the same topic: no content is duplicated, only linked. Placement table and rules: `docs/features-reference.md` "Read guides". Guide icon / title key / hue moved into `GUIDE_META` so card chunks do not pull the long `articles.ts` leads.

### Guides as blog posts, mass schema relations (2026-10-16)

`/read` articles now read like blog posts: `ArticleBanner` (oklch cover from the guide's `hue`), a `published` ISO date per `ARTICLES` entry and a copy-link button (`read.share`) in `ArticleHeader`; the hub cards reuse the banner. `RdwMassSchema` relates the chosen car to GVM / TBM / GTM / ATM / GCM (`rdw.schema.your.*`: empty + payload, ~7 % tow-ball, ATM = GTM + TBM, GCM = GVM + GTM) for the trailer picked above or the heaviest braked trailer; excise and mass sections open by default. Dev hygiene: `scripts` declares `pg` so pnpm resolves one `drizzle-orm` copy (two copies broke `scripts` type-check). About lists the guides in its feature card.

### Wanted vehicles: history, stats, `/wanted` (2026-10-17)

The feed only shows who is wanted now, so found cars were backfilled from stolen.in.ua (Aug 2020 onward, `pnpm ingest:wanted-history`, resumable, seed CSVs via `ingest:wanted-history:csv` / `export:wanted-history:csv`). Migration 0074 adds `source`, `resolved_exact` and `region` (derived from the police unit); the card shows scraped records and "history since Aug 2020". `GET /api/wanted/stats` feeds the `/wanted` page (summary cards, by year / region / make / model / type / colour tables, region map, recently stolen / found lists) and a home teaser (`HomeWantedSection`: 5 newest stolen, link to the page). Links to `/wanted` from `WantedCheck`, `/stats` and `QuickLinks`. Conventions: `docs/features-reference.md` "Wanted vehicles"; step log: `WANTED_PLAN.md`.

### Vehicle origin chip + "Where it comes from" section (2026-10-26)

Shows where a car comes from, only when known: flags chip (brand country, owner when different, assembly plant) on the VIN and plate cards, and a `?section=origin` timeline (brand origin, ownership with years, assembly, Ukraine) with a brand-vs-VIN-prefix warning, a collapsed explainer, per-fact sources and an "as of" date. Built in steps 0-8 and 10-11 of `ORIGIN_PLAN.md`: migration 0075, Wikidata + NHTSA WMI ingests with overrides and seed CSVs (163 brands, 97.8 % of registry vehicles matched; 1152 WMIs), `GET /api/origin`, SVG flags incl. former states (USSR, Czechoslovakia, GDR, FRG, Yugoslavia, Serbia and Montenegro) chosen by model year, shared `Timeline`. Conventions: `docs/features-reference.md` "Vehicle origin". Release 2 added curated model plants (Step 3, 2026-10-26: `model-plants.csv`, `ingest:model-plants`, "also built in" filtered by year); the stats breakdown (Step 9) is still deferred. Open: legacy flags and light theme not eyeballed, no WMI-only brand fallback.

**Stats breakdown (Step 9, 2026-10-26):** `/stats` panel "Where cars come from" - passenger cars by brand home country and by VIN assembly country, former states by model year. Rollup `registry.stats_origin` (migration 0076, `scripts/src/origin-stats.ts`, `db:refresh-origin-stats`, in `db:refresh-derived`), `GET /api/stats/origin`, `OriginStatsPanel`. Real DB: 13.37 M cars, brand country known for 99.7 %, plant country for 48 %; total and Skoda-from-1993 verified equal to direct SQL. `pickByYear` moved to `@carplates/shared`.

### Racer, flags, verification and RIA polish (2026-10-25 / 26)

Racer: smoke at 5 / 10 / 15 bumps and a wreck at 20, a 10 km test-drive end ("contact a real seller"), a photo backdrop for every region (`scripts/racer-render/region-backdrops.mjs`, credits in `docs/racer-backdrop-credits.md`), a backdrop chip that also sets the billboard region, and `RaceRegionSelect` with flags. Large region flag preview ("?" beside the region chip). Verification: OTK protocol and driving-licence links (opendata.hsc.gov.ua) and a "?" glossary on every row; ranking-chip tooltips lead with the vehicle count. AUTO.RIA link-out copies the plate / VIN first (shared auction modal). Carscoops reviews feed repointed. About: new features card entries (origin, OTK / licence, 10 km test drive), new sources (MVS HSC open data, flag-icons) and widened NHTSA / Wikidata / Wikimedia texts. Conventions: `docs/features-reference.md` "Test-drive racer", "Verification links and chip tooltips", "AUTO.RIA link-out".

## Header "What's new" bell and lazy panels (2026-10-27)

Header bell (`NewsBell.tsx`, next to the layers button, hidden offline): a dot while the newest release day is newer than what this browser has seen, a dropdown with the 5 latest `RELEASES` items (`NewsBellPanel.tsx`, lazy, loaded on click only - it drags the 70 KB log along), and an "All updates" link to `/releases`. Seen state is a per-browser localStorage date (`carplates.releasesSeen`, `lib/releases-seen.ts`) - no table, no API, since the site is public and accounts are optional; a first visit starts caught up, opening the bell or `/releases` marks seen. The dot reads `LATEST_RELEASE_DATE` from the tiny `releases/latest.ts` (a test fails when it lags `RELEASES`). Same-day additions to an already-seen day do not re-trigger the dot - add a new dated entry for that. Skeleton fallbacks (`NewsBellSkeleton.tsx`, `LayersPanelSkeleton.tsx`, same footprint as the real panels) show while a lazy chunk loads; the layers button keeps its hover prefetch. The sidebar chunk is still warmed 1.5 s after load (the mobile main nav). About: new "What's new" features-card entry. No new data sources.

"Copy all info" now also exports "Where it comes from" and the wanted-vehicle verdict with its records (`lib/export-verify.ts`), with their sources in the closing list; the last export update had been 2026-10-16. Conventions: `docs/features-reference.md` "Copy all info - Origin and Wanted".

## Export polish: prettier PDF / Word (2026-10-27)

Four steps of the plan, in order: (1) verdict banner (`tone` on `ExportKeyValueSection`; wanted = alert, was = neutral, clear = ok); (2) origin as a numbered timeline (`layout: 'timeline'`, alternatives / hints / source are `note` rows under their step); (3) table polish in PDF and Word (shaded header, zebra, fixed kv label column of 30%, whole rows, header repeated after a page break; no new dependency); (4) cover strip (`summary`: verdict, region, year, fuel). Text formats get `[!]`/`[OK]`/`[i]` markers and a one-line strip. Checked with a rendered ua sample (wanted history, origin, a 70-row table) as PDF / docx / md / csv: Cyrillic, banner, timeline and page breaks fine in the PDF; the docx XML has `cantSplit`, `tblHeader`, shading, fixed layout and the banner edge (not opened in Word itself). Tests: `export-report.test.ts`, `export-formats.test.ts`. Still skipped: country flags (SVG rasterising), more chart types, a PDF layout library.

## About page refresh and photo-search timeout (2026-10-27)

About: Cloudflare added to `SOURCES` (`about.source.cloudflare`, CDN and cache, plain tile - no logo licence) and two features to `FEATURES` (`discuss`, `share`), ua/ru/en. Photo search: slow recognition no longer errors out and can be skipped (`ArSearchButton.tsx`, `local-recognize.service.ts`); the alpr container got 3 CPUs on the 6-core VPS. Releases entries added for both.

## Monthly "what's new" digest (2026-10-28)

Opt-in mail, sent on the 1st for the previous month. Consent is explicit (`app.users.marketing_opt_in`, default false, switch on `/profile` → Notifications; nothing is turned on at sign-in, because a feature digest is marketing mail and the sender reputation is shared with the sign-in codes). Migration 0078 adds the two `marketing_opt_in*` columns and `app.digest_sends` (period, user_id).

Content comes from the release log, which therefore moved from `apps/web/src/routes/releases/releases.ts` to `packages/shared/src/releases.ts` (subpath export `@carplates/shared/releases`, not the barrel, so the 70 KB log stays out of the main chunk). `apps/api/src/digest/digest-content.ts`: `previousPeriod` (Kyiv calendar month before now), `isSendWindow` (1st from 09:00 Kyiv, plus 2 days of catch-up), `buildDigest` (every `new` item of that month in full, the other groups as counts; `null` = no new feature = nothing is sent). `DigestService` ticks every 30 min while `DIGEST_ENABLED=true`, claims each (month, user) in `app.digest_sends` before sending (second instance / restart safe; a failed send releases its claim and is retried on the next tick), 600 ms between sends (Resend 2 req/s). Mail: `DigestEmail` template + `DIGEST_TEXT` (ua/ru/en), `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, optional separate sender `MAIL_FROM_NEWS`.

Unsubscribe: signed token `<userId>.<HMAC(AUTH_SECRET)>` (no expiry; it can only switch the digest off). Mail link → `/unsubscribe#t=…` (POST only after a click, like the magic link); mailbox button → `POST /api/digest/unsubscribe/one-click?t=…` (Nest's Fastify adapter already parses the form body, the endpoint only reads `?t=`; `OriginGuard` lets header-less server requests through). Admin: Users tab card (`GET /api/admin/digest`: period, new-feature count, subscribers, already sent; `POST /api/admin/digest/test` mails the admin their own copy). Dev preview: `/api/dev/emails/digest?lang=ua`.

## Week digest 2026-10-25 → 2026-10-28 (docs sync)

Docs, release log and About page re-checked against the week's commits. Release log (`packages/shared/src/releases.ts`, 2026-10-28) gained RHD chip, race tilt steering + offline cache and OPUS in-place translate; the About race and VIN feature lines mention them (ua/ru/en). All week's data sources were already on About (Disqus, OPUS-MT, Yahoo Finance, Cloudflare/Turnstile, NHTSA MSRP). `CLAUDE.md` + `CLAUDE_RULES.md` are ~7.7 KB combined, so nothing was trimmed; details stay in `docs/features-reference.md`.

**Status (2026-10-28):** deployed; migration 0078 verified on the VPS, admin test send, opt-in and one-click-style unsubscribe verified on production. `DIGEST_ENABLED=true` is set, so the first real send is **2026-11-01 09:00 Kyiv** (October). To verify then: one mail arrives, the admin card shows `1 already sent`, a redeploy that day sends nothing more. Gotcha found: a Resend 403 `domain is not verified` means `MAIL_FROM_NEWS` points at a domain not verified in Resend (verify it, or unset the variable to fall back to `MAIL_FROM`).

### Addendum (2026-10-28, later)

About page: the feature list (between the description card and the Sources card) gained `about.feature.translate` and the value/race lines now mention the US base price and the road mini-map; `about.source.nhtsa` mentions MSRP (ua/ru/en). Release log 2026-10-28 got a matching `data` item. Not in the release log on purpose: the admin Server tab (admin-only) and the host-cron ingest jobs (infra). `CLAUDE_RULES.md` still said "no toggle" for the theme; the sidebar Appearance setting (auto/light/dark) replaced that, line fixed.

## Driver assists from the VIN decode (2026-10-28)

Step 1 of "Driver assist + CarPlay / Android Auto". The VIN page already had `VinAssists`; it was extended with Crash Imminent Braking, Rear AEB, Lane Centering, Blind Spot Intervention, Adaptive Driving Beam, Parking Assist and the SAE automation level (`saeLevelRange`), plus a "US-market spec" footnote, and the same block now appears on the plate card as its own collapsed, shareable 🛟 section (`DriverAssistSection`, `?section=assists`, after Size & parking) with a ❓ popover and a "what is this / why empty" explainer. Sample decodes: US 2018+ (Tesla, Honda, Ford) fill the fields, EU/older VINs return none, SAE level was empty in all samples. Steps 2-4 (EU GSR2 baseline, Tesla, CarPlay link-out) remain in PLAN.md.

## EU legal baseline (GSR2) in the driver-aids section (2026-10-28)

Step 2 of "Driver assist + CarPlay / Android Auto". Dates checked against Regulation (EU) 2019/2144 (original text, Annex II notes B and Art. 16): for passenger cars (M1) AEB for light vehicles, emergency lane keeping, intelligent speed assistance and driver drowsiness/attention warning are refused type-approval for new TYPES from 2022-07-06 and may not be registered in any NEW car from 2024-07-07. (Advanced driver distraction warning and pedestrian/cyclist AEB are one stage later, 2024-07-07 / 2026-07-07; not shown yet.) `vin/gsr2.ts` (`gsr2Status`, `gsr2Baseline`) compares the whole model year with the two dates: <2022 none (hidden), 2022-2023 `newTypes`, 2024 `transition` (depends on the month), 2025+ `all`. Only a year is known (the model year stands in for the first-registration date), so the text says so. `VinEuBaseline` renders it inside `DriverAssistSection` (new prop `euYear`, set only when the RDW register knows the model, i.e. an EU-market car); the section now shows if either the NHTSA assists or the baseline exist. Wording: legal baseline, not the car's equipment, only valid if first registered in the EU. Keys `vin.eu.*` (ua/ru/en). The Annex II table text extracted flat, so the M1 column was inferred from the row order; recheck against EUR-Lex when adding more rows. Steps 3-4 stay optional in PLAN.md. Verified in the UI on a 2023 Porsche Taycan (НС0500YС): the dashed "new models only" chips render under the US-spec NHTSA chips; the two blocks can read as contradictory (see the open polish note in PLAN.md).

## Ingest cron (2026-10-28)

✅ **Built and run on the VPS.** Host cron (the `deploy` user's crontab, `infra/vps/ingest.cron`) starts `infra/vps/run-ingest.sh <job>`, which runs
`docker compose run --rm ingest tsx src/run-job.ts <job>` (image `scripts/Dockerfile` = pnpm install + shared/db build + `tsx`; compose service `ingest`,
profile `jobs`, binds `/opt/carsua/archive` and `/opt/carsua/ingest-data` (= `scripts/.data`)). `run-job.ts` takes a per-job advisory lock (skips if held),
logs a `registry.job_runs` row (migration 0077; `abandoned` for rows a killed run left `running`), enforces the timeout on the whole process group and pings
`HC_PING_<JOB>` (`/start`, ok, `/fail`; unset = no ping). What runs and its timeout: `scripts/src/jobs.ts` (`news`, `social`, `wanted` daily; `plates` = `ingest-full.ts --archive /archive`
Tue + Fri, 12 h limit). Deployed by `deploy-ingest.yml` (builds the image, writes `ingest.env`, syncs the scripts, installs the crontab). Schedule, operating notes: SCHEDULE.md.

**Found on the first run (all fixed or documented):**

- A restored DB had `ingested_resources` rows only for 2025/2026, so the first `plates` run re-read 2013-2024 (mostly 0 inserted, ~11k missing rows filled), then
  reloaded 2026 (910k plateless duplicates by design), the snapshot, the backfill (931k plates, 931k duplicates removed) and the refreshes: ~8 h with one restart.
- **No-op runs were not no-ops.** `ingest.ts` refreshed `current_registration` + all stats after every invocation, even when every resource was skipped, and
  `ingest-full` re-ran the snapshot and the backfill (indexes dropped, exclusive lock, ~25 min) every time; three stats refreshes cost ~1.5 h. Now: refresh only
  when rows were inserted, `--skip-refresh` for the intermediate steps (one refresh, after the backfill), and a `scripts/.data/backfill-pending` marker
  (`ingest-state.ts`) written by any load that inserts rows and cleared by `--backfill-plates`; `ingest-full` skips snapshot/backfill/refreshes without it.
  A file, not a row: `ingested_resources.ingested_at` feeds the public data-version marker.
- Stopping the container mid-`REFRESH MATERIALIZED VIEW` leaves the refresh running in Postgres; the backfill's `DROP INDEX` would queue behind it and block
  every plate lookup. Terminate it with `pg_terminate_backend` first.
- Cron times are the VPS's local time (CET), not UTC.
- ~404k rows have no plate after the run (2026 registrations since the removal with no earlier plated record, ~1% of 2021-2025 published without one); all have a VIN.
- `backup.sh archive` printed a first-attempt `501 NotImplemented` from R2 and succeeded on the retry (16 objects, 1.1 GiB); `full` ~10 min for 1.3 GB.

**Automation added the same day:** after a `plates` run that loaded a resource, `run-ingest.sh` runs `backup.sh archive` + `full`; `infra/vps/ingest-status.sh`
(copied to the VPS by the deploy) shows the running container, last log lines, `job_runs`, pending marker and what Postgres is doing.

**Still open:** healthchecks.io checks + `HC_PING_NEWS|SOCIAL|WANTED|PLATES` secrets (then re-run `deploy-ingest`); confirm the first Tue/Fri no-op run; the other
SCHEDULE.md sources (ratings, VehiclesDB, RDW, recalls, ...) stay manual.
