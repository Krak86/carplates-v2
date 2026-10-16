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

| Theft year | Stolen | Found | Still wanted | Detail fetches (≤ found) | ≈ time at 1 req/s |
| ---------- | -----: | ----: | -----------: | -----------------------: | ----------------: |
| 2020 (Aug–Dec) | 1 840 | 1 353 | 487 | ≤ 1 353 | 25 min |
| 2021 | 3 156 | 2 222 | 934 | ≤ 2 222 | 40 min |
| 2022 | 33 532 | 20 106 | 13 426 | ≤ 20 106 | 5.5 h |
| 2023 | 4 577 | 2 881 | 1 696 | ≤ 2 881 | 50 min |
| 2024 | 2 324 | 1 486 | 838 | ≤ 1 486 | 25 min |
| 2025 | 1 326 | 898 | 428 | ≤ 898 | 15 min |
| 2026 (to Oct) | 915 | 425 | 490 | ≤ 425 | 7 min |
| **Total** | **47 670** | **29 371** | **18 299** | **≤ 29 371** | **≈ 8 h** |

Only found cards need a detail page (still-wanted ones are already in our feed); fewer in practice, since one page covers every
record of a plate/VIN and placeholder ids (`XXXXXXXX`, `0000`, `*`) are skipped. 2022 (the full-scale invasion) is 2/3 of the
work, so it is split into halves.

## Steps (each one ends verified and committed; a later step can start any day)

The scraper takes a month range: `pnpm ingest:wanted-history --from 2020-08 --to 2021-12` (months **and** details for that
range; `--no-details` = month cards only). Re-running a range is safe: fetched ids are remembered in `wanted_scrape_ids`.

1. **Foundation** (code, no long run) — migration 0074 (§1), `organUnitRegion` + `region` in the feed ingest (§2), the scraper
   with `--from/--to/--no-details`, parsers + HTML-fixture tests (§3), `source = 'feed'` guard in `wanted.ts`. Run
   `pnpm ingest:wanted` (fills `region`) and `pnpm ingest:wanted-history --from 2020-08 --to 2020-08` as a smoke test
   (Aug 2020: 388 cards, 287 found; spot-check `AP1577BP` → removed 2026-04-30).
2. **Backfill 2020–2021** — `--from 2020-08 --to 2021-12` (≈ 1 h).
3. **Backfill 2022 H1** — `--from 2022-01 --to 2022-06` (≈ 3 h; war months dominate).
4. **Backfill 2022 H2** — `--from 2022-07 --to 2022-12` (≈ 2.5 h).
5. **Backfill 2023–2024** — `--from 2023-01 --to 2024-12` (≈ 1.2 h).
6. **Backfill 2025–2026** — `--from 2025-01` (to the current month, ≈ 25 min). From here on, a no-arg run refreshes only the
   last 2 months (daily, after `ingest:wanted`).
   After each backfill step: per-year `SELECT` of stolen / found vs the table above, null `region` share, a few card spot-checks.
7. **Card history** — `wanted.service.ts`: scraped records in lookups, "history since Aug 2020", stolen.in.ua attribution (§3 end).
8. **Stats API** — `GET /api/wanted/stats` + shared Zod contract (§4), service test.
9. **`/wanted` route** — page, sortable tables, map, year chart, recent lists (§5), route title + `STATIC_PAGES`.
10. **Links + docs** — `WantedCheck` link, `/stats` link, home teaser (§5), docs + `releases.ts` (§6).

Steps 2–6 are only data runs (no code), so they can run while 7–10 are built; the page just shows more history as they finish.

### Sessions (start each with "implement session N of WANTED_PLAN.md")

| Session | Steps | Scope |
| ------- | ----- | ----- |
| 1 | 1 | Foundation: migration, region, scraper + tests, Aug 2020 smoke test |
| 2 | 2–6 | Backfill data runs (≈ 8 h, background / can span days) |
| 3 | 7–8 | Card history + stats API |
| 4 | 9 | `/wanted` page |
| 5 | 10 | Links, home teaser, docs, releases |

Mark a step ✅ here when it is done (with the commit), so the next session knows where to resume.

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
