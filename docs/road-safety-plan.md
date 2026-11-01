# Road safety (DTP) stats: regions, roads, causes

Drafted 2026-10-31. **Status: step 0 done, step 1 (migration `0085_road_safety.sql`) written, step 2 half done:** `scripts/src/dtp.ts` + `dtp-parse.ts` load the hazard CSVs (`pnpm ingest:dtp`; dry-run on the real 2025 files: 329 of 329 concentration places, 501 of 505 hazard sections kept). The Patrol Police loader `pnpm ingest:dtp:patrol` (`dtp-patrol.ts` + `dtp-xlsx-parse.ts`, dependency `read-excel-file` 9.3.14, MIT) is written: dry-run on the live page parses 2022-2025 and 2026-09 (24-25 regions, 27-35 causes, 10 types, 31 weekday / hour buckets, 120-236 roads per file). Files before 2022 (`.xls`, and 2020-21 count all crashes) are skipped. Migration not yet applied to any database, nothing loaded yet.

## Findings (verified 2026-10-31)

| Source                                                                                                            | What it is                                                                                                                                       | Licence / cadence                    |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Patrol Police `patrolpolice.gov.ua/statystyka/`                                                                   | XLS (2017-19) / XLSX (2020+): one file per year (2017-2025) + monthly YTD files (2026-01 .. 2026-09). Predictable URLs, no API / dashboard / map | no explicit licence, cite the source |
| Hazardous sections `data.gov.ua/dataset/9b6a7292-b0cd-419e-8143-19da0661edfb` (Infrastructure Restoration Agency) | 3 CSVs (2025): totals, hazardous sections (`roadHazardousAreas`), crash concentration places; XLSX history 2019-2025                             | CC BY, yearly (updated 2026-08-25)   |
| Ukrtransbezpeka `5d02804c-c04b-445b-97f9-71227152f4cb`                                                            | events with licensed carriers (buses, trucks), weekly XLSX                                                                                       | CC BY, **stale since 2023-05, skip** |
| Lviv `dtp2015`                                                                                                    | the only per-crash data found; one city, 2015, last update 2019                                                                                  | CC BY, **skip** (demo at most)       |

Patrol Police file (12.2025.xlsx, 15 sheets) is **pre-aggregated, not crash records**:

- by region (24 oblasts + Kyiv + Sevastopol; occupied ones starred): crashes, deaths, injured;
- by crash type, month, weekday, hour; by cause (~30: speeding, distance, overtaking, drunk, pedestrians, road upkeep...);
- subsets: pedestrians, children, bus drivers, built-up areas, bad road upkeep, state roads;
- per road table keyed by road code (`М-01`, `М-03-01`...) with names.
- **No vehicle type / make / model / year, no coordinates.** So "top 10 models in DTP" is **not possible**: do not fake it from fleet counts.
- Layout differs between years (.xls 2017-19, war-year gaps): parse header-driven, like `scripts/src/transform.ts`.

No national per-crash open dataset with coordinates was found (not proven absent).

## Step 0 results (2026-10-31)

- **Hazard CSVs (2025)** are semicolon-separated, UTF-8 BOM, `;` columns match on every row, English headers but Ukrainian values. `roadHazardousAreas` 505 rows (18 regions), `placesOfConcentration...` 329 rows (22 regions), `total...` 24 regions (no Kyiv city). Columns: region, road index (`М-30`, trailing spaces), road name, km+m start / end, **start / end GPS**, accident count over 3 years; places also has a rate coefficient and hazard level (`null` literal for missing).
- **Coordinates exist but are dirty**: start GPS parses for 482/505 (hazard) and 311/329 (places). Failures: missing or comma-glued numbers (`48.4328426, 364633821`), single value, `lat, lat` instead of `lat lon`. Separators vary (`, ` or space). Parser must validate to Ukraine bbox and drop / flag bad rows, not guess.
- **Road codes** are `М-30`, `Т-02-12`, `Р-15`, `Н-17`; 77 / 83 distinct. Values carry trailing spaces, and the 2020 Patrol file has a **Latin `P`** (`P-17`) where others use Cyrillic `Р`: normalise before joining. Join with Patrol per-road sheet not yet verified on real rows.
- **Patrol sheets**: all workbooks have numeric sheet names (`Зміст`, `2`..`15`); 2020 has 16 sheets, 2022 and 2025 have 15. Titles change: 2020 "ДТП з постраждалими", 2022+ "з загиблими та/або травмованими"; sheet 14 was "незадовільного стану доріг" (+ separate streets sheet 15 in 2020), later "порушення правил утримання". So map by **title text, not sheet index**. `.xls` 2017-19 needs a different reader.
- **No xlsx reader in the repo yet** (no `xlsx` / `exceljs` dependency): ingest CLI will need one (pin the version, check licence).
- **Road join (verified on 12.2025.xlsx)**: the per-road sheet (file `sheet9.xml`; not sheet-index stable) is only a **2024 vs 2025 comparison** per state road: col A code, B name, C/D crashes, F/G deaths, I/J injured, E/H/K % change, header over 3 rows, 236 data rows. 67 of 83 distinct hazard-CSV codes match it. Unmatched: `Т-` roads (`Т-09-06`, `Т-14-01`..), combined labels like `Р-84 (Т-14-19)`, and an empty code. So the join is partial: hazard sections of unmatched roads show without road totals, and codes need a normaliser (trim, Latin to Cyrillic, take the first token).
- **Boundaries**: geoBoundaries gbOpen `UKR/ADM1` (27 units, represents 2017) is **ODbL 1.0, sourced from OpenStreetMap**, not CC BY. Needs "© OpenStreetMap contributors" attribution on the map and in About `SOURCES`; a static choropleth is a produced work, but keep the GeoJSON file itself marked ODbL. The 2017 units still include Crimea and Sevastopol: check the oblast names against `packages/shared` regions at build time. Alternative to evaluate: a UA-specific boundary set (e.g. `alexbabintsev/ua-geo` found in search, licence unverified).
- **Step 0 is done** apart from the licence check on any alternative boundary set.

## Decisions to confirm

1. New route `/safety` (name open), not a section of the plate card: it is region / road data, not vehicle data.
2. Plate card gets only a small region link ("Region X: N crashes in 2025, rank k of 25") back to `/safety`.
3. Region ranking shown both absolute and **per 100k vehicles** (our `registrations` by region as denominator, labelled as registered cars, not drivers).

## Steps

0. ✅ **Checks (no code), done.** Download the hazardous-sections CSVs: do they have coordinates / km range / road code? Confirm the per-road sheet and road codes join with them. Pick 2-3 yearly files and diff the sheet layouts. Decide the region boundary source (GeoBoundaries ADM1 or OSM) and its licence.
1. ✅ **Schema, written (0085, not applied).** New migration `NNNN_road_safety.sql` (backward compatible): `registry.dtp_region_year` (region, year, period `12|01..09`, crashes, deaths, injured, + kids / pedestrians), `registry.dtp_cause_year`, `registry.dtp_type_year`, `registry.dtp_road_year` (road code, name, crashes, deaths, injured), `registry.dtp_hazard_section` (road code, km from/to, kind, year, lat/lon if the CSV has them). Region keys from `packages/shared` regions, never re-implemented.
2. ✅ **Ingest CLIs, written** (`pnpm ingest:dtp` hazard CSVs, `pnpm ingest:dtp:patrol` XLSX 2022+; not yet run against a DB). Original plan: **Ingest CLI** `scripts/src/ingest-dtp.ts` (`pnpm ingest:dtp --dir ...`): resolve file list from the page / CKAN `package_show`, header-driven mapping, Zod on every row, `INSERT ... ON CONFLICT DO NOTHING`, year-to-date files replace the previous YTD for the same year. Ingest-batch tests with a fixture per layout era.
3. ✅ **Seed CSVs, done.** `scripts/src/dtp-csv.ts`: `pnpm export:dtp:csv` / `pnpm ingest:dtp:csv` (one `seed-data/dtp-<table>.csv.gz` per table, columns from the Drizzle table; also in `ingest:ratings:csv`). Re-export after every `ingest:dtp*` run. **Production:** the ingest image carries only these six files (`.dockerignore` excludes the rest of `seed-data`); the first VPS load is `run-ingest.sh dtp-seed` (2026-11-01: `/road-safety` 404'd until then, the crons only fire on the 5th / 10 Feb). A new seed CSV needed on the VPS must be allowed in `.dockerignore` the same way. The per-100k map needs `stats_region_facet` (fleet): on a VPS where it is empty, `run-ingest.sh region-facet`. Hazard years are their own list, so the hazards request for a crash year without hazard data 404s (the section hides itself; console noise only).
4. ✅ **API, done** in `apps/api/src/road-safety/` (not `safety/`: that is the vehicle crash-rating feature on `/api/safety`): `GET /api/road-safety/regions | roads | causes | time | hazards`; `?year=` defaults to the latest full year; `hazards` also takes `region` (a `REGION_NAMES` value) and `kind`. `STATS_CACHE` via `lookupCacheInterceptor` (success only, so 400 / 404 are not edge-cached), class-level `@Throttle(ROAD_SAFETY_THROTTLE)`, pure ranking in `helpers.ts` (tested). Cloudflare Cache Rule expression in `docs/deploy.md` already lists `/api/road-safety/` but **the rule itself must be edited in the dashboard**. Not in `PUBLIC_API_PATH_PREFIXES` (decide with the legal review).
5. ✅ **Contracts, done** in `packages/shared/src/roadSafety.ts` (own file, exported from the index).
6. ✅ **Web `/road-safety`, done (2026-11-01; `/safety` was taken by the vehicle ratings):** `max-w-6xl`; chips (most dangerous regions per 100k and absolute, roads by deaths, top causes, peak hour / weekday); year selector; `LazySection`s, new shareable ones listed in `sections`. Offline: add queries to `lib/offline-cache.ts` only if wanted.
7. ✅ **Region map, done** (reuses `StatsMap`, so no new boundary file; hazard points are drawn later by `HazardMap`, roads are not). Original: region choropleth first (static simplified GeoJSON in `apps/web`, own chunk via `HELPER_GROUPS` if lazy). Roads / hazard points only if step 0 shows coordinates (OSM `ref` geometry via a one-off Overpass export, not live).
8. ✅ **Plate-card link, done (2026-11-01):** `components/RegionCrashChip.tsx` in `ResultCard` next to `TopStatBadges`, data from `roadSafetyRegionsQuery()`, pure `regionCrashFact` in `routes/road-safety/helpers.ts` (tested). Online-only, no offline-cache entry. `/cars` untouched.
9. ✅ **Site plumbing, done** (About `SOURCES` `patrolPolice` + `irsu`, route title, `STATIC_PAGES`, i18n, release, docs): `ROUTE_TITLE_KEYS`, `STATIC_PAGES` ua/ru/en in `spa-text.ts`, i18n ua/ru/en (no em dash in UI strings), About `SOURCES` + `about.source.*` + `about.feature.*`, `releases.ts` entry (+ `releases/latest.ts`), `docs/features-reference.md` section, `docs/plan-done.md` write-up.
10. ✅ **Refresh job, written (2026-11-01, not deployed):** jobs `dtp-patrol` (`tsx src/dtp-patrol.ts`, cron the 5th 05:35) and `dtp-hazards` (`tsx src/dtp.ts`, 10 Feb 05:45) in `scripts/src/jobs.ts` + `infra/vps/ingest.cron`; healthchecks `HC_PING_DTP_PATROL` / `HC_PING_DTP_HAZARDS` wired in `deploy-ingest.yml` (the checks and GitHub secrets still have to be created, see `docs/deploy.md` step 8). A no-op run rewrites the same rows. Seed CSVs are re-exported locally by hand (`pnpm export:dtp:csv`) after a real change.
11. ✅ **Footnotes, done** on the page: occupied regions are starred and war years have gaps; "crashes with injured / killed" only; not a per-model risk.

## Later / optional

- Per-model safety stays on Euro NCAP / NHTSA (already in the project); IIHS death rates by model are US-only, label as such.
- Formal information request to Patrol Police / MIA for the crash card (vehicle type, make, coordinates). Only then per-model is conceivable, and it needs fleet-exposure normalisation.
- Other sources checked and not used: State Statistics SDG 3.6.1 (national deaths per 100k, 2022-23 suspended), Texty Kyiv 2011 (one-off).

## Handoff (next session)

Done, uncommitted: steps 0-5 (migration 0085 applied on the local DB, both ingests run, seed CSVs exported, API + contracts, tests green). Local load (2026-10-31): 2022-25 + 2026 YTD (period 9) in `dtp_*_year`; 2025 = 25 934 crashes, **3 249 deaths**, 31 898 injured (the 2 700-3 000 estimate was low: 2022 2 791, 2023 3 053, 2024 3 202); hazard 2025 = 505 + 329 rows. Region sets: 24-25 per year; Crimea and Sevastopol never appear, Luhansk only in 2022 and 2024 (the source omits it), Kyiv city has no hazard rows. The 4 formerly invalid hazard rows are city bypasses with an empty road index (Kropyvnytskyi, Lviv): now kept with `road_code = ''` (they simply do not join to road totals).

**Session 2026-11-01 (uncommitted):** steps 6, 7, 9 and 11 done. `/road-safety` page in `apps/web/src/routes/road-safety/` (route name: `/safety` is the vehicle crash-ratings page), queries in `lib/queries.ts`, map via the existing `StatsMap` (geoBoundaries ODbL, region names already match `REGIONS`). Hazardous sections are served by `GET /api/road-safety/hazards` and shown as a list and a map. Docs: `features-reference.md` "Road crash statistics", `plan-done.md`, PLAN.md ✅.

**Session 2 (2026-11-01, uncommitted):** steps 8 and 10 done; the `dtp-xlsx-parse.ts` irregular-whitespace lint error fixed. Also done: source strip, facts block, fleet correlation scatter and a hazard-section list (step 3 optional, list and map views). Not code: create the two healthchecks.io checks (dtp-patrol 35 d + 3 d grace, dtp-hazards 400 d + 7 d grace) and the GitHub secrets, then re-run `deploy-ingest`; edit the Cloudflare Cache Rule in the dashboard (expression in `docs/deploy.md`); decide with the legal review whether `/api/road-safety` joins `PUBLIC_API_PATH_PREFIXES`. Per-100k uses today's fleet for every year (labelled on the page).

## Your to-do (not code)

1. ✅ **Commit** the road-safety work (done, the tree is clean of it).
2. **healthchecks.io:** create `dtp-patrol` (period 35 d, grace 3 d) and `dtp-hazards` (period 400 d, grace 7 d); copy each ping URL.
3. **GitHub secrets** (`production` environment): `HC_PING_DTP_PATROL`, `HC_PING_DTP_HAZARDS`; then re-run `deploy-ingest` (installs the crontab entries and the env). Verify with `crontab -l` and `~/ingest-status.sh` on the VPS.
4. ✅ **First production load (done, verified 2026-11-01: `/api/road-safety/regions` returns 2025 data with fleet counts):** run `run-ingest.sh dtp-patrol` and `run-ingest.sh dtp-hazards` once by hand (the tables are empty on the VPS until then; migration 0085 must be applied by the api deploy first). Check `SELECT * FROM registry.job_runs ORDER BY id DESC`.
5. ✅ **Cloudflare Cache Rule (done 2026-11-01, verified MISS then HIT):** add `/api/road-safety/` to the rule expression in the dashboard (expression in `docs/deploy.md`), then verify MISS then HIT on `/api/road-safety/regions`.
6. **Legal review:** decide whether `/api/road-safety` joins `PUBLIC_API_PATH_PREFIXES` (the Patrol Police data has no explicit licence).
7. **After the first real cron run that changes data:** locally `pnpm ingest:dtp:patrol` / `pnpm ingest:dtp`, then `pnpm export:dtp:csv` so the seed CSVs match.
8. **Look at the page once** in production (`/road-safety`, dark and light theme, phone width): scatter, facts, hazard map. Light theme at phone width checked 2026-11-01 (sources, year chips, map, facts fine); dark theme and desktop still open.
9. **Open product questions:** a formal information request to the Patrol Police / MIA for vehicle-level crash data (see "Later / optional"); whether the roads and causes sections should become shareable (`?section=`).
