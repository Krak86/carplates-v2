# Garpun wanted plates + SETAM auctions

Drafted 2026-10-31. **Status: Garpun (steps 1-3) done (2026-10-31, locally verified; check `git log` for what is committed / deployed); auctions steps 4-5 done (2026-10-31), steps 6-8 not started.** Two new `data.gov.ua` sources (both CC BY, updated daily):

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
2. [x] **Garpun: API + card** (done 2026-10-31; not checked in a browser, only API + tests; a follow-up added `platesCheckedAt` / `platesTrackedSince` so the Garpun block has its own refresh / tracked-since lines). Add `plates: []` next to the vehicle records in `packages/shared/src/wanted.ts` (own file, `.nullable().optional()`), `wanted.service.ts` lookup by `normalizePlate`. In `WantedCheck.tsx` / `WantedChip.tsx`: vehicle records first, then a "Wanted plate" block, a Garpun chip, and an explainer (what each list is; plate-only match is not proof; check the VIN). ua/ru/en strings (no em dash in UI text). Update the `export-verify.ts` wanted section + sources, `/about` (`about.feature.*`, `SOURCES`, `about.source.*`).
3. [x] **Garpun: schedule** (done 2026-10-31; `run-job.ts wanted-plates` ran ok locally in 4 s and wrote a `job_runs` row; `releases.ts` item added). `jobs.ts` + `run-ingest.sh` job `wanted-plates`; `infra/vps/ingest.cron` at 04:45 (after `wanted` 04:40); `SCHEDULE.md`, `docs/deploy.md`, healthchecks note. Seed CSV only if it turns out to be non-re-scrapable (it is not: skip).
4. [x] **Auctions: DB + parser** (done 2026-10-31: migration 0084, `pnpm ingest:auctions [--all|--files N|--dry-run|--file]`, 20 parser tests, full local backfill = **16 866 distinct vehicle lots** from 27 161 vehicle rows / 211 629 rows in 55 files; 16 263 with a plate, 14 978 with a VIN, 97 with neither, 16 622 with a make, 16 477 with a year, 4 686 with a sale price; 7 814 lot plates and 6 974 lot VINs exist in `registry.registrations`; a second run changes 0 rows). Original spec: Migration -> `registry.auction_lots` (`lot_no` PK, `proceeding_no`, `status`, `category`, `region`, `start_price`, `sale_price`, `title_raw`, `plate`, `vin`, `make`, `model`, `year`, `source_file`, `first_seen_at`, `updated_at`); indexes on `plate`, `vin`, `(make, model)`, `status`. `scripts/src/auctions.ts` (+ `auctions-parse.ts`): CKAN file list, only `Легкові` / `Вантажні` categories, parse title with `normalizePlate` + VIN checksum, keep lots without plate/VIN (for stats), never store `Переможець`. Fixture tests built from real titles (several title formats). Run a full backfill locally, report counts of parsed / unparsed. Not in seed CSVs (re-ingestable).
5. [x] **Auctions: schedule** (done 2026-10-31; `run-job.ts auctions` ran ok locally in 3 s and wrote a `job_runs` row; cron 04:55; no `releases.ts` item yet, it ships with the card in step 6). Original spec: Job `auctions`, daily 04:55 (newest 1-2 files only; full backfill by flag). Same doc updates as step 3.
6. [ ] **Auctions: API + card section.** `apps/api/src/auctions/` (Zod inputs, no logic in controllers, `@Inject`): lookup by plate / VIN, lots newest first. Contract in its own file `packages/shared/src/auctions.ts`. New lazy `LazySection` "Ukrainian auctions" (list its id in `sections`) on the plate card and the VIN page, a "From auction" label/chip, all lot data, a short history of Ukrainian auctions (SETAM, Prozorro.Sale, bill 11139 - verify its status first), a comparison with world practice (US police / government auctions, UK police and DVLA, salvage auctions like Copart / IAAI; source the facts, static copy), and links to where to take part (`setam.net.ua`, `prozorro.sale`; verify URLs in a browser). `docs/features-reference.md` section, About entries, `releases.ts` (`new` item; bump `releases/latest.ts` on a new day).
7. [ ] **Stats.** `/wanted`: add Garpun series/tab (by year, region, police unit; no brand split). New public route `/auctions` (`apps/web/src/routes/auctions/`): TanStack table over all vehicle lots, filters (make, model, year, region, status, price range, type), sort, header stats (sold vs not sold, avg discount from start price, by region / brand), rows link to plate / VIN page. Route checklist from CLAUDE.md: `ROUTE_TITLE_KEYS`, `STATIC_PAGES` ua/ru/en in `spa-text.ts`, `max-w-6xl`, `@Throttle`, `common/cache.ts` headers + Cloudflare Cache Rule + `PUBLIC_API_PATH_PREFIXES`, `llms.txt`, sitemap test.
8. [ ] **Examples + close-out.** Query the DB for real example plates / VINs (a Garpun-only plate, a plate in both lists, a car with several lots, a sold lot with price, a VIN-only lot) and give them to the user. `docs/plan-done.md` write-up, `PLAN.md` one-line ✅, suggested commit message(s).
9. [ ] **Later / optional:** verify the Prozorro.Sale API and vehicle volume; foreign auction open data (search Poland, Czechia, UK, GSA separately).

## Notes from steps 1-3 (for the next session)

- **Pattern to copy for auctions:** `scripts/src/wanted-plates.ts` (CKAN `package_show` -> pick the data resource, Zod rows, `--dry-run` / `--file`, min-rows guard) + `wanted-plates-parse.ts` (pure parser, tested). Job wiring: `scripts/src/jobs.ts` (+ `jobs.test.ts`), `infra/vps/ingest.cron`, `run-ingest.sh` comment, `deploy-ingest.yml` (`HC_PING_<JOB>` env + `emit`), `SCHEDULE.md` row, `docs/deploy.md` (job list, healthchecks secrets, backup table only if irreplaceable). Next migration number is **0084**.
- **CKAN ids:** `package_show?id=<slug>` works with the dataset slug, but the resource URLs it returns use the package UUID (`f64d6668…` for Garpun), so always take URLs from CKAN. The Garpun package also lists a `…_schema.json` resource: filter it out. Check the same for the SETAM package (55 monthly CSVs, labels do not match file names).
- **`@carplates/db` and `@carplates/shared` are consumed from `dist/`:** after editing either, run `pnpm --filter @carplates/db build` / `pnpm --filter @carplates/shared build` before running scripts or the API (a stale dist gives "does not provide an export named …").
- **Local DB:** Docker `carplates-v2-postgres-1` (real registry, 24.7 M rows; `registry.wanted_plates` has 20 174 rows). `pnpm db:migrate` applies pending migrations. No `psql` on the host: `docker exec carplates-v2-postgres-1 sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -f /tmp/x.sql'` (copy the .sql with `docker cp`). API runs on `localhost:3000` (tsx watch).
- **Windows shell gotchas:** curl mangles Cyrillic query args (use node `fetch` + `encodeURIComponent`); bash heredocs with backticks / apostrophes break (write a script file with the Write tool); never `grep -r .` over the repo (node_modules, minutes: use the Grep tool with a glob).
- **Garpun facts:** 46 plates are in both lists. History starts at our first run (no scraped history); the feed does not say why a plate left. Seed CSV deliberately skipped (live feed; `wanted_plates` is in `backup.sh` `IRREPLACEABLE`). The `releases.ts` item for Garpun is already in the 2026-10-31 day (`latest.ts` already = 2026-10-31; a new day needs a bump).
- **Deploy order for Garpun:** merge -> API deploy runs migration 0083 (empty table) -> `deploy-ingest` installs the 04:45 cron -> run `run-ingest.sh wanted-plates` once on the VPS so the card has data (else empty until the next 04:45). Optional: create healthchecks.io check + GitHub secret `HC_PING_WANTED_PLATES`.
- **Test plates for the UI** (local data, may drop off the daily list): Garpun only АЕ5610ІН, АА5995ЕЕ, СЕ5959YА; both lists АР3605СХ, АР7754СМ; vehicle list only ВВ0344ZА; clean АА1234ВВ.
- **Never-erase rule:** auctions are additive tables only; do not touch `registry.registrations` / `ingested_resources`.

## Notes from step 4 (auctions DB + parser, for the next session)

- **Counts:** the "~25 k lots" in Findings were ROWS: the monthly files repeat a lot as its status changes, so there are **16 866 distinct vehicle lots** (12 933 Легкові, 3 933 Вантажні). Statuses stored: `Торги не відбулися` 9 490, `Торги відбулися` 4 016, `Реєстрація учасників` 1 717 (open now), `Торги припинено` 926, `Складання акту` 316, `Очікування сплати` 292, `Торги зупинено` 109. Lots with a sale price: 4 686 (sold + awaiting payment / act + a few annulled), so "sold" in the UI = `sale_price IS NOT NULL`, not only `Торги відбулися`. `Підписання протоколу` / `Відбуваються торги` exist in the feed but have no vehicle lot right now.
- **Files / CKAN:** 55 CSV resources, no schema file. Order = CKAN `last_modified` (not URL, not label). Daily default = newest 2 files (`--files N`), `--all` = backfill (~1 min). Header variants: 8 columns (until 2021-03), `Проовадження` typo (2021-04 … 2023-02), `Провадження`; the parser is header-name driven and throws on a missing required column. Winner column is never read.
- **Parser** (`scripts/src/auctions-parse.ts`): plate = labelled value (ДНЗ, д.н.з., д/н, р.н., реєстраційний номер, держ. номер, номерний знак …) else a bare current-series / Soviet-letter / dashed plate, through `normalizePlate` (foreign plates stay mixed-script, e.g. `ЕL9N097`, harmless). VIN = a 17-char token after folding Cyrillic look-alikes (`denormalizePlate`) and repairing O/Q -> 0, I -> 1, then `isVin` (alphabet only; no check digit, EU VINs fail it) - short chassis numbers are NOT stored as VIN. Make = curated spelling table `MAKES` (≈110 makes incl. typos and Cyrillic spellings; Cyrillic-native makes stay Cyrillic: ВАЗ, ГАЗ, УАЗ, ЗАЗ …; `VAZ` -> `ВАЗ`), model = text after the make (uppercased, engine size cut). Extend `MAKES` when a frequent miss shows up (`eval` idea: lots with `make IS NULL`, group by first words of `title_raw`). ~2 % of lots have no make (rare brands, multi-vehicle lots "Транспортні засоби в кількості N").
- **DB:** `registry.auction_lots`, `lot_no` integer PK, prices `numeric(14,2)` read as JS numbers (`mode: 'number'`); `sale_price` NULL when 0.00. Upsert updates only rows that really changed (`setWhere … IS DISTINCT FROM`), so `updated_at` = last real change. `region` = same region names as plates (`Київ`, `Вінницька область`). Not in seed CSVs / `backup.sh` (re-ingestable from the feed; nothing the feed does not give back).
- **Folding trap:** fold look-alikes only on the make match / the found model name, never on the whole tail (the Cyrillic stop words "модель", "року" must stay Cyrillic).
- **Deploy order for auctions:** merge -> API deploy runs migration 0084 (empty table) -> `deploy-ingest` installs the 04:55 cron -> run the backfill ONCE on the VPS (`docker compose run --rm --no-deps -T ingest tsx src/auctions.ts --all`, from `/opt/carsua/compose` with `COMPOSE_FILE=docker-compose.prod.yml`; `run-ingest.sh auctions` only loads the newest 2 files). Optional: healthchecks.io check + GitHub secret `HC_PING_AUCTIONS`.

## Answered questions (user, 2026-10-31)

- Auction card: **show all lots, sold ones highlighted** ("sold" = `sale_price IS NOT NULL`; the rest listed as not sold / open / stopped).
- Lot link: **link the SETAM home page** (`setam.net.ua`); no per-lot URL until a pattern is verified in a browser.
