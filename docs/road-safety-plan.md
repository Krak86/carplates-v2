# Road safety (DTP) stats: regions, roads, causes

Drafted 2026-10-31. **Status: research done, nothing built.** Plan only; build after the step 0 checks.

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

## Step 0 results (2026-10-31, partial)

- **Hazard CSVs (2025)** are semicolon-separated, UTF-8 BOM, `;` columns match on every row, English headers but Ukrainian values. `roadHazardousAreas` 505 rows (18 regions), `placesOfConcentration...` 329 rows (22 regions), `total...` 24 regions (no Kyiv city). Columns: region, road index (`М-30`, trailing spaces), road name, km+m start / end, **start / end GPS**, accident count over 3 years; places also has a rate coefficient and hazard level (`null` literal for missing).
- **Coordinates exist but are dirty**: start GPS parses for 482/505 (hazard) and 311/329 (places). Failures: missing or comma-glued numbers (`48.4328426, 364633821`), single value, `lat, lat` instead of `lat lon`. Separators vary (`, ` or space). Parser must validate to Ukraine bbox and drop / flag bad rows, not guess.
- **Road codes** are `М-30`, `Т-02-12`, `Р-15`, `Н-17`; 77 / 83 distinct. Values carry trailing spaces, and the 2020 Patrol file has a **Latin `P`** (`P-17`) where others use Cyrillic `Р`: normalise before joining. Join with Patrol per-road sheet not yet verified on real rows.
- **Patrol sheets**: all workbooks have numeric sheet names (`Зміст`, `2`..`15`); 2020 has 16 sheets, 2022 and 2025 have 15. Titles change: 2020 "ДТП з постраждалими", 2022+ "з загиблими та/або травмованими"; sheet 14 was "незадовільного стану доріг" (+ separate streets sheet 15 in 2020), later "порушення правил утримання". So map by **title text, not sheet index**. `.xls` 2017-19 needs a different reader.
- **No xlsx reader in the repo yet** (no `xlsx` / `exceljs` dependency): ingest CLI will need one (pin the version, check licence).
- **Open**: per-road sheet row-level join, region boundary source and licence.

## Decisions to confirm

1. New route `/safety` (name open), not a section of the plate card: it is region / road data, not vehicle data.
2. Plate card gets only a small region link ("Region X: N crashes in 2025, rank k of 25") back to `/safety`.
3. Region ranking shown both absolute and **per 100k vehicles** (our `registrations` by region as denominator, labelled as registered cars, not drivers).

## Steps

0. **Checks (no code).** Download the hazardous-sections CSVs: do they have coordinates / km range / road code? Confirm the per-road sheet and road codes join with them. Pick 2-3 yearly files and diff the sheet layouts. Decide the region boundary source (GeoBoundaries ADM1 or OSM) and its licence.
1. **Schema.** New migration `NNNN_road_safety.sql` (backward compatible): `registry.dtp_region_year` (region, year, period `12|01..09`, crashes, deaths, injured, + kids / pedestrians), `registry.dtp_cause_year`, `registry.dtp_type_year`, `registry.dtp_road_year` (road code, name, crashes, deaths, injured), `registry.dtp_hazard_section` (road code, km from/to, kind, year, lat/lon if the CSV has them). Region keys from `packages/shared` regions, never re-implemented.
2. **Ingest CLI** `scripts/src/ingest-dtp.ts` (`pnpm ingest:dtp --dir ...`): resolve file list from the page / CKAN `package_show`, header-driven mapping, Zod on every row, `INSERT ... ON CONFLICT DO NOTHING`, year-to-date files replace the previous YTD for the same year. Ingest-batch tests with a fixture per layout era.
3. **Seed CSVs** + `pnpm export:dtp:csv` (scraped-table convention, so a new setup loads the CSV).
4. **API** `apps/api/src/safety/`: `GET /api/safety/regions`, `/roads`, `/causes`, `/hazards`; Zod inputs, no logic in controllers, `@Inject` tokens, `common/cache.ts` headers, Cloudflare Cache Rule + `PUBLIC_API_PATH_PREFIXES`, `@Throttle`.
5. **Contracts** in their own file `packages/shared/src/safety.ts` (new fields `.nullable().optional()`), rebuild `@carplates/shared`.
6. **Web `/safety`**: `max-w-6xl`; chips (most dangerous regions per 100k and absolute, roads by deaths, top causes, peak hour / weekday); year selector; `LazySection`s, new shareable ones listed in `sections`. Offline: add queries to `lib/offline-cache.ts` only if wanted.
7. **Map.** Region choropleth first (static simplified GeoJSON in `apps/web`, own chunk via `HELPER_GROUPS` if lazy). Roads / hazard points only if step 0 shows coordinates (OSM `ref` geometry via a one-off Overpass export, not live).
8. **Plate-card link** (region badge) + `/cars` is untouched.
9. **Site plumbing**: `ROUTE_TITLE_KEYS`, `STATIC_PAGES` ua/ru/en in `spa-text.ts`, i18n ua/ru/en (no em dash in UI strings), About `SOURCES` + `about.source.*` + `about.feature.*`, `releases.ts` entry (+ `releases/latest.ts`), `docs/features-reference.md` section, `docs/plan-done.md` write-up.
10. **Refresh job**: monthly check for the new `NN.2026.xlsx`, yearly for the hazardous-sections resource; healthcheck like the other crons.
11. **Footnotes**: occupied regions are starred and war years have gaps; "crashes with injured / killed" only; not a per-model risk.

## Later / optional

- Per-model safety stays on Euro NCAP / NHTSA (already in the project); IIHS death rates by model are US-only, label as such.
- Formal information request to Patrol Police / MIA for the crash card (vehicle type, make, coordinates). Only then per-model is conceivable, and it needs fleet-exposure normalisation.
- Other sources checked and not used: State Statistics SDG 3.6.1 (national deaths per 100k, 2022-23 suspended), Texty Kyiv 2011 (one-off).
