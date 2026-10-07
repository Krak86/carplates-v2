# DATASETS_PLAN.md

Research (2026-10-07) on four external GitHub datasets and how they could enrich result cards and `/stats`.
Nothing is implemented yet. Phase/priority context lives in `PLAN.md`; this file only tracks this thread.

## Decisions

- **Use everything we can** while the site is localhost-only. Build each source as a **separate, removable block**
  (own tables, own ingest scripts, own result-card section, own i18n keys) so it can be switched off or deleted
  if a source's permission is refused or never arrives.
- **Gate before any deploy (Phase 4 / VPS):** every source below must have a documented license or written
  permission, and attribution on the About sources page. Anything unresolved is hidden or removed first.
- autoevolution-derived data (gor3a) is **not ingested until we have a reply** — see below. VehiclesDB is clear to use.

## Sources at a glance

| Source | What | License | Verdict |
| --- | --- | --- | --- |
| [vehiclesdb/vehiclesdb](https://github.com/vehiclesdb/vehiclesdb) | Make/model catalog, popularity deciles, markets | CC-BY 4.0 (visible attribution) | **Use** (see below) |
| [gor3a/vehicle-makes-models](https://github.com/gor3a/vehicle-makes-models) | Generations + engine variants + specs (hp, torque, dimensions, weight) | ODbL 1.0, but compiled from autoevolution.com | **Pending autoevolution reply** |
| [rebrowser/carguruscom-dataset](https://github.com/rebrowser/carguruscom-dataset) | Scraped US used-car listings | Non-commercial, paid commercial | **Skip** — US-only, dealer/price data, nothing for UA |
| [visnkmr/sortedcars](https://github.com/visnkmr/sortedcars) | ~20 brands' dimensions, India-heavy, TS objects | AGPL-3.0, proprietary data | **Skip** — tiny, wrong market, AGPL |

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

**Planned build (not started)**
1. Migration: `registry.vdb_models` (kind, make_key, model_key, make/model names, body_types, countries[], regions[],
   global_decile, aliases) + index on (`make_key`, `model_key`); optionally `vdb_makes`. Keys computed at load time.
2. Seed + loaders following the fuel pattern: committed gz CSV, `pnpm ingest:vehiclesdb` (download dist CSV + compute keys),
   `ingest:vehiclesdb:csv`, `export:vehiclesdb:csv`; add the `:csv` load to `ingest:ratings:csv`.
3. Matching in `packages/shared` (reuse the `fuelMatch.ts` model-prefix logic; extend `vehicleKey.ts` for Mazda numeric
   models, BMW `NNN[di]` -> series, Cyrillic ВАЗ/ЗАЗ transliteration) — rebuild `dist` after editing.
4. API: `GET /api/vdb?brand=&model=` (add to persisted-cache rules in `lib/offline-cache.ts` if it should work offline);
   `registry.stats_vdb` rollup + refresh script; new panel under `/stats`.
5. Web: result-card chip(s) ("🇪🇺 top 10-30%", "sold in N countries"), hidden when no match; `/stats` panel with
   "registry by EU popularity decile" and "popular in UA, rare elsewhere"; i18n keys ua/ru/en.
6. About sources: attribution "Vehicle data by VehiclesDB" with link (CC-BY condition).

**Route decision:** add a panel to `/stats` rather than a new route (two thin charts don't justify a page, `/stats` already
has the `/top` + `/field/:dimension` structure). Revisit a `/markets` page only if per-country content grows.

**Side find — `plates/` folder:** VehiclesDB also has a license-plate dataset (`plates/ua.yml`, `plates/_decode/ua-regions.yml`)
citing MVS order №166 (rev. 16.12.2025): statutory 12 Cyrillic plate letters, closed series lists (144 pairs), region
letter table (27 regions x 4 pairs) vs. numeric region codes (01-27, 31), and plates with no region since Dec 2022.
Only the header of `ua.yml` was read. **Idea:** cross-check `normalizePlate`, `regions.ts` and `registry.plate_regions`
against it (a test, not a dependency).

### Kickoff for a fresh session (VehiclesDB build)

Everything needed is in this file plus the repo. Concrete pointers:

- **Download URL (CC-BY 4.0):** `https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/main/dist/vehicles.csv`
  (header: `kind,make_slug,make_name,model_slug,model_name,body_types,countries,regions,global_popularity_decile,aliases,former_ids`;
  `body_types`/`countries`/`regions`/`aliases`/`former_ids` are `|`-separated; the decile can be empty; fields may be quoted).
  Docs: the repo's `SCHEMA.md`, `SOURCES.md`, `manifest.json` (version + attribution text "Vehicle data by VehiclesDB",
  https://vehiclesdb.com). Treat the download as untrusted: own empty folder under `scripts/.data/vehiclesdb/` (gitignored cache).
- **Pattern to copy — the fuel pipeline:** `scripts/src/fuel-economy.ts` (one file does fetch + `--from-csv` + `--export-csv`),
  `scripts/src/fuel-economy-parse.ts` (+ tests), `scripts/src/fuel-stats.ts`, `scripts/seed-data/fuel-economy.csv.gz`;
  scripts wired in `scripts/package.json` (`ingest:fuel`, `ingest:fuel:csv`, `export:fuel:csv`, `refresh-fuel-stats`) and
  mirrored in the root `package.json`; add the `:csv` load to `ingest:ratings:csv` (and `ingest:all` only if a stats refresh is needed).
- **Matching code:** `packages/shared/src/vehicleKey.ts` (`makeKey`/`modelKey`), `packages/shared/src/fuelMatch.ts` (+ tests) for
  the model-prefix logic. Rebuild with `pnpm --filter @carplates/shared build` after editing.
- **DB:** next migration is `packages/db/migrations/0039_*.sql` (latest is 0038); add the Drizzle table to
  `packages/db/src/schema.ts` in the `registry` schema, like `infocar_versions` (links + facts only, comment the source).
- **Result-card precedent:** `apps/web/src/components/FuelEconomy.tsx`, `CO2Badge`, the fuel/crash-test ranking chips; API
  precedent `apps/api/src/fuel/` (controller/service/dto); stats precedent `apps/api/src/fuel/fuel-stats.service.ts`,
  `apps/web/src/routes/fuel/`; the `/stats` route is `apps/web/src/routes/stats/` (panels in `TopStatsPanel.tsx`).
- **Rules to respect (CLAUDE.md / CLAUDE_RULES.md):** `@Inject(Token)` on every api constructor dependency; Zod for CSV rows and
  responses; contracts in `packages/shared` (changing `schemas.ts` busts users' offline cache — put new schemas in a new file
  like `account.ts` did, or accept the bust deliberately); new `/api/*` queries that should work offline go in
  `lib/offline-cache.ts`; i18n ua/ru/en; no `db:seed` / `TRUNCATE` against the real data (the local DB is a real ingest, ~24.7M rows).
- **Suggested order:** (1) parser + CSV loader + migration + tests, (2) matching helper + tests against real registry
  strings (use the unmatched lists above as test cases), (3) API endpoint, (4) result-card chips, (5) stats rollup + `/stats`
  panel, (6) About sources attribution. Stop after each step with a suggested commit message (don't commit).
- **Scratch files from the research are not in the repo** (the overlap scripts lived in the session scratchpad); recreate from
  "Method notes" below if numbers need re-checking.

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

## Open questions

- Is the VehiclesDB per-country decile (catalog files) worth loading for a "rank in NL/DE/GB" detail, or is global enough?
- Do we want VehiclesDB's other kinds (motorcycle, truck, bus) for the registry's non-car rows?
- Does a derived body-type label add anything over the registry's own `body`? (Probably only for cleaner display.)
- Which Cyrillic make aliases would close the ~10% ВАЗ/ЗАЗ gap (a small curated map in `packages/shared` is likely enough)?

## Method notes (to reproduce the overlap numbers)

Download `dist/vehicles.csv` from the VehiclesDB repo into a scratch folder (untrusted data; scripts elsewhere), export
`select brand, model, total_rows from registry.stats_by_model`, then match with `makeKey`/`modelKey` from
`@carplates/shared/dist` — exact key first, then same-make model prefix (≥3 chars) either way; collapse doubled model
spellings ("TRANSIT TRANSIT"). Scripts were scratch-only and are not committed.
