# DATASETS_PLAN.md

Research (2026-10-07) on four external GitHub datasets and how they could enrich result cards and `/stats`.
**Status (2026-10-07): VehiclesDB is built end to end** (catalog, matcher, API, result-card chips, `/stats` panel, About
credit) — see "VehiclesDB — built" below and the write-up in `docs/plan-done.md` ("VehiclesDB cross-market data").
gor3a/autoevolution is still **blocked on a reply**; carguru and sortedcars are skipped. Phase/priority context lives in
`PLAN.md`; this file only tracks this thread.
**Round 2 (2026-10-07):** licences checked for RDW, NHTSA recalls/complaints, UK MOT, Transport Canada, Open EV Data,
Eurostat, ANCAP/Latin NCAP — see "Round 2 — what can be built, what is skipped" below.

## Decisions

- **Use everything we can** while the site is localhost-only. Build each source as a **separate, removable block**
  (own tables, own ingest scripts, own result-card section, own i18n keys) so it can be switched off or deleted
  if a source's permission is refused or never arrives.
- **Gate before any deploy (Phase 4 / VPS):** every source below must have a documented license or written
  permission, and attribution on the About sources page. Anything unresolved is hidden or removed first.
- autoevolution-derived data (gor3a) is **not ingested until we have a reply** — see below. VehiclesDB is clear to use.

## Sources at a glance

| Source                                                                            | What                                                                   | License                                       | Verdict                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| [vehiclesdb/vehiclesdb](https://github.com/vehiclesdb/vehiclesdb)                 | Make/model catalog, popularity deciles, markets                        | CC-BY 4.0 (visible attribution)               | **Use** (see below)                                   |
| [gor3a/vehicle-makes-models](https://github.com/gor3a/vehicle-makes-models)       | Generations + engine variants + specs (hp, torque, dimensions, weight) | ODbL 1.0, but compiled from autoevolution.com | **Pending autoevolution reply**                       |
| [rebrowser/carguruscom-dataset](https://github.com/rebrowser/carguruscom-dataset) | Scraped US used-car listings                                           | Non-commercial, paid commercial               | **Skip** — US-only, dealer/price data, nothing for UA |
| [visnkmr/sortedcars](https://github.com/visnkmr/sortedcars)                       | ~20 brands' dimensions, India-heavy, TS objects                        | AGPL-3.0, proprietary data                    | **Skip** — tiny, wrong market, AGPL                   |
| [ilyasozkurt/automobile-models-and-specs](https://github.com/ilyasozkurt/automobile-models-and-specs) | 124 brands / 7,207 models / ~30k engine variants, scraped from autoevolution.com | **None** (no LICENSE, `license: null`) | **Skip** — same autoevolution content as gor3a, no grant at all |
| [T33R0/ddpc-vehicle-specs](https://github.com/T33R0/ddpc-vehicle-specs)           | ~100k US specs (EPA/NHTSA + manufacturer), 48 fields                   | Sample/docs CC BY 4.0; full sets paid, single-user, no redistribution | **Skip for now** — US-centric, overlaps `ingest:fuel` + NHTSA |

### Verified 2026-10-07 (extra datasets)

- **ilyasozkurt/automobile-models-and-specs:** README says "scrapped from autoevolution.com" (2024-10-23); no license or
  terms anywhere. Unlicensed = all rights reserved, and the data is autoevolution's (see gor3a section for their terms),
  so it is **not** a way around the pending permission request. Usable only if autoevolution says yes.
- **T33R0/ddpc-vehicle-specs:** LICENSE = sample data + docs CC BY 4.0 (commercial OK with attribution to DDPC); the
  full datasets (US autos $199, motorcycles $149, bundle $299; REST API priced separately) are a single-user commercial
  license, redistribution of the files prohibited. Underlying EPA (fueleconomy.gov) and NHTSA data are public domain —
  the same EPA source `ingest:fuel` already loads, and NHTSA already backs VIN decoding. Real gain would be only
  dimensions/weight/engine specs for US models. If ever bought: get written confirmation that serving derived data to
  paying subscribers inside a hosted app is covered by "single-user" before paying.

## VehiclesDB (release 2026.10.0, built 2026-10-03)

**Content:** 6,242 car + van models (5,510 cars), 373 makes; kinds car/motorcycle/moped/van/truck/bus; 15 countries.
CSV `dist/vehicles.csv` is 1.1 MB; also JSON, Parquet, SQLite (`dist/catalog.sqlite`, 8.8 MB). Columns:
`kind, make_slug, make_name, model_slug, model_name, body_types, countries, regions, global_popularity_decile, aliases, former_ids`.
The `catalog/` folder additionally has per-country `rank`/`decile`/`confidence` and `xrefs` (EU type-approval numbers).

**Provenance (verifiable):** derived from 15 official registers listed in the repo's `ATTRIBUTION.md` / `SOURCES.md`
(RDW NL, KBA DE, DVLA UK, DGT ES, Traficom FI, CSO IE, SNCA LU, NRCan CA, NZTA NZ, JPJ MY, DLT TH, DNRPA AR,
fueleconomy.gov US, and **`ua_mvs` = the same data.gov.ua registry we ingest**). A model ships when two independent
official sources agree (or one shows an implausible-to-typo fleet count). Every record carries source ids.

**Popularity semantics:** per-country rank/decile from real registration counts; `global_decile` = mean of per-country
deciles, equal country weight (Europe over-represented; some sources count fleet, others new registrations).
Only the global decile is in the CSV — per-country values need `catalog/car/models.json`. Absolute counts are not open.

**What it adds vs. what we already have**

- Ukraine slice = our own registry re-aggregated → **no new information** (a UA rank is computable from `current_registration`).
- Genuinely new, from the other 14 countries: **"also sold in" markets**, **cross-market popularity decile**,
  standardized body type, aliases/former ids as naming hints.
- **No production years** in the open data (`year_start/year_end` are reserved/future) — an earlier assumption was wrong.
- Model names are broad (Octavia = one entry, old generations folded in).

**Overlap with our registry** (24.7M `stats_by_model` rows, 78.8k brand/model strings, matched with `makeKey`/`modelKey`
from `@carplates/shared`, doubled model spellings collapsed, car+van kinds):

- 62.6% exact + 10.6% via model-prefix match = **~73% of registry rows** get a VehiclesDB model.
- 16.3%: make known, model missing (Mazda `3`/`6`, BMW `320D`/`520I` trim codes, Lexus `RX 350`, DAF/MAN trucks).
- ~10%: make unknown — mostly Cyrillic ВАЗ / ЗАЗ spellings.
- Matched cars sit mostly in deciles 1-3 (Octavia, Transporter, Fabia, Caddy, Tiguan are decile 1) — a plain
  "popular in Europe" chip would say "popular" for most plates.
- 10 matched models are UA-only (~426k cars: ZAZ Lanos/Sens, Daewoo Sens, Lada 2108, Chery Amulet…).
- "Popular here, rare in Europe" (decile ≥ 8, lots of UA cars): Toyota Venza (14.5k), ZAZ 968, Mercedes 410 D,
  Renault Mascott, Škoda Favorit — the most distinctive `/stats` content.

**VehiclesDB — built (2026-10-07)**

| Piece                                                                                                                                                                                                                                                                                                                               | Where                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Table `registry.vdb_models` (kind, make/model keys, body types, countries[], regions[], `global_decile`, aliases, former ids), migration 0039                                                                                                                                                                                       | `packages/db/migrations/0039_vdb_models.sql`, `schema.ts` |
| Loader: download `dist/vehicles.csv` (cache `scripts/.data/vehiclesdb/`), `--from-csv`/`--export-csv`, Zod-validated parser (+ tests); all 6 kinds loaded (14,997 rows)                                                                                                                                                             | `scripts/src/vehiclesdb.ts`, `vehiclesdb-parse.ts`        |
| Committed seed (305 KB gz), `pnpm ingest:vehiclesdb[:csv]`, `export:vehiclesdb:csv`; the `:csv` load is part of `ingest:ratings:csv`                                                                                                                                                                                                | `scripts/seed-data/vehiclesdb.csv.gz`                     |
| Matcher `matchVdbModel` (+ `collapseDoubledModel`, `vdbCandidateKeys`, `isUkraineOnly`, `otherMarkets`) — one code path for API, chips and the stats script; 20 tests on real registry strings                                                                                                                                      | `packages/shared/src/vdbMatch.ts`                         |
| Contracts (own file, so no offline-cache bust): `VdbResponse`, `VdbStatsResponse`                                                                                                                                                                                                                                                   | `packages/shared/src/vdb.ts`                              |
| API: `GET /api/vdb?brand=&model=` (live match against `vdb_models`), `GET /api/vdb/stats`                                                                                                                                                                                                                                           | `apps/api/src/vdb/`                                       |
| Result card: chips in the TOP chip row between the stats chips and 3D/360° — 🇺🇦 UA-only, 🌍 also sold in (flags; names on hover), 📊 "Top X% of models in N markets", 💎 rare elsewhere (decile ≥ 8) + one "?" popover (every chip explained, `CODE — Country` legend of all 15 registers, CC-BY credit). Offline cache group `vdb` | `apps/web/src/components/VdbChips.tsx` (+ `.helpers.ts`)  |
| Rollup `registry.stats_vdb` (passenger cars per matched model; `vdb_id` NULL = unmatched bucket), migration 0040; `pnpm db:refresh-vdb-stats`                                                                                                                                                                                       | `scripts/src/vdb-stats.ts`                                |
| `/stats` "Ринки / Markets" panel: cars by popularity band, "common here, rare elsewhere", "only in Ukraine" (online-only, not offline-cached)                                                                                                                                                                                       | `apps/web/src/routes/stats/VdbStatsPanel.tsx`             |
| About sources entry "VehiclesDB — Vehicle data by VehiclesDB, CC BY 4.0"                                                                                                                                                                                                                                                            | `AboutRoute.tsx`, `about.source.vehiclesdb`               |

**Matching rules (`matchVdbModel`)**, in order: exact key -> catalog alias key -> series/nameplate keys (BMW `320D` ->
`3series`, Mazda `3`, Mercedes `S 500` -> S-Class via the curated alias table, Lexus `RX 350` -> `rx` only when the
registry text has a SPACE before the figure so "MX-5" is not "MX") -> catalog key that STARTS WITH the registry key (>= 3
chars) -> the longest catalog key that is a prefix of the registry key (a name ending in a digit may not swallow a longer
number: "ACCORD 2.0" is not "Accord 2"). A leading "NEW" is stripped, doubled names ("TRANSIT TRANSIT") collapsed, car rows
beat van/other kinds. Curated aliases live in `MODEL_ALIASES` (GAZ 3102/3110/31105 -> Volga, Toyota PRADO, Mercedes S/V/R) —
only add pairs verified in BOTH the registry and the catalog. A miss returns null: the UI hides the data, never guesses.
**Measured on the real registry (2026-10-07):** ~84% of rows (models with >= 20 cars) get a catalog model — exact 65.2%,
prefix 13.8%, series 4.4%, alias 0.6%; no make 8.3% (trailers/trucks: Schmitz, Krone, KamAZ), make known but model missing
7.6%. `stats_vdb` coverage: **92.6% of passenger cars**. The plan's earlier "Cyrillic ВАЗ/ЗАЗ make gap" was wrong:
`brandSlug` already maps them; the gap is at the MODEL level (below).

**Known gaps (data limits, not bugs):** VehiclesDB has no Lada 2110/2111/2112/2114/2115/Priora(2170)/Kalina entries (the
biggest unmatched ВАЗ groups: 21104, 217030, 21150, 21114), no ZAZ Vida/Tavria/Slavuta, Geely CK, Chery QQ, Gazelle (GAZ
3302), DAF "FT XF …" truck codes. Renault Dokker exists only as Dacia Dokker (needs a cross-make alias — the matcher takes
one make's rows at a time, so it is a small API/script change). VW Multivan is left unmatched on purpose (Transporter family,
ambiguous). `modelKey` strips Cyrillic, so a Cyrillic catalog alias (e.g. "Жигули") can never match.

**What to refresh when** (no foreign keys — the link is the `make_key`/`model_key` strings):

- `vdb_models` reads nothing from the registry; the chips match the card's own brand/model against it live.
- `stats_vdb` is derived from `current_registration` + `vdb_models`: rebuild it (`pnpm db:refresh-derived`, or
  `db:refresh-vdb-stats`) after a registry ingest, a new VehiclesDB release, or any matcher/alias change.
- Registry ingests now do this themselves: `ingest` (every branch except `--dry-run`) calls `refreshDerived()`
  (`scripts/src/derived-refresh.ts`: fuel-stats, safety-stats, vdb-stats) unless given `--skip-derived`; `ingest:full`
  passes the flag to its three child ingests and refreshes once at the end; `ingest:all` skips it in `ingest:full` and runs
  `db:refresh-derived` once after the rating/fuel/catalog CSVs are loaded (fuel/safety rollups need them).
  `ingest:ratings:csv` or `ingest:vehiclesdb` alone do NOT refresh the rollups — run `pnpm db:refresh-derived`.
- New VehiclesDB release: `pnpm ingest:vehiclesdb -- --refresh` -> `pnpm export:vehiclesdb:csv` (commit the seed) -> refresh.
- `makeKey`/`modelKey`/`brandSlug` change: re-run `ingest:vehiclesdb` from the DOWNLOAD (the seed CSV carries the
  stored keys, so `:csv` would keep stale ones), export, refresh. Rebuild `@carplates/shared` (`dist`) + restart the API
  after any shared edit. Users' PWA caches keep old `/api/vdb` answers until refetched (30 days max).

**Remaining ideas (not started):** cross-make alias (Renault Dokker -> Dacia Dokker); show one decimal for bar shares < 1% on
the `/stats` panel ("0%" for 13k cars); use `how` (exact/prefix/series) in the UI to soften loose matches; per-country
decile detail (needs `catalog/car/models.json`); the `plates/` cross-check below.

**Route decision:** add a panel to `/stats` rather than a new route (two thin charts don't justify a page, `/stats` already
has the `/top` + `/field/:dimension` structure). Revisit a `/markets` page only if per-country content grows.

**Side find — `plates/` folder:** VehiclesDB also has a license-plate dataset (`plates/ua.yml`, `plates/_decode/ua-regions.yml`)
citing MVS order №166 (rev. 16.12.2025): statutory 12 Cyrillic plate letters, closed series lists (144 pairs), region
letter table (27 regions x 4 pairs) vs. numeric region codes (01-27, 31), and plates with no region since Dec 2022.
Only the header of `ua.yml` was read. **Idea:** cross-check `normalizePlate`, `regions.ts` and `registry.plate_regions`
against it (a test, not a dependency).

### How to resume / extend (VehiclesDB)

Everything above is committed work, not a plan. Pointers for a fresh session:

- **Download URL (CC-BY 4.0):** `https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/main/dist/vehicles.csv`
  (header: `kind,make_slug,make_name,model_slug,model_name,body_types,countries,regions,global_popularity_decile,aliases,former_ids`;
  lists are `|`-separated, the decile can be empty). Attribution text "Vehicle data by VehiclesDB", https://vehiclesdb.com
  (`manifest.json`, `ATTRIBUTION.md`, `SOURCES.md`, `SCHEMA.md` in the repo). Treat the download as untrusted (own folder
  `scripts/.data/vehiclesdb/`, gitignored).
- **Patterns copied:** the fuel pipeline (`fuel-economy.ts`/`-parse.ts`/`fuel-stats.ts`, `fuelMatch.ts`), `FuelEconomy.tsx` and
  `apps/api/src/fuel/` for API/UI shape, `TopStatBadges.tsx` for the chip row.
- **Rules to respect (CLAUDE.md / CLAUDE_RULES.md):** `@Inject(Token)` on every api constructor dependency; Zod for CSV rows and
  responses; new shared contracts go in a NEW file (`schemas.ts` hash busts offline caches); a new `/api/*` query that should
  work offline goes in `lib/offline-cache.ts` (`vdb` is there, `vdb-stats` deliberately is not); i18n ua/ru/en; never
  `db:seed`/TRUNCATE the real-data DB. `Intl.DisplayNames` needs UPPER-case region codes (the catalog stores lower-case).
- **Dev gotchas hit while building:** the db package's `dist` must be rebuilt (`pnpm --filter @carplates/db build`) after a schema
  export change or `scripts` fails with "does not provide an export"; flag emoji do not render on Windows (the chips show
  letters there, flags elsewhere).
- **Scratch overlap scripts are not in the repo**; to re-check coverage, export `select brand, model, total_rows from
registry.stats_by_model`, match with `matchVdbModel` (see "Method notes").

## gor3a/vehicle-makes-models — blocked on autoevolution

**Content:** 164 makes, 2,621 models, 7,169 generations, 30,390 engine variants; fuel, cc, hp, torque, transmission,
drivetrain, 0-100, top speed, consumption, length/width/height/wheelbase/weight. JSON/CSV/SQLite, weekly regeneration.
Would complement VehiclesDB (specs + generations/years vs. popularity/markets) and relates to the blocked
automobiledimension.com item in `PLAN.md`.

**Terms check (autoevolution `terms.html`, read 2026-10-07):**

- §4: autoevolution content belongs to SoftNews NET and is copyright-protected; use of "any other autoevolution content"
  without **express written permission** is prohibited.
- §5: the services are for personal use of Members only, no commercial endeavors unless approved.
- Nothing about scraping/robots/specs specifically; no open data grant. `robots.txt` has no rule against `/cars/`
  (and blocks ClaudeBot, GPTBot etc. generally). `about-us.html`/`privacy.html` add nothing on licensing.
- gor3a's own `LICENSE-DATA` (ODbL: attribution to the project **and** autoevolution.com, share-alike if an adapted
  database is publicly used) has no visible upstream permission behind it.
- An earlier "tech specs can't be reproduced" quote came from a search summary of `/static/copyright.html`, which was
  not readable (403) — unverified.

**Action taken:** permission request sent via autoevolution's contact form on **2026-10-07** (free non-commercial lookup
app; asks whether the GitHub copy or the site may be used for specs, attribution wording, conditions). Mentioned the GitHub
repo openly. **Status: awaiting reply.**

**Source choice:** if permitted, use the **GitHub snapshot** (one download, no crawling, no load on their servers),
not a scraper of their site. Do not crawl autoevolution without an explicit yes.

**Next steps once a reply arrives** (save the email as the license record):

1. If yes: run the same overlap check as for VehiclesDB (registry coverage, years/engine presence per generation, name
   agreement via `makeKey`/`modelKey`), then decide on tables (`registry.model_generations`, `registry.engine_specs`) and a
   "Specs" card section; attribution on About sources as they request.
2. If no / no reply: leave it out. Nothing from it is ingested before then, so there is nothing to remove.
3. If the app later gets paid features: re-check whether the permission still applies; the specs block is isolated so it
   can be hidden. Note users' PWA caches (IndexedDB) keep already-fetched data, and ODbL share-alike applies to what was
   already publicly used.

## Round 2 — what can be built, what is skipped (licences checked 2026-10-07)

Licences were read from the portals' own pages or their catalogue entries (GitHub API for Open EV Data). Items marked
_(memory)_ were not re-fetched. Same rule as above: each source = own tables, ingest script, card section, i18n keys, About
credit; a source with an unresolved licence is hidden before any deploy.

### Can be built

| Source | Licence (verified) | Gives | Attribution | Delivery |
| --- | --- | --- | --- | --- |
| **RDW registered vehicles** — [opendata.rdw.nl/d/m9d7-ebf2](https://opendata.rdw.nl/d/m9d7-ebf2) ([catalogue](https://data.overheid.nl/en/dataset/11441-open-data-rdw--gekentekende-voertuigen)) | CC0 1.0 | Power, displacement, mass, dimensions, fuel, CO2, body per Dutch-registered vehicle -> aggregate per make/model/year ("Specs" block) | none required; credit anyway | bulk CSV/JSON (SODA), aggregate, ship a CSV seed |
| **RDW recalls** — [terugroep_actie](https://data.overheid.nl/dataset/11369-open-data-rdw--terugroep-actie), [_status](https://data.overheid.nl/en/dataset/11394-open-data-rdw--terugroep-actie-status), `_risico`, `_informeren_eigenaar` | CC0 1.0 | EU-market recall actions: defect, risk, repair status | none required | bulk, own table |
| **NHTSA recalls + complaints** — `api.nhtsa.gov/recalls/recallsByVehicle`, `api.nhtsa.gov/complaints/complaintsByVehicle` ([flat file](https://catalog.data.gov/dataset/nhtsas-office-of-defects-investigation-odi-recalls-recalls-flat-file) = offline option) | Public domain (`us-pd`) | US recalls (component, summary, consequence, remedy, campaign no., `parkIt`) and owner complaints per make/model/year | none required | **live API**, no key, rate limit unpublished -> cache; next to the existing `api/safety` |
| **UK DVSA MOT results** — [data.gov.uk](https://ckan.publishing.service.gov.uk/dataset/anonymised_mot_test) | OGL v3 | Pass rate, failure reasons, mileage per make/model/year (~43M tests/yr, 2005->) | **required** (OGL statement on About) | bulk ZIPs -> aggregate; newest file is **2023** (check for 2024/25 before building); schema changed 2018, 2017/2022 files corrected — needs a cleaning step |
| **Transport Canada recalls** — [open.canada.ca](https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d), CSV `opendatatc.tc.canada.ca/vrdb_full_monthly.csv` | OGL – Canada | Canadian safety recalls (monthly); excludes non-safety recalls | **required** | bulk CSV, own table; low priority (mostly overlaps NHTSA/RDW) |
| **Open EV Data** — [OpenChargingCloud/open-ev-data](https://github.com/OpenChargingCloud/open-ev-data) (`data/ev-data.json`; originally chargeprice/open-ev-data) | **MIT**, (c) 2019 Niklas Hösl (GitHub licence API) | Usable battery kWh, consumption, AC/DC ports and kW, charging curves | keep the MIT copyright notice (credit on About) | one JSON file, tiny; show an "Electric" block only on a make/model match or when vPIC reports battery-electric |

Already done, no work: **NHTSA vPIC** (live VIN decode) and **NHTSA NCAP stars** (live `api.nhtsa.gov/SafetyRatings`, with
crash videos, a tab in `SafetyRatings.tsx`).

### Caveats to design in (not blockers)

- **Recalls are model-level, never per car.** Neither RDW nor NHTSA exposes recalls by Ukrainian plate/VIN (RDW's per-vehicle
  open-recall flag exists for Dutch plates only). Wording: "recalls issued for this model in <market>", never "this car has
  an open recall"; label each row with its market (US / EU / CA).
- **PLAN.md "Phase 3+ — recalls" parked recalls (2026-09-24)** because a US recall shown for a non-US-spec unit is
  actively misleading. Round 2 changes the odds, not the rule: RDW gives an **EU-spec** source (most of the UA fleet), and
  the market label + "may not apply to your build" copy covers the rest. Re-confirm with the owner before shipping NHTSA
  recalls specifically.
- **Matching** reuses the VehiclesDB approach: one TypeScript matcher on `makeKey`/`modelKey` (RDW and NHTSA spell models
  differently — e.g. NHTSA "Mazda6" vs registry "6"; `SafetyService.findVariants()` already has that retry logic to reuse);
  a miss hides the section.
- **MOT is UK-market** (RHD, UK trims/engines): show as "UK inspection statistics for this model", not as a UA reliability score.

### Skipped (with reason)

| Source | Reason |
| --- | --- |
| **Eurostat vehicle stock** (`road_eqs_carmot`; free reuse with source credit) | Licence is fine, but data is country-level fleet totals by fuel/engine size — nothing per make/model, so nothing for a result card. Optional `/stats` country comparison only; not planned |
| **ANCAP** | data.gov.au record says "No Licence Provided" and links only to an HTML page; no download, no grant. Blocked unless ANCAP permits |
| **Latin NCAP / ASEAN NCAP** | Latin NCAP material is shared for non-commercial/educational use only; nothing found for ASEAN NCAP. Blocked unless permitted; ratings are also region-specific |
| **UK DVSA Recalls API** | write API for manufacturers, not a data source |
| **Kaggle car datasets** | small, US/India-oriented, licences unclear |
| **autoevolution-derived** (gor3a, ilyasozkurt), **ddpc**, **carguru**, **sortedcars** | see sections above |
| **data.gov.ua** | out of scope here — separate session |

### Deferred

- **Wikidata (CC0 _(memory)_)** — generations, production years, successor links, Commons image links; maybe extend the wiki
  section. Discuss later; nothing planned.
- **NHTSA vPIC offline dump** — only if the live-API dependency becomes a problem.

### Suggested order

1. RDW specs + recalls (cleanest licence, biggest gain; builds the match + aggregate pipeline the rest reuse).
2. NHTSA recalls + complaints (live, cached) — after the recall-wording decision above.
3. Open EV Data (small).
4. Transport Canada recalls.
5. UK MOT (largest ingest; check newer files first).

### Refresh cadence (data that lands in our local DB)

**Rule: implement a source's ingest, CSV seed, refresh command and schedule entry only when its card block is built** —
nothing below exists yet, and no table/script is created ahead of its feature. When a feature ships, add its row to
`SCHEDULE.md` (post-deploy recurring jobs) and its commands to CLAUDE.md. Until deploy (Phase 4) everything is manual;
cadence = how often to run it by hand, then by scheduler. Each bulk source follows the existing pattern: `ingest:<x>`
(download), `ingest:<x>:csv` (committed seed), `export:<x>:csv`, idempotent, then `db:refresh-derived` if a rollup depends on it.

| Source | Stored in DB? | Upstream changes | Refresh | Notes |
| --- | --- | --- | --- | --- |
| RDW specs (aggregate per make/model/year) | yes, aggregated table (not the ~15M raw rows) | daily | **every 6 months** (new models/years only add rows) | re-run also after a registry ingest adds new models, so matching stays current |
| RDW recalls (+ status) | yes | continuous, new campaigns weekly | **monthly** (weekly if recalls get prominence) | status (open/repaired) changes, so upsert, not insert-only |
| NHTSA recalls + complaints | **no raw copy** — live API behind a cache (in-memory or small cache table) | continuous | cache TTL **7 days** recalls, **30 days** complaints; no scheduled job | like `api/safety`; flat-file bulk load only if the live API proves unreliable (then monthly) |
| UK MOT | yes, aggregated per make/model/year/failure item (not raw tests) | one new annual file | **once a year**, after the new year's ZIP appears; re-aggregate only that year | portal's newest file was 2023 — check before building |
| Transport Canada recalls | yes | monthly | **quarterly** | low value; can be dropped |
| Open EV Data | yes, tiny | irregular commits | **quarterly** (check repo for new commits) | re-run `ingest:<x>:csv` seed is enough between pulls |

Result-card blocks: **Recalls** (RDW + NHTSA + CA, market-labelled), **Complaints** (NHTSA), **Common faults** (MOT),
**Specs** (RDW), **Electric** (Open EV Data). Status of every item: **not started**.

## Open questions

- Recalls: ship NHTSA recalls given the 2026-09-24 "misleading" decision, or RDW (EU) only? (open — owner call)
- RDW specs: aggregate by (make, model, year) with median/range, or keep per-generation? Decide after looking at the data.

- Is the VehiclesDB per-country decile (catalog files) worth loading for a "rank in NL/DE/GB" detail, or is global enough? (still open)
- Do we want VehiclesDB's other kinds (motorcycle, truck, bus) for the registry's non-car rows? (all kinds are LOADED; matching
  and the stats rollup only use passenger cars — widening needs a `kind` mapping from the registry's `kind` text.)
- Does a derived body-type label add anything over the registry's own `body`? (still open; `body_types` is stored, unused.)
- ~~Which Cyrillic make aliases would close the ВАЗ/ЗАЗ gap?~~ None needed — `brandSlug` covers them; see "Known gaps".
- gor3a/autoevolution: waiting for the permission reply (see above) — nothing ingested.

## Method notes (to reproduce the overlap numbers)

Download `dist/vehicles.csv` from the VehiclesDB repo into a scratch folder (untrusted data; scripts elsewhere), export
`select brand, model, total_rows from registry.stats_by_model`, then match with `makeKey`/`modelKey` from
`@carplates/shared/dist` — exact key first, then same-make model prefix (≥3 chars) either way; collapse doubled model
spellings ("TRANSIT TRANSIT"). Scripts were scratch-only and are not committed.
