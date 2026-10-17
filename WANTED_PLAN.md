# Wanted vehicles: `/wanted` stats page + stolen.in.ua history backfill

## Context

`registry.wanted_vehicles` (≈79k rows, migrations 0068/0069, `pnpm ingest:wanted`) is only used for the per-plate/VIN check on the
result card. The police feed lists **current** records only, so "found" history exists only since our first ingest. The user wants
(1) a public stats page on wanted cars (top brands/models/regions/types/colours, recently stolen, recently found, totals by year,
stolen vs found, sortable asc/desc) linked from the card's wanted section and a home teaser, and (2) the history since Aug 2020
backfilled from stolen.in.ua (same data.gov.ua source; robots.txt `Allow: /`), so stats and plate lookups cover found cars too.

**Fit with our table:** a stolen.in.ua detail page (`/v/<plate|VIN>`) shows per record exactly our columns — brand, model, type,
colour, plate, body no. (→ `vin`), chassis no. (→ `vin_alt`), theft date (`seized_at`), registration date (`registered_at`),
police unit (`organ_unit`), and "removed from wanted" date (→ `resolved_at`). Only the feed `id` is absent → synthetic
`source_id`, plus a `source` column. Engine number is ignored.

## Size of the backfill (stolen.in.ua month headers, counted 2026-10-16)

| Theft year     |     Stolen |      Found | Still wanted | Detail fetches (≤ found) | ≈ time at 1 req/s |
| -------------- | ---------: | ---------: | -----------: | -----------------------: | ----------------: |
| 2020 (Aug–Dec) |      1 840 |      1 353 |          487 |                  ≤ 1 353 |            25 min |
| 2021           |      3 156 |      2 222 |          934 |                  ≤ 2 222 |            40 min |
| 2022           |     33 532 |     20 106 |       13 426 |                 ≤ 20 106 |             5.5 h |
| 2023           |      4 577 |      2 881 |        1 696 |                  ≤ 2 881 |            50 min |
| 2024           |      2 324 |      1 486 |          838 |                  ≤ 1 486 |            25 min |
| 2025           |      1 326 |        898 |          428 |                    ≤ 898 |            15 min |
| 2026 (to Oct)  |        915 |        425 |          490 |                    ≤ 425 |             7 min |
| **Total**      | **47 670** | **29 371** |   **18 299** |             **≤ 29 371** |         **≈ 8 h** |

Only found cards need a detail page (still-wanted ones are already in our feed); fewer in practice, since one page covers every
record of a plate/VIN and placeholder ids (`XXXXXXXX`, `0000`, `*`) are skipped. 2022 (the full-scale invasion) is 2/3 of the
work, so it is split into halves.

## Steps (each one ends verified and committed; a later step can start any day)

The scraper takes a month range: `pnpm ingest:wanted-history --from 2020-08 --to 2021-12` (months **and** details for that
range; `--no-details` = month cards only). Re-running a range is safe: fetched ids are remembered in `wanted_scrape_ids`.

1. ✅ **Foundation (2026-10-16, 5f421fb)** (code, no long run) — migration 0074 (§1), `organUnitRegion` + `region` in the feed ingest (§2), the scraper
   with `--from/--to/--no-details`, parsers + HTML-fixture tests (§3), `source = 'feed'` guard in `wanted.ts`. Run
   `pnpm ingest:wanted` (fills `region`) and `pnpm ingest:wanted-history --from 2020-08 --to 2020-08` as a smoke test
   (Aug 2020: 388 cards, 287 found; spot-check `AP1577BP` → removed 2026-04-30).
2. ✅ **Backfill 2020–2021 (2026-10-16, e3e0998)** — `--from 2020-08 --to 2021-12` (≈ 1 h, exit 0). Result: 17 months,
   2839 detail pages, 3193 exact + 1984 placeholder rows written. Month cards vs headers: 2020 1749 / 1289 found (hdr 1840 / 1353,
   95 %), 2021 3047 / 2142 found (hdr 3156 / 2222, 96-97 %). In the DB (by `seized_at` year, after the one-row-per-plate/date/unit
   dedupe and with feed rows merged): 2020 1601 stolen / 1214 found / 387 wanted; 2021 2808 / 2052 / 756. Null `region`: 3.75 %
   (2020), 1.96 % (2021); these are exactly the 115 placeholder rows (no unit known, null by design); scraped exact rows 0 null. Spot-checks OK: `AC0785AB` (VIPER, Волинська, removed 2026-04-30), `CA9143BE` (Черкаська, removed 2021-02-08), `54636AA` (Київська). CSV export added (`export:wanted-history:csv`) and run after this step.
3. ✅ **Backfill 2022 H1 (2026-10-16, 3f12087)** — `--from 2022-01 --to 2022-06` (≈ 3 h; war months dominate). First run died
   in Mar on an HTTP 502 burst (3 retries / 15 s were too few); `RETRIES` raised to 6 (≈ 75 s), re-run resumed from `wanted_scrape_ids`
   and exited 0 (7303 detail pages, 9615 exact records, 1268 placeholders in the resumed run). Month cards vs headers, Jan–Jun:
   24 965 stolen / 14 961 found (hdr 25 141 / 15 069, 99 %). In the DB by `seized_at` month (stolen / found): 01 185 / 139,
   02 4451 / 3135, 03 6107 / 4068, 04 3612 / 2233, 05 4031 / 2517, 06 2461 / 1472 = 20 847 / 13 564 (83 % / 90 % of the headers: the
   one-row-per-plate/date/unit dedupe collapses repeated records; the gap is wider than in 2020-21 and not yet analysed). Null `region` 0.54 % (112 rows, of which
   placeholders 74). Spot-checks OK: `BM0462AK` (Сумська, removed 2023-06-30), `AP1687EH` (Запорізька), `AX1611BI` (Черкаська). CSV
   export re-run (14 043 rows, 14 479 ids, 23 pages, ≈ 0.9 MB).
4. ✅ **Backfill 2022 H2 (2026-10-16, 6b73293)** — `--from 2022-07 --to 2022-12` (≈ 2.5 h, exit 0, no retries needed).
   3980 detail pages, 4982 exact records, 1014 placeholders. Month cards vs headers: 8299 cards / 4967 found (hdr 8391 / 5037, 99 %).
   Per month (cards / found, hdr): jul 2407 / 1485 (2478 / 1538), aug 1221 / 709 (1221 / 709), sep 1381 / 812 (1388 / 817), oct 1264 / 743
   (1272 / 750), nov 1038 / 619 (1041 / 622), dec 988 / 599 (991 / 601). In the DB by `seized_at` month (stolen / found): 07 2024 / 1369,
   08 1148 / 672, 09 1225 / 736, 10 1133 / 663, 11 968 / 575, 12 910 / 552 = 7408 / 4567 (88 % / 91 % of the headers, same dedupe
   gap as H1). Null `region` 16 rows (0.2 %), all placeholders; exact rows 0 null. Spot-checks OK: `КА9771НХ` (Київ, removed
   2023-05-11), `АХ4102МВ` (Харківська), `АР1927ЕО` (Запорізька). CSV export re-run (18 111 rows, 18 459 ids, 29 pages, ≈ 0.9 MB).
5. ✅ **Backfill 2023–2024 (2026-10-16, committed with 83a4927)** — `--from 2023-01 --to 2024-12`, exit 0, no retries. Month cards vs
   headers: 2023 4522 cards / 2842 found (hdr 4577 / 2881, 99 %), 2024 2288 cards / 1461 found (hdr 2324 / 1486, 98-99 %). In the DB
   by `seized_at` year (stolen / found / wanted): 2023 4028 / 2581 / 1447, 2024 1925 / 1350 / 575 (feed rows merged; same dedupe gap as
   2022). Null `region` 0.89 % (2023), 0.78 % (2024). Spot-checks OK: `АН9583СТ` (Донецька, removed 2025-09-26), `ТО6400АН`
   (Донецька, removed 2026-04-30). CSV export re-run (21 388 rows, 21 946 ids, 53 pages, ≈ 1.1 MB).
6. ✅ **Backfill 2025–2026 (2026-10-17, cfca5f1)** — `--from 2025-01 --to 2026-10`, exit 0, no retries. 1122 detail pages,
   1286 exact records, 676 placeholders. Month cards vs headers: 22 months within 0-5 cards of the header (e.g. 2025 total 1494 cards
   vs hdr ~1500; Oct 2026 21 / 4 = hdr). In the DB by `seized_at` year (stolen / found / wanted): 2025 1229 / 827 / 402, 2026 871 /
   405 / 466 (hdr 1326 / 898, 915 / 425; same dedupe gap as earlier). Null `region` 2.03 % (2025), 0.57 % (2026). CSV export re-run
   (22 556 rows, 23 068 ids, 75 pages, ≈ 1.2 MB). `AP1577BP` spot-check not repeated (plate lookup by Latin text returned no row;
   likely stored with Cyrillic letters). From here on, a no-arg run refreshes only the last 2 months (daily, after `ingest:wanted`).
   After each backfill step: per-year `SELECT` of stolen / found vs the table above, null `region` share, a few card spot-checks, then
   `pnpm export:wanted-history:csv` (cumulative snapshot -> `scripts/seed-data/wanted-history*.csv.gz`; a new setup loads it with
   `pnpm ingest:wanted-history:csv` instead of re-scraping) and commit the refreshed files with the step.
7. ✅ **Card history (2026-10-17, 64a643b)** — `wanted.service.ts`: scraped records in lookups, "history since Aug 2020", stolen.in.ua attribution (§3 end). Done: records carry `source` + `removedExact` (inexact removal shows "exact date unknown"), `trackedSince` = earliest scraped theft date >= 2020-08-01 + `historySource`; checked on `АР1577ВР` (feed + removed 2026-04-30 record).
8. ✅ **Stats API (2026-10-17, 111436f)** — `GET /api/wanted/stats` + `wantedStatsResponseSchema` (§4), service test. Verified live: 75 196 wanted now, 26 714 found, median 1348 days to found, 100-row top lists, 50 recent each, ≈ 0.2 s (cached). `byYear` includes pre-2020 thefts (feed rows from 1928); the page should trim or group them.
9. ✅ **`/wanted` route (2026-10-17, 5b47efb)** — `routes/wanted/` (route, sortable table, year chart with pre-2020 grouped into one "≤ 2019" bar, recent lists), `StatsMap` now takes `{label, value}[]`, `wantedStatsQuery`, i18n `wanted.stats.*`, `ROUTE_TITLE_KEYS` + `STATIC_PAGES`. Verified in the browser (ua/ru): sort asc/desc, region map, plate links. Left for step 10: links, home teaser, docs, `releases.ts`.
10. ✅ **Links, home teaser, docs (2026-10-17, commit hash: fill in after commit)** - `/wanted` links in `WantedCheck`, `/stats`, `QuickLinks`; `HomeWantedSection` (5 newest stolen) in a `LazySection` after the news; i18n `wanted.stats.viewLink`; commands-reference, `PLAN.md`, `plan-done.md`, `releases.ts`. Verified in the browser (ru, home teaser + QuickLinks).
11. **Links + docs** — `WantedCheck` link, `/stats` link, home teaser (§5), docs + `releases.ts` (§6).

Steps 2–6 are only data runs (no code), so they can run while 7–10 are built; the page just shows more history as they finish.

### Sessions (start each with "implement session N of WANTED_PLAN.md")

| Session | Steps | Scope                                                               |
| ------- | ----- | ------------------------------------------------------------------- |
| 1       | 1     | Foundation: migration, region, scraper + tests, Aug 2020 smoke test |
| 2       | 2–6   | Backfill data runs (≈ 8 h, background / can span days)              |
| 3       | 7–8   | Card history + stats API (done)                                     |
| 4       | 9     | `/wanted` page                                                      |
| 5       | 10    | Links, home teaser, docs, releases                                  |

Session 1 result: Aug 2020 smoke test = 388 cards / 287 found (header 401 / 297), 250 detail pages, `AP1577BP` has the 2026-04-30 removal; region null share 0.12 %. Resume at session 2 (step 2).

Mark a step ✅ here when it is done (with the commit), so the next session knows where to resume.

### Handoff for step 9 (written after step 8, 2026-10-17)

Start the new session with "implement session 4 of WANTED_PLAN.md". Everything the page needs exists; nothing else to prepare.

- **API (live, verified)**: `GET /api/wanted/stats`, contract `wantedStatsResponseSchema` / `WantedStatsRow` / `WantedStatsVehicle` in
  `@carplates/shared` (`packages/shared/src/wanted.ts`, already built). Shape: `summary { wantedNow, foundTotal, foundSinceTracking,
withPlate, withVin, medianDaysToFound|null, historySince|null }`, `byYear` (ascending, `label` = year string),
  `byRegion|byBrand|byModel|byType|byColor` (`{label, stolen, found, wanted}`, top 100, stolen desc), `recentStolen` / `recentFound`
  (50 each: brand, model, vehicleType, color, plate, seizedAt `YYYY-MM-DD`, resolvedAt ISO|null, region|null), `checkedAt`.
- **Data quirks to handle in the UI**: `byYear` runs from 1928 (feed thefts before Aug 2020 are mostly still wanted, found ≈ 0): group
  everything before 2020 into one "≤ 2019" bar or show 2020+ only, and note that found counts before Aug 2020 are not tracked. Labels
  are Ukrainian (brand `ВАЗ`, colour `БІЛИЙ`, type `Легковий автотранспорт`, region `Донецька область`); a vehicle's `region` can be null.
  The map needs region labels mapped to `StatsMap`'s names (`localizeRegion`, `REGION_NAME_BY_SHAPE_ISO` in
  `routes/stats/region-geography`). Real numbers (2026-10-17): 75 196 wanted, 26 714 found, median 1348 days.
- **Existing files to follow**: `apps/web/src/routes/stats/{StatsRoute,StatsTable,StatsMap}.tsx` (+ `StatsTable.test.tsx`;
  `HomeNewsSection.tsx` also lives in `routes/stats/`, for the step-10 teaser), `routes/read/imports/ImportsSections.tsx`
  (`YearsSection`), `lib/api.ts` (wanted fetcher ~L744), `lib/queries.ts` (`wantedQuery` ~L623, live data, no offline group),
  `components/WantedCheck.tsx` (step 10).
- Read `docs/features-reference.md` "Wanted vehicles" plus the "New public route" rule in CLAUDE.md before coding.

### Handoff for step 10 (written after step 9, 2026-10-17)

Start the new session with "implement session 5 of WANTED_PLAN.md". Step 9 is committed (5b47efb).

- **Done in step 9**: `apps/web/src/routes/wanted/` (route, table, chart, `WantedRecentList`, `helpers.ts`), `wantedStatsQuery`, i18n `wanted.stats.*` (ua/ru/en; `wanted.stats.title` is the page name, usable as link text), route + title + `STATIC_PAGES`.
- **To do**:
  1. `components/WantedCheck.tsx`: link "Wanted vehicles stats" to `/wanted`.
  2. `routes/stats/StatsRoute.tsx`: link to `/wanted` (also consider `components/QuickLinks.tsx`).
  3. Home teaser `routes/stats/HomeWantedSection.tsx`: 5 `recentStolen` from `wantedStatsQuery()` plus a link. Mount it in `routes/SearchRoute.tsx` inside a `LazySection` next to `<HomeNewsSection />` (~L360). Same pattern as `HomeNewsSection`: return null when no data, `LoadErrorBoundary compact`, `section-vt`. Reuse `routes/wanted/WantedRecentList.tsx` with the list sliced to 5.
  4. Docs: `docs/commands-reference.md` (`ingest:wanted-history`, `export:wanted-history:csv`), one-line ✅ in `PLAN.md`, write-up in `docs/plan-done.md`, entry in `src/routes/releases/releases.ts` (see `types.ts`; no em dash in UI text). `features-reference.md` "Wanted vehicles" already has the /wanted notes.
- **Verify**: `pnpm format`, `pnpm lint`, `pnpm test`, then the home teaser and links in the browser.

## stolen.in.ua reference (verified 2026-10-16)

- `robots.txt`: `User-agent: * / Allow: /`. No API / JSON; plain server-rendered HTML (≈ 450 KB per month page). Send a real
  `User-Agent` (`carsua.app-ingest/1.0 (+https://carsua.app)`), 1 req/s.
- **Month page** `https://stolen.in.ua/history/<mon>-<yy>`, `mon` ∈ `jan feb mar apr may jun jul aug sep oct nov dec`, first =
  `aug-20`. The full month list is in a `<select>` (`<option value="aug-20">серпень 2020 р.</option>`). All cards on one page,
  no pagination. Grouped by **theft month**.
  - Header: `За серпень 2020 р., в Україні було викрадено <span …>401</span> … З них <span …>297</span> вже знайдено` (the header
    total can exceed the card count: Aug 2020 = 401 vs 388 cards; found count matched exactly in every year).
  - Card: `<a href="/v/<ID>" class="… bg-emerald-950/35 …">` = **found**, `bg-rose-950/35` = still wanted; inside: colour as
    `style="background: radial-gradient(circle at center, #0000FF, …)"`, `<img src="/icons/<type>.svg" alt="Легковий автотранспорт">`,
    `<span class="flex flex-col">BRAND<small …>MODEL</small></span>`, then theft day `1 серп.` (Ukrainian short month).
  - `<ID>` = plate, VIN, or placeholders (`XXXXXXXX`, `0000`, `*`).
- **Detail page** `https://stolen.in.ua/v/<ID>`: status badge (`У розшуку` / found), then one block per record. Current record
  heading `У розшуку`, past ones `Був у розшуку`. Fields (label after value): brand, model, `Тип транспортного засобу`, `Колір`
  (e.g. `ЧОРНИЙ`), `Державний номерний знак`, `Номер кузова (VIN)`, `Номер шассі` (`Невідомо` = null), `Номер двигуна` (ignore),
  `1 серпня 2020 р.` + `Дата незаконного заволодіння`, `… р.` + `Дата обліку інформації`, `Підрозділ, що здійснює розшук:` + unit,
  `Стан розшуку` (`Не знайдено`), and for past records `30 квітня 2026 р.` + `Вилучено з розшуку` (+ `перебував у розшуку протягом N днів`).
  Dates are full Ukrainian genitive months (`січня … грудня`). Example: `AP1577BP` has one current record and one removed
  2026-04-30 (different police unit).
- data.gov.ua (CKAN `package_show`) keeps **no** old versions of `CarsWanted.json`, so stolen.in.ua is the only history source.
- Fetch the two fixtures for tests from the live site in session 1 (`aug-20` month page, `/v/AP1577BP`); trim them to a few cards.

## 1. Schema — `packages/db/migrations/0074_wanted_history.sql` (+ Drizzle `wantedVehicles` in `packages/db/src/schema.ts`)

- `source text NOT NULL DEFAULT 'feed'` (`'feed' | 'stolen.in.ua'`), `resolved_exact boolean NOT NULL DEFAULT true`, `region text` (derived from `organ_unit`), indexes on
  `seized_at`, `resolved_at`, `region`. Backward compatible (blue/green).
- New table `registry.wanted_scrape_pages (month text PK, fetched_at, cards int)` and `registry.wanted_scrape_ids (ident text PK,
status text, fetched_at)` for resume.

## 2. Region from police unit — `scripts/src/wanted-parse.ts`

- `organUnitRegion(unit)`: match oblast stems (`ЗАПОРІЗЬК` → `Запорізька область`, `КИЄВ`/`М. КИЄВІ` → `Київ`, `КРИМ` …)
  onto `REGION_NAMES` from `@carplates/shared` (`packages/shared/src/regions.ts`). Unit-tested in `wanted-parse.test.ts` with
  real samples (pull 50 distinct `organ_unit` values first). `toWantedInsert` fills `region`; a normal `pnpm ingest:wanted`
  run backfills all feed rows (upsert `set` gains `region`).

## 3. Backfill — `scripts/src/wanted-history.ts` + `wanted-history-parse.ts` (+ test with saved HTML fixture), `pnpm ingest:wanted-history`

- **Phase A, months** (`/history/<mon>-<yy>`, Aug 2020 → current, list from the `<select>`): parse cards (`<a href="/v/ID">`,
  `bg-emerald-950` = found, `bg-rose-950` = wanted, type icon alt, brand/`<small>` model, day). `--from/--to YYYY-MM` limit the
  months; with no range only the last 2 months are re-fetched. Store found cards **not already in our table** (match ident = plate/vin/vin_alt + `seized_at`) as
  `source='stolen.in.ua'` rows with `resolved_at = scrape time` and `resolved_exact = false` (new boolean, default true), so
  they count as found and never as "wanted"; "median days" / "recently found" use only exact dates. Rose cards are skipped
  (already in the feed).
- **Phase B, details** (default on, `--no-details` to skip, 1 req/s, resumable via `wanted_scrape_ids`): for each found ident with
  a real id (skip `XXXXXXXX`, `0000`, `*`, < 4 chars), fetch `/v/ID`, parse all "Був у розшуку" records, upsert full rows
  (dedupe key `plate|vin + seized_at + organ_unit` vs existing feed rows → only fill `resolved_at` if ours is null; the
  Phase-A placeholder row for that card is replaced by the exact one). One page
  covers every record of that ident.
- Feed ingest stays authoritative: `wanted.ts` resolve step adds `source = 'feed'` to its `WHERE` so scraped rows are never touched.
- `wanted.service.ts` `trackedSince` → `min(seized_at)` of scraped rows when present (card text "history since Aug 2020"), and
  card shows scraped records (they match by plate/VIN automatically). Attribution "history: stolen.in.ua" on the page + card.

## 4. API — `apps/api/src/wanted/`

- `GET /api/wanted/stats` (`WantedService.stats()`, in-memory cache 10 min, invalidated by `max(last_seen_at)`): summary
  (wanted now, found total, found since tracking, with plate / VIN, median days to found, history since), `byYear`
  (seized year → stolen, found), `byRegion`, `byBrand`, `byModel`, `byType`, `byColor` (each `{label, stolen, found, wanted}`,
  top 100), `recentStolen` and `recentFound` (50 each: brand, model, type, colour, plate, seizedAt, resolvedAt, region).
- Zod contract `wantedStatsResponseSchema` in `packages/shared/src/wanted.ts` (own file, new fields nullable/optional), rebuild
  shared. Default global throttle is enough (not an enumerable lookup).

## 5. Web — `apps/web/src/routes/wanted/`

- `WantedStatsRoute.tsx` (lazy, `/wanted` in `App.tsx`), `wantedStatsQuery` in `lib/queries.ts` (no offline group, live data),
  fetcher in `lib/api.ts`, helpers/types in `helpers.ts`/`types.ts`.
- Sections: summary cards (as `StatsRoute` L134-151) · **by year** grouped bars stolen vs found (pattern of
  `read/imports/ImportsSections.tsx` `YearsSection`) · **dimension tabs** region/brand/model/type/colour with a sortable table
  (TanStack Table like `stats/StatsTable.tsx`: click header toggles ▲/▼ asc/desc on label, stolen, found, wanted, found %) and a
  region **map** (generalise `stats/StatsMap.tsx` to accept `{label, value}` rows; existing callers adapt) · **recently stolen** /
  **recently found** lists (link plate → `/<plate>`). Below-the-fold sections are `LazySection`s.
- Links: `WantedCheck.tsx` → "Wanted vehicles stats →" `/wanted`; `/stats` page link; home teaser `HomeWantedSection.tsx`
  (5 recently stolen + link) next to `HomeNewsSection`.
- i18n `wanted.stats.*` in `i18n/{ua,ru,en}.json` (no em dash in UI text). `ROUTE_TITLE_KEYS['/wanted']`, `STATIC_PAGES['/wanted']`
  (ua/ru/en) in `apps/api/src/spa/spa-text.ts`.

## 6. Docs

`docs/features-reference.md` "Wanted vehicles" (source column, region, scrape, resume), `docs/commands-reference.md`
(`ingest:wanted-history`), `PLAN.md` ✅, `docs/plan-done.md`, `releases.ts` entry.

## Verification

- `pnpm --filter @carplates/shared build`; `pnpm db:migrate`; `pnpm ingest:wanted` (regions filled: `SELECT region, count(*) …`,
  null share < 5 %).
- `pnpm ingest:wanted-history --no-details` → month counts match stolen.in.ua headers (e.g. Aug 2020: 401 stolen / 297 found);
  then a short detail run, kill, rerun → resumes.
- Vitest: `wanted-parse.test.ts` (regions), `wanted-history-parse.test.ts` (HTML fixtures), service stats test, web table sort test.
- `pnpm lint`, `pnpm format`, `pnpm test`; open `/wanted` in browser (chrome-devtools): sorting asc/desc, map, lists, card link,
  home teaser; check `AP1577BP` card shows the 2026-04-30 removal from scraped history.
