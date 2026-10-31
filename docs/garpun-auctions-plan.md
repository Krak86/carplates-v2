# Garpun wanted plates + SETAM auctions

Drafted 2026-10-31 (research only, no code yet). Two new `data.gov.ua` sources (both CC BY, updated daily):

- **Garpun** `data.gov.ua/dataset/licplatewanted` - National Police list of wanted **plates**.
- **SETAM auctions** `data.gov.ua/dataset/eda4e3cf-0dda-46a1-a78a-ee264ebbfe97` - lots of seized / confiscated property (Cabinet Resolution 835).

## Findings (verified 2026-10-31)

### Garpun vs the existing wanted table

|         | `registry.wanted_vehicles` (CarsWanted, dataset `2cd12755…`)                 | Garpun `licplatewanted`                                                |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Meaning | a **vehicle** is wanted for unlawful taking                                  | a **plate** is wanted                                                  |
| Rows    | 79 291 (≈102 k in our table incl. stolen.in.ua history)                      | 20 181 (20 040 distinct plates, 7 rows with null plate)                |
| Fields  | brand, model, type, colour, plate, body no. (VIN), chassis, theft date, unit | `id`, `vehiclenumber`, `illegalseizuredate`, `organunit`, `insertdate` |

- Overlap: only **41** of 20 040 Garpun plates are in CarsWanted. They are different facts, use both.
- ~10 200 rows are 2022 Luhansk police entries (probably occupation-related); some dates are bogus (1530, 1950). A wanted plate is **not** proof that this car is stolen (lost / cloned plates).
- JSON, ~3 MB. Download: `…/resource/daa2b17a-8943-423f-b6c8-43b5dea10cb2/download/licplatewanted.json` (resolve through CKAN `package_show`, do not hard-code).

### SETAM auctions

- 55 monthly CSVs (2019-11 → 2026-10), 211 629 lots total. Columns: `Назва, Стан, Категорія, Місцезнаходження, Переможець, Номер лота, Стартова ціна, Ціна продажу, Провадження`.
- Resource labels do not match file names (`auctions-07.2026` → `…31-08-2026.csv`): **always list files from CKAN `package_show`**. Only the newest file changes daily.
- Car-related categories: `Легкові автомобілі` 20 675 lots, `Вантажні автомобілі` 6 486; `Водний транспорт` 994 (boats, no plate/VIN: skip). Everything else (flats, land, phones…) is dropped.
- Title is free text: `Транспортний засіб SUBARU FORESTER, 2007 року випуску, № кузова: JF1SG5LE58G145231, ДНЗ: АА 2335 ЕТ`.
  ~90 % of vehicle lots carry a plate or a 17-char VIN (≈25 k lots). Statuses seen: `Торги відбулися` (sold, ~3.8 k with plate/VIN), `Торги не відбулися`, `Торги зупинено`, `Торги припинено`.
- `Переможець` is only "Учасник №N": do not store. `Номер лота` is unique per lot; a re-listed car gets a new lot, so the card shows a list of lots.
- Counts above were from loose regexes: the real parser must use `normalizePlate` + VIN checksum and keep the raw title.

### Other open data

- Prozorro.Sale has a public open-data API (openprocurement GitHub org, vehicles = CAV prefix `34`), but it mainly covers state property / privatisation, and `public.api.openprocurement.org/api/2.5/auctions` returned 404 on 2026-10-31. **Not in scope**; revisit only after the endpoint is verified and vehicle volume is shown.
- SETAM's own API is for Prozorro.Sale-connected platforms, not public. Bill 11139 (move seized-asset auctions to Prozorro.Sale) - status not verified.
- No reusable foreign auction open data found (NYC list has no licence, DR seized vehicles is ODC-By; Poland / Czechia / UK / GSA not searched).

## Decisions (user, 2026-10-31)

1. Garpun and CarsWanted share **one wanted section** on the card; explain what each list is; extra **"Garpun" chip** when the plate is in that list.
2. Auctions get their **own card section** showing everything about each lot (auction id etc.), plus a short history of Ukrainian auctions, a comparison with world practice, and links to where users can take part.
3. Garpun ingest runs daily in the same slot as `wanted`.
4. Auction ingest runs daily.
5. Garpun and auction data go into existing stats where it fits, and a **new `/auctions` route** lists all auction vehicle lots with filter / sort.
6. After implementation give example plates / VINs for Garpun and auctions.

## Steps (each ends verified; a later step can start any day)

Read first: `docs/features-reference.md` "Wanted vehicles (stolen check)", "Auction history", "Agent discovery, edge cache, Zod and CSP"; `SCHEDULE.md`; `scripts/src/wanted.ts` (pattern to copy).

1. [x] **Garpun: DB + ingest** (done 2026-10-31: migration 0083, 20 174 rows / 20 040 plates loaded locally, 46 plates also in `wanted_vehicles`, all rows got a region). Migration `NNNN_wanted_plates.sql` -> `registry.wanted_plates` (`source_id` PK, `plate` normalized, `seized_at`, `inserted_at`, `organ_unit`, `region` via `organUnitRegion`, `first_seen_at`, `resolved_at`). Own table, not `wanted_vehicles` (no VIN/brand). `scripts/src/wanted-plates.ts` + `pnpm ingest:wanted-plates`: resolve the file through CKAN, Zod-parse rows, skip null plates, clamp absurd dates, upsert, set `resolved_at` for rows missing from the feed, refuse a feed under ~5 000 rows. Tests for the parser. Add to `backup.sh` `IRREPLACEABLE` (resolved history cannot be re-created).
2. [x] **Garpun: API + card** (done 2026-10-31; `releases.ts` entry deliberately left for step 3, when the VPS gets data. Not checked in a browser, only API + tests). Add `plates: []` next to the vehicle records in `packages/shared/src/wanted.ts` (own file, `.nullable().optional()`), `wanted.service.ts` lookup by `normalizePlate`. In `WantedCheck.tsx` / `WantedChip.tsx`: vehicle records first, then a "Wanted plate" block, a Garpun chip, and an explainer (what each list is; plate-only match is not proof; check the VIN). ua/ru/en strings (no em dash in UI text). Update the `export-verify.ts` wanted section + sources, `/about` (`about.feature.*`, `SOURCES`, `about.source.*`).
3. [x] **Garpun: schedule** (done 2026-10-31; `run-job.ts wanted-plates` ran ok locally in 4 s and wrote a `job_runs` row; `releases.ts` item added). `jobs.ts` + `run-ingest.sh` job `wanted-plates`; `infra/vps/ingest.cron` at 04:45 (after `wanted` 04:40); `SCHEDULE.md`, `docs/deploy.md`, healthchecks note. Seed CSV only if it turns out to be non-re-scrapable (it is not: skip).
4. [ ] **Auctions: DB + parser.** Migration -> `registry.auction_lots` (`lot_no` PK, `proceeding_no`, `status`, `category`, `region`, `start_price`, `sale_price`, `title_raw`, `plate`, `vin`, `make`, `model`, `year`, `source_file`, `first_seen_at`, `updated_at`); indexes on `plate`, `vin`, `(make, model)`, `status`. `scripts/src/auctions.ts` (+ `auctions-parse.ts`): CKAN file list, only `Легкові` / `Вантажні` categories, parse title with `normalizePlate` + VIN checksum, keep lots without plate/VIN (for stats), never store `Переможець`. Fixture tests built from real titles (several title formats). Run a full backfill locally, report counts of parsed / unparsed. Not in seed CSVs (re-ingestable).
5. [ ] **Auctions: schedule.** Job `auctions`, daily 04:55 (newest 1-2 files only; full backfill by flag). Same doc updates as step 3.
6. [ ] **Auctions: API + card section.** `apps/api/src/auctions/` (Zod inputs, no logic in controllers, `@Inject`): lookup by plate / VIN, lots newest first. Contract in its own file `packages/shared/src/auctions.ts`. New lazy `LazySection` "Ukrainian auctions" (list its id in `sections`) on the plate card and the VIN page, a "From auction" label/chip, all lot data, a short history of Ukrainian auctions (SETAM, Prozorro.Sale, bill 11139 - verify its status first), a comparison with world practice (US police / government auctions, UK police and DVLA, salvage auctions like Copart / IAAI; source the facts, static copy), and links to where to take part (`setam.net.ua`, `prozorro.sale`; verify URLs in a browser). `docs/features-reference.md` section, About entries, `releases.ts` (`new` item; bump `releases/latest.ts` on a new day).
7. [ ] **Stats.** `/wanted`: add Garpun series/tab (by year, region, police unit; no brand split). New public route `/auctions` (`apps/web/src/routes/auctions/`): TanStack table over all vehicle lots, filters (make, model, year, region, status, price range, type), sort, header stats (sold vs not sold, avg discount from start price, by region / brand), rows link to plate / VIN page. Route checklist from CLAUDE.md: `ROUTE_TITLE_KEYS`, `STATIC_PAGES` ua/ru/en in `spa-text.ts`, `max-w-6xl`, `@Throttle`, `common/cache.ts` headers + Cloudflare Cache Rule + `PUBLIC_API_PATH_PREFIXES`, `llms.txt`, sitemap test.
8. [ ] **Examples + close-out.** Query the DB for real example plates / VINs (a Garpun-only plate, a plate in both lists, a car with several lots, a sold lot with price, a VIN-only lot) and give them to the user. `docs/plan-done.md` write-up, `PLAN.md` one-line ✅, suggested commit message(s).
9. [ ] **Later / optional:** verify the Prozorro.Sale API and vehicle volume; foreign auction open data (search Poland, Czechia, UK, GSA separately).

## Open questions

- Auction card label: show all lots, or highlight only held auctions (`Торги відбулися`, with a sale price) and show the rest as "listed, not sold"? (default: all lots, sold ones highlighted)
- Does the lot number build a working SETAM lot URL? (verify in a browser; if not, link the SETAM home)
