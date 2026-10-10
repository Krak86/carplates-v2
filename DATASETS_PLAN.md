# DATASETS_PLAN.md

> **Resume here (2026-10-09).** Stages A (+A2 plate-region fix, +A3 alias chips), **B** (motorcycle/truck/bus matching), **C** (RDW specs, C2, C3) **C4** (estimated value) **D** (RDW recalls) and **E** (Open EV Data) are DONE;
> stages M1–M3 and **F** (NHTSA recalls + complaints) are built; see "Staged plan" near the end. **Rule: do not start a stage until the owner says "go stage X".**
> autoevolution (stage Z): they replied again 2026-10-08 ("we can sort something out, but first we would like to see this app; if it is still a work in progress we can wait") — answer once the app is public (after the Phase 4 deploy); revisit after stage H whether we need them at all (gap list below). Do NOT download the unauthorized GitHub copy, not even for internal comparison. Stage A is code-complete but may be uncommitted: check
> `git status`. After a registry/plate-table change run `pnpm db:refresh-stats` (slow, ~15+ min, rebuilds the materialized views
> from existing rows) and `pnpm db:refresh-derived`; restart `pnpm dev` after any `@carplates/shared` rebuild.

Research (2026-10-07) on four external GitHub datasets and how they could enrich result cards and `/stats`.
**Status (2026-10-07): VehiclesDB is built end to end** (catalog, matcher, API, result-card chips, `/stats` panel, About
credit) — see "VehiclesDB — built" below and the write-up in `docs/plan-done.md` ("VehiclesDB cross-market data").
gor3a/autoevolution is still **blocked** — autoevolution replied 2026-10-08 (the GitHub copy is unauthorized; no permission
granted yet, they asked about our app) — see its section below; carguru and sortedcars are skipped. Phase/priority context lives in
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

| Source                                                                                                | What                                                                             | License                                                               | Verdict                                                         |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------- |
| [vehiclesdb/vehiclesdb](https://github.com/vehiclesdb/vehiclesdb)                                     | Make/model catalog, popularity deciles, markets                                  | CC-BY 4.0 (visible attribution)                                       | **Use** (see below)                                             |
| [gor3a/vehicle-makes-models](https://github.com/gor3a/vehicle-makes-models)                           | Generations + engine variants + specs (hp, torque, dimensions, weight)           | ODbL 1.0, but compiled from autoevolution.com                         | **Blocked** — repo unauthorized (autoevolution, 2026-10-08)     |
| [rebrowser/carguruscom-dataset](https://github.com/rebrowser/carguruscom-dataset)                     | Scraped US used-car listings                                                     | Non-commercial, paid commercial                                       | **Skip** — US-only, dealer/price data, nothing for UA           |
| [visnkmr/sortedcars](https://github.com/visnkmr/sortedcars)                                           | ~20 brands' dimensions, India-heavy, TS objects                                  | AGPL-3.0, proprietary data                                            | **Skip** — tiny, wrong market, AGPL                             |
| [ilyasozkurt/automobile-models-and-specs](https://github.com/ilyasozkurt/automobile-models-and-specs) | 124 brands / 7,207 models / ~30k engine variants, scraped from autoevolution.com | **None** (no LICENSE, `license: null`)                                | **Skip** — same autoevolution content as gor3a, no grant at all |
| [T33R0/ddpc-vehicle-specs](https://github.com/T33R0/ddpc-vehicle-specs)                               | ~100k US specs (EPA/NHTSA + manufacturer), 48 fields                             | Sample/docs CC BY 4.0; full sets paid, single-user, no redistribution | **Skip for now** — US-centric, overlaps `ingest:fuel` + NHTSA   |

### Verified 2026-10-07 (extra datasets)

- **ilyasozkurt/automobile-models-and-specs:** README says "scrapped from autoevolution.com" (2024-10-23); no license or
  terms anywhere. Unlicensed = all rights reserved, and the data is autoevolution's (see gor3a section for their terms),
  so it is **not** a way around the pending permission request. Usable only if autoevolution says yes — and since their
  2026-10-08 reply calls the gor3a copy of the same data an unauthorized scrape, treat this repo the same way: do not use it.
- **T33R0/ddpc-vehicle-specs:** LICENSE = sample data + docs CC BY 4.0 (commercial OK with attribution to DDPC); the
  full datasets (US autos $199, motorcycles $149, bundle $299; REST API priced separately) are a single-user commercial
  license, redistribution of the files prohibited. Underlying EPA (fueleconomy.gov) and NHTSA data are public domain —
  the same EPA source `ingest:fuel` already loads, and NHTSA already backs VIN decoding. Real gain would be only
  dimensions/weight/engine specs for US models. If ever bought: get written confirmation that serving derived data to
  paying subscribers inside a hosted app is covered by "single-user" before paying.

### Euro NCAP terms — verified 2026-10-10 (already ingested, `ingest:euroncap`)

Source: [euroncap.com/terms-conditions](https://www.euroncap.com/terms-conditions/) (no last-updated date; footer "Copyright © 2026
Euro NCAP"). robots.txt: `Allow: /`, `Disallow: /admin`, `/api/`, `/preview/`, `/*?id=*` — our sitemap-based scrape stays inside it.

- "This site and its content are subject to the copyright of Euro NCAP." / "Reproduction is not authorised for commercial purposes." /
  "Prior permission from Euro NCAP must be obtained for the reproduction or use of textual and multimedia information"
  (video, pictures, illustrations). Nothing on automated access or linking. The press page also bars images, videos and logos in
  advertising/commercial contexts without permission; protocol PDFs allow non-commercial, educational sharing with the notice kept.
- **Verdict: not cleared.** Ratings are facts (stars, percentages, test year), but the page text, images and videos are copyrighted
  and our use is a public product, so the committed CSV's `images` / `youtube_ids` columns and any copied wording are the risk.
- **Done 2026-10-10:** the Euro NCAP photos (front thumbnail, carousel, credit line) are no longer rendered or exported — the card
  shows the brand logo; the `frontImageUrl` / `images` fields stay in the schema, DB and CSV, unused. The crash-test video stays as
  the YouTube no-cookie embed (play on click) plus an "Open on YouTube" link. The source credit on About stays (text link + logo);
  the logo is the only grey item (press page bars logos in commercial contexts) — owner decided to keep it for now.
- **Action before any public deploy (remaining):** (1) show stars + percentages + a link to the source page only; (2) stop displaying Euro NCAP
  images/videos/logos (or get written permission); (3) credit "Euro NCAP" on About; (4) optionally ask permission. Until then treat the
  section as **hidden-before-deploy** like any unresolved licence (rule in "Round 2"). Local dev use is unaffected.

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
| Rollup `registry.stats_vdb` (per vehicle class and matched model; `vdb_id` NULL = that class's unmatched bucket), migrations 0040 + 0046; `pnpm db:refresh-vdb-stats`                                                                                                                                                               | `scripts/src/vdb-stats.ts`                                |
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
3302), DAF "FT XF …" truck codes. Renault Dokker exists only as Dacia Dokker — solved in stage A by the curated
`CROSS_MAKE_ALIASES` (`vdbRelatedMakeKeys` / `matchVdbModelAcrossMakes`; Renault Lodgy has no catalog row anywhere). VW Multivan is left unmatched on purpose (Transporter family,
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

**Stage A polish — done (2026-10-08):** cross-make alias Renault Dokker -> Dacia Dokker (+15,031 cars, `stats_vdb` coverage
92.6% -> 92.7%; API and `vdb-stats.ts` share `matchVdbModelAcrossMakes`); `formatShare` shows one decimal under 1% ("<0.1%"
below that) in the /stats panel; an "approximate match" line in the chip "?" popover when `how` is `prefix` (series/alias/exact
are not loose); `regions.statute.test.ts` cross-check of the plate tables (findings below).
**Remaining ideas:** per-country decile detail (decided: not planned).

**Stage B — done (2026-10-08): motorcycle / truck / bus.** `vdbVehicleClass(registryKind)` (`vdbMatch.ts`) maps the registry's
`kind` text to car / motorcycle / truck / bus (МОТОЦИКЛ, МОТОТРИЦИКЛ, КВАДРОЦИКЛ, ТРИЦИКЛ, МОПЕД -> motorcycle; ПРИЧІП, НАПІВПРИЧІП,
СПЕЦ… -> no class, no lookup). `vdbCatalogKinds(cls)` restricts `matchVdbModel` / `matchVdbModelAcrossMakes` to catalog kinds,
ranked in order: motorcycle = motorcycle, moped · truck = truck, van, car (the registry files vans and pickups under ВАНТАЖНИЙ) ·
bus = bus, van (minibuses) · car = unrestricted, so car coverage is unchanged (92.7%). `GET /api/vdb` takes an optional
`kind` (registry text; omitted = the old any-kind lookup, so old clients and cached answers keep working); the chips pass the
card's kind and the query key carries it. Migration `0046` adds `stats_vdb.vehicle_kind` (default `car`); `vdb-stats.ts`
rolls up all four classes (an unmatched bucket per class); `GET /api/vdb/stats?kind=car|motorcycle|truck|bus` and a class
selector on the /stats Markets panel. **Measured coverage (rows with a catalog match):** car 92.7%, truck 66.5%, motorcycle
46.7%, bus 37.5% — the misses are data limits (Chinese motorcycles beyond Musstang/Lifan, Bogdan/BAZ/PAZ buses, trucks
with engine-code names like "FT XF …"). A miss hides the chips, as before.

**Route decision:** add a panel to `/stats` rather than a new route (two thin charts don't justify a page, `/stats` already
has the `/top` + `/field/:dimension` structure). Revisit a `/markets` page only if per-country content grows.

**Side find — `plates/` folder:** VehiclesDB also has a license-plate dataset (`plates/ua.yml`, `plates/_decode/ua-regions.yml`)
citing MVS order №166 (rev. 16.12.2025): statutory 12 Cyrillic plate letters, closed series lists (144 pairs), region
letter table (27 regions x 4 pairs) vs. numeric region codes (01-27, 31), and plates with no region since Dec 2022.
**Cross-check done and fixed (2026-10-08, stage A2).** `packages/shared/src/regions.statute.test.ts` holds a fixture copied from
`ua-regions.yml` (no dependency) and now asserts `REGIONS` / `LEGACY_REGIONS` equal the statute exactly. What it found and what
changed:

- `REGIONS` had 54 of the statute's 108 letter pairs (v1 only had two of four columns per region) — e.g. `ОО` (Odesa; 4,338
  registry plates), `ТІ`, `ТТ`, Crimea's `МА`/`МК`/`ТК`. All 108 are in now.
- `КК` was mapped to АР Крим; the statute (and the registry: the one КК plate has Kyiv service centre 8045) says Kyiv city. Fixed.
- `LEGACY_REGIONS` gained numeric code **31** (Kyiv city's second code).
- Migration `0045_plate_regions_statute.sql` mirrors it all into `registry.plate_regions` (136 rows, verified equal to the TS
  tables); the `stats_by_region*` views pick it up on `pnpm db:refresh-stats`.
- Why "same letters, different region" can still happen: a pair is the region AT ISSUE (owners may keep a combination and move
  it to another car; since 2023 they may choose it), and the 1995-2004 letter series reused some pairs on a different map —
  the table is read against today's statute only. The plate-segment popover now says so (`plate.seg.region.desc`).
- Still open (not a table gap): the statute's region-less online codes — we handle `DІ` and `ЕD`; `DC` and `PD` are untested.

**Stage A3 — done (2026-10-08): model aliases in the chips.** `GET /api/vdb` now returns `crossMake` (catalog files the model
under another make: Renault Dokker = Dacia Dokker) and `aliases` (Latin-script catalog aliases that are not just a spelling
variant — `displayAliases`; only 57 of 14,997 rows have any, e.g. Golf = Rabbit, Duster = Renault Duster). Shown as a
ONE "🏷️ Also known as: Dacia Dokker, Rabbit" chip (the cross-make name first, then the aliases; first 3 shown, all in the hover title — a rebadge and
a catalog alias mean the same thing to a user, so they share a chip) and as separate lines in
the "?" popover, where the matched catalog name and the aliases are bold + underlined (`InfoText` `highlight` prop) so the model stands
out. Old cached answers lack the new fields (IndexedDB is not re-parsed) — the chips read them defensively. The catalog has no "different name in
different years/regions" data beyond this; per-model history would be hand-written text, not planned.

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
repo openly.

**Reply received 2026-10-08 (Webmaster, autoevolution.com) — NOT a permission yet:**

- They state the gor3a repository is **unauthorized**: it scraped their database without permission and republished it under
  its own "license" (the ODbL grant has no upstream right behind it). They are trying to take it down via DMCA, which is slow.
- They did **not** say yes or no to our use. They asked us to say more about the app: what kind it is, mobile or web.
- **Consequence:** the GitHub snapshot (gor3a, and likewise ilyasozkurt's) is **off the table** for good — even if autoevolution
  later permits use of their data, it would be their data via a channel they agree to, not that repo. If the repo is taken down,
  the download URL and the ODbL licence disappear anyway. Nothing was ever ingested, so nothing to remove.
- **Owner's answer sent:** web-only pet project (v2), only wants data it is allowed to use, asks what can be reused from the
  site. **Status: awaiting their reply** (no answer to the first or the follow-up with specific questions: use as specs, how to
  get the data, attribution wording, limits). Keep the whole thread as the licence record. No reply = treat as no.

**Source choice (revised 2026-10-08):** only whatever autoevolution itself agrees to provide or allow, in writing. No GitHub
copy, and still no crawling of their site without an explicit yes.

**Next steps** (save every email as the license record):

1. If they grant permission and a way to get the data: run the same overlap check as for VehiclesDB (registry coverage,
   years/engine presence per generation, name agreement via `makeKey`/`modelKey`), then decide on tables
   (`registry.model_generations`, `registry.engine_specs`) and a "Specs" card section; attribution on About sources as they request.
2. If no / no further reply: leave it out. Nothing from it is ingested before then, so there is nothing to remove.
3. If the app later gets paid features: re-check whether the permission still applies; the specs block is isolated so it
   can be hidden. Note users' PWA caches (IndexedDB) keep already-fetched data, and ODbL share-alike applies to what was
   already publicly used.

## Round 2 — what can be built, what is skipped (licences checked 2026-10-07)

Licences were read from the portals' own pages or their catalogue entries (GitHub API for Open EV Data). Items marked
_(memory)_ were not re-fetched. Same rule as above: each source = own tables, ingest script, card section, i18n keys, About
credit; a source with an unresolved licence is hidden before any deploy.

### Can be built

| Source                                                                                                                                                                                                                                                          | Licence (verified)                                 | Gives                                                                                                                                | Attribution                                     | Delivery                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RDW registered vehicles** — [opendata.rdw.nl/d/m9d7-ebf2](https://opendata.rdw.nl/d/m9d7-ebf2) ([catalogue](https://data.overheid.nl/en/dataset/11441-open-data-rdw--gekentekende-voertuigen))                                                                | CC0 1.0                                            | Power, displacement, mass, dimensions, fuel, CO2, body per Dutch-registered vehicle -> aggregate per make/model/year ("Specs" block) | none required; credit anyway                    | bulk CSV/JSON (SODA), aggregate, ship a CSV seed                                                                                                            |
| **RDW recalls** — [terugroep_actie](https://data.overheid.nl/dataset/11369-open-data-rdw--terugroep-actie), [_status](https://data.overheid.nl/en/dataset/11394-open-data-rdw--terugroep-actie-status), `_risico`, `_informeren_eigenaar`                       | CC0 1.0                                            | EU-market recall actions: defect, risk, repair status                                                                                | none required                                   | bulk, own table                                                                                                                                             |
| **NHTSA recalls + complaints** — `api.nhtsa.gov/recalls/recallsByVehicle`, `api.nhtsa.gov/complaints/complaintsByVehicle` ([flat file](https://catalog.data.gov/dataset/nhtsas-office-of-defects-investigation-odi-recalls-recalls-flat-file) = offline option) | Public domain (`us-pd`)                            | US recalls (component, summary, consequence, remedy, campaign no., `parkIt`) and owner complaints per make/model/year                | none required                                   | **live API**, no key, rate limit unpublished -> cache; next to the existing `api/safety`                                                                    |
| **UK DVSA MOT results** — [data.gov.uk](https://ckan.publishing.service.gov.uk/dataset/anonymised_mot_test)                                                                                                                                                     | OGL v3                                             | Pass rate, failure reasons, mileage per make/model/year (~43M tests/yr, 2005->)                                                      | **required** (OGL statement on About)           | bulk ZIPs -> aggregate; newest file is **2023** (check for 2024/25 before building); schema changed 2018, 2017/2022 files corrected — needs a cleaning step |
| **Transport Canada recalls** — [open.canada.ca](https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d), CSV `opendatatc.tc.canada.ca/vrdb_full_monthly.csv`                                                                               | OGL – Canada                                       | Canadian safety recalls (monthly); excludes non-safety recalls                                                                       | **required**                                    | bulk CSV, own table; low priority (mostly overlaps NHTSA/RDW)                                                                                               |
| **Open EV Data** — [OpenChargingCloud/open-ev-data](https://github.com/OpenChargingCloud/open-ev-data) (`data/ev-data.json`; originally chargeprice/open-ev-data)                                                                                               | **MIT**, (c) 2019 Niklas Hösl (GitHub licence API) | Usable battery kWh, consumption, AC/DC ports and kW, charging curves                                                                 | keep the MIT copyright notice (credit on About) | one JSON file, tiny; show an "Electric" block only on a make/model match or when vPIC reports battery-electric                                              |

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

| Source                                                                                | Reason                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Eurostat vehicle stock** (`road_eqs_carmot`; free reuse with source credit)         | Licence is fine, but data is country-level fleet totals by fuel/engine size — nothing per make/model, so nothing for a result card. Optional `/stats` country comparison only; not planned |
| **ANCAP**                                                                             | data.gov.au record says "No Licence Provided" and links only to an HTML page; no download, no grant. Blocked unless ANCAP permits                                                          |
| **Latin NCAP / ASEAN NCAP**                                                           | Latin NCAP material is shared for non-commercial/educational use only; nothing found for ASEAN NCAP. Blocked unless permitted; ratings are also region-specific                            |
| **UK DVSA Recalls API**                                                               | write API for manufacturers, not a data source                                                                                                                                             |
| **Kaggle car datasets**                                                               | small, US/India-oriented, licences unclear                                                                                                                                                 |
| **autoevolution-derived** (gor3a, ilyasozkurt), **ddpc**, **carguru**, **sortedcars** | see sections above                                                                                                                                                                         |
| **data.gov.ua**                                                                       | out of scope here — separate session                                                                                                                                                       |
| **USSR / UA-built model sites** (checked 2026-10-10, see below)                       | no stated data licence; `drive.place` is bot-blocked (403); photos/text copyrighted. Facts only via Wikidata/Wikipedia                                                                     |

#### USSR / Ukrainian-built models — sites checked 2026-10-10 (none ingested)

Idea: extend the local DB with Soviet/UA cars (VAZ, GAZ, ZAZ, Moskvich, IZH, UAZ), poorly covered by VehiclesDB/RDW/NHTSA.

- **autoussr.ru/en** — ~139 models (cars 34, trucks 26, buses 31, off-road 16, dump trucks 16, tractor units 16), 15 factories, 1924–1991;
  per model: factory, years, hp, top speed, displacement; photos from Wikimedia Commons. © 2026, no licence stated. Best of the set,
  usable only as a facts **cross-check**.
- **sovietcarmodels.com** — ~840 cards over 14 listing pages (title + photo only); looks like a model-car shop. "All Rights Reserved © 2022". Skip.
- **zaz.drive.place / drive.place** — 403 to automated fetch (bot protection). Its privacy policy names **Automdb.com**: an ad-funded
  car-encyclopedia family on a shared template. No reuse licence; do not scrape or bypass the block. Skip.
- **zaz.ua** (manufacturer, not fetched) and the **24tv.ua** article (editorial, not a dataset): nothing to ingest.
- **Plan if the gap is real**: first measure it (read-only SQL: registry rows of those makes with no `vdb_models` / `rdw_specs`
  match). Then a small separate, removable seed table sourced from **Wikidata (CC0) / Wikipedia (CC BY-SA)** — years, engine,
  mass — with autoussr.ru as cross-check only; credit on About. Fits the existing deferred Wikidata stage I. Not started.

### Deferred

- **Wikidata (CC0 _(memory)_)** — generations, production years, successor links, Commons image links; maybe extend the wiki
  section. Now proposed as stage I (last stage, see below); not started.
- **NHTSA vPIC offline dump** — only if the live-API dependency becomes a problem.

### Staged plan (decided 2026-10-08; owner approves each stage before it starts)

**Rule: nothing below is started until the owner says "go stage X".** Each stage is independently shippable and removable;
at the end of a stage give a commit message and stop. Order = value / risk, cleanest licence first.

| Stage                                                                                                                          | What                                                                                                                                                                                                                                                                                                                                             | Size         | Depends on                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | --------------------------------- |
| **A. VehiclesDB polish** — **done 2026-10-08** (see "Stage A polish"; A2 plate-table fix and A3 alias info added the same day) | Cross-make alias (Renault Dokker -> Dacia Dokker: let the matcher try a second make); one decimal for `/stats` bar shares < 1%; use `how` (exact/prefix/series) to soften loose matches in the chip copy; test that cross-checks `normalizePlate` / `regions.ts` / `plate_regions` against VehiclesDB `plates/ua.yml` (a test, not a dependency) | small        | —                                 |
| **B. VehiclesDB non-car kinds** — **done 2026-10-08** (see "Stage B" below)                                                    | Widen `matchVdbModel` + `stats_vdb` to motorcycle / truck / bus via a `kind` mapping from the registry's `kind` text; chips for those cards                                                                                                                                                                                                      | small-medium | A                                 |
| **C. RDW specs** — **done 2026-10-08** (see "Stage C" below)                                                                   | Aggregate table per (make, model, year): median + min/max power, displacement, mass, CO2, count; `ingest:rdw` + CSV seed + export; "Specs" card block; matcher on `makeKey`/`modelKey`; About credit; SCHEDULE.md row (6 months). Builds the pipeline D-H reuse                                                                                  | medium       | —                                 |
| **C2. RDW specs, more fields** — **done 2026-10-08** (see "Stage C2" below)                                                    | Extend stage C: gross mass, wheelbase, seats, doors, towing, dimensions, top speed (details under "Stage C2" below). Needs a migration + full re-ingest; a few new `SPEC_ROWS` entries + i18n                                                                                                                                                    | small-medium | C                                 |
| **C3. RDW specs, price + more** — **done 2026-10-08** (see "Stage C3 — done" below)                                            | New list price (ex-tax and original), body type, colours, cylinders, fuel mix, consumption, EV range, energy label, open-recall share (see "Stage C3")                                                                                                                                                                                           | small-medium | C2 committed                      |
| **C4. Estimated value** — **done 2026-10-09** (see "Stage C4 — done" below)                                                    | Rough current value = EU new price x depreciation curve by age, clearly labelled; price-over-years chart from C3 data                                                                                                                                                                                                                            | medium       | C3                                |
| **D. RDW recalls** — **done 2026-10-09** (see "Stage D — done" below)                                                          | Recall campaigns + status (upsert); "Recalls" block, labelled "EU (NL)", model-level wording; monthly refresh                                                                                                                                                                                                                                    | medium       | C (matcher)                       |
| **E. Open EV Data** — **done 2026-10-09** (see "Stage E — done" below)                                                         | One JSON -> small table; "Electric" block on a match for a car the register calls electric; MIT notice on About; **yearly at most (upstream data frozen at 2020)**                                                                                                                                                                               | small        | C                                 |
| **F. NHTSA recalls + complaints** — **done 2026-10-10** (see "Stage F — done" below)                                           | Live API behind a cache (7 d / 30 d), next to `api/safety`; market label "US" + "may not apply to your build" copy                                                                                                                                                                                                                               | medium       | D (shared Recalls block)          |
| **G. UK MOT**                                                                                                                  | Check newer files first; aggregate per make/model/year/failure item; "Common faults" block, worded as UK inspection stats; OGL statement on About; yearly                                                                                                                                                                                        | large        | C                                 |
| **H. Transport Canada recalls**                                                                                                | Quarterly CSV into the Recalls block, market "CA". Lowest value (mostly overlaps NHTSA/RDW) — build last or drop                                                                                                                                                                                                                                 | small        | D                                 |
| **Z. autoevolution specs**                                                                                                     | Only if they grant written permission and a data channel; then overlap check + "Specs" section (would sit beside or replace the RDW specs for models RDW lacks)                                                                                                                                                                                  | —            | their reply                       |
| **I. Car generations (Wikipedia + Wikidata)** — proposal 2026-10-09, last stage, not started                                   | Generation per (brand, model, year): code, label, production years, body styles, platform; "Generation XV40 (2006–2011)" line on the card (details under "Stage I" below)                                                                                                                                                                        | medium-large | — (reuses the C pipeline pattern) |

**Stage C — done (2026-10-08): RDW specs.** Source: opendata.rdw.nl (CC0). Power and CO2 are NOT in the main dataset
`m9d7-ebf2` (which has displacement, mass, dimensions) but in the fuel/emissions dataset `8ys7-d773`, keyed by kenteken, as TEXT
columns. RDW's SODA v3 query endpoint (`/api/v3/views/m9d7-ebf2/query.json`, POST) joins the two and aggregates (`median`, `min`,
`max`, `case`, `::number`) **server-side**, so the ~17M raw rows are never downloaded; the cheapest safe shape is one grouped
query per make (a whole-year query over all makes times out; per-make takes 1 s – 10 min, Toyota the worst). EV power is
`netto_max_vermogen_elektrisch`; CO2 is WLTP else NEDC; each measure is bounded in the query so typos can't become min/max.
Built: migration 0047 `registry.rdw_specs` (PK kind/make_key/model_key/model_year; min/median/max of power, displacement, unladen
mass, CO2; `n`), `scripts/src/rdw.ts` + `rdw-parse.ts` (cache per make in `scripts/.data/rdw/`; failures logged, retried once, re-run
resumes), seed `seed-data/rdw-specs.csv.gz` (105,902 rows, 1.7 MB, 510 makes with >= 50 vehicles, groups < 3 vehicles dropped),
`GET /api/rdw` (`apps/api/src/rdw/`), contract `packages/shared/src/rdw.ts`, matcher `rdwMatch.ts` (the VehiclesDB matcher widened to
`ModelReferenceRow`; `pickRdwYear` = nearest year within 3), web "Specs" block (`RdwSpecs.tsx`, label "EU (NL) data"), About credit,
SCHEDULE.md row (6 months). Kinds: Personenauto=car, Bedrijfsauto=truck (vans), Motorfiets=motorcycle, Bus=bus. Cross-make aliases
Renault Logan/Sandero/Duster -> Dacia added (own make is tried first, so VehiclesDB chips are unchanged).
**Coverage of the current registry** (share of vehicles whose make/model matches): cars **80.9 %** (6.2 % via loose prefix), trucks/vans
65.2 %, buses 32.6 %, motorcycles 18.1 %. The unmatched cars are structural — VAZ/Lada, ZAZ, Daewoo, Chery Amulet etc. were barely
sold in NL, so RDW has no rows; do not chase them. No chip and no `/stats` panel was built (owner to decide: a "136 hp" chip is cheap;
a `/stats` panel would mostly show the unmatched Soviet/Korean fleet). Follow-ups done the same day: small-sample warning + approximate counts, Emissions falls back to RDW CO2, tonnes/litres brackets, share link, per-row explainers. **Not browser-checked in the UI yet.**

**Stage C2 — done (2026-10-08): more RDW fields in the Specs block.** Built: migration 0048 (34 columns on `rdw_specs`: min / median /
max of gross mass, wheelbase, seats, doors, braked and unbraked towing, length, width, height, top speed; plus `*_n` for the four
partial ones), the aggregates in `specsQuery` (each bounded and NULL-safe; `count(bounded)` gives the partial counts), contract fields
in `packages/shared/src/rdw.ts` (`nullable().optional()` — cached pre-C2 answers lack the keys), `SPEC_ROWS` entries + `rdw.<key>` /
`rdw.about.<key>` strings in ua/ru/en, the registry's gross mass ("This car (registry)", from `totalWeight`) under the gross-mass row.
Rows: power, capacity, top speed, unladen mass, gross mass, towing x2, seats, doors, length, width, height, wheelbase, CO2. Kg rows
show tonnes in brackets, cm rows metres. **Decided: catalogue price skipped; the partial measures (length, width, height, top speed)
are hidden when fewer than `RDW_MIN_DISPLAY_N` (10) vehicles of that make/model/year have the value** — the same bar as the
"small sample" flag, applied per field in the API (`partial()` in `rdw.service.ts`), so the threshold can change without a
re-ingest. Complete measures (mass, wheelbase, seats …) follow the group's own small-sample flag. Bounds in the query: gross
100-60,000 kg, wheelbase 100-1000 cm, seats 1-120, doors 1-6, braked tow 1-60,000 kg, unbraked 1-5,000 kg, length 100-2500 cm, width
40-300, height 50-450, top speed 20-400 km/h. Towing/dimension 0 values are treated as "not recorded". Original plan notes:
**(was planned, owner asked 2026-10-08)** Same dataset (`m9d7-ebf2`, no join needed for
these), so the same per-make ingest with extra aggregates. Needs: a migration adding the columns to `registry.rdw_specs`
(min/median/max like the rest, or just median for counts), the new aggregates in `rdw-parse.ts` (`specsQuery` + `parseSpecsRecord` +
CSV columns), the contract fields in `packages/shared/src/rdw.ts`, one `SPEC_ROWS` entry each in `RdwSpecs.helpers.ts` (+ `rdw.<key>` /
`rdw.about.<key>` strings in ua/ru/en), then a **full `pnpm ingest:rdw -- --refresh` (~1 h)**, `export:rdw:csv`, and a new seed commit.
Fields and how well RDW fills them for cars (VW Golf sample, 2026-10-08):

- Gross mass `toegestane_maximum_massa_voertuig` (~100 %) — pairs with unladen mass as "kerb / gross", like the basic row (kg + tonnes).
- Wheelbase `wielbasis` (~100 %), seats `aantal_zitplaatsen` (~100 %), doors `aantal_deuren` (~90 %), towing `maximum_trekken_massa_geremd` /
  `maximum_massa_trekken_ongeremd` (~93 %), catalogue price `catalogusprijs` (~80 %, Dutch price incl. BPM tax — probably skip: misleading in UA).
- Dimensions `lengte` / `breedte` / `hoogte_voertuig` (~30–40 % filled) and top speed `maximale_constructiesnelheid` (~33 %) — partial:
  aggregate only over rows that have them and hide the row when too few vehicles (e.g. n < 10), never show a figure from a handful of cars.
- Min sample: **done in stage C follow-up (owner: show thin data too, with an explanation)** — groups of 3-9 vehicles are shown with a "small sample" warning and an "approximate figures" explainer; matching and year picking prefer well-sampled models/years (>= 10 vehicles) and only fall back to thin ones, so a stray thin spelling (RDW has Mazda "6" with 6 cars beside "MAZDA6" with 4,700) cannot shadow the real one. Found on DІ7635ІА (Mazda 6 2016 first showed 208 g/km from a US-spec grey import, vs 104–150 in Emissions).
- Known limit: the aggregate mixes fuels/engines of a model-year (petrol + diesel + hybrid), so the range is wide; grouping by fuel (and matching the registry fuel) is a candidate for C2.

**Stage C3 — done (2026-10-08): list price, body, colours, fuel mix, consumption, EV range, noise, label, recall share.** Migration
0049 (+66 columns on `rdw_specs`), full re-ingest (510 makes, 102,862 upserts, no failed make; ~40 min fetch), seed re-exported. Decisions:

- **Price:** `catalogusprijs` min / median / max (bounds 1,000-2,000,000 EUR) plus ex-tax = price / 1.21 - `bruto_bpm` per vehicle (no BPM on
  record = nothing subtracted: EVs are exempt, and ~4 % of petrol cars lack it, which the median absorbs) and BPM itself (1-200,000). UI rows read
  "New price in the Netherlands" / "… excl. VAT and BPM" / "BPM tax inside that price", rounded to 100 € (BPM 10 €), with a popover line saying it is a
  Dutch new list price, not a Ukrainian price or resale value. C4 reuses these columns; no chart or estimate was built.
- **Categorical measures** (fuel mix, colours, body types, energy labels) are **jsonb `[value, count]` pairs** + a `*_n` of vehicles that have the
  attribute; one query still, via fixed lists of conditional counts (`count(case(col='X',1))`) since SoQL cannot pivot. Colours (11 Dutch names), body types
  (11) and labels (A-G) keep the top 3; the fuel mix keeps every class. The API turns counts into shares (hidden under `RDW_MIN_DISPLAY_N` = 10), the UI
  shows classes >= 2 % as chips (new `RdwShareRow`, `SHARE_ROWS`). **Layout follow-up (2026-10-08):** Specs rows are grouped into 📂 folder sub-sections (`SPEC_GROUPS`, `VinToggleSection`, Engine open by default; the NL-fleet chips are their own "Dutch fleet" group; consumption & emissions last), the "Typical figures … Similar vehicles" footnote moved to the top, electric rows are hidden for combustion cars and combustion rows for EVs (`appliesToFuel`), and the Emissions section sits right after Specs.
- **Fuel mix: shown, not used to group the other measures.** Classes: petrol, diesel, electric, hybrid (RDW `NOVC-HEV`, includes mild hybrids), plug-in
  hybrid (`OVC-HEV`), gas. Grouping every measure by fuel would multiply rows/columns by ~6 and break matching to a registry fuel that is often wrong;
  the mix chip tells the reader why a range is wide (VW Golf 2015: 53 % petrol, 34 % plug-in hybrid (GTE), 11 % diesel).
- **Join fix (deviation, flag for review):** RDW lists a full hybrid's electricity as its _first_ fuel row and keeps CO2, consumption, noise and engine
  power on the second row. With the old first-row-only join only 1,566 of 5,795 Toyota Corollas (2021) had CO2. `FUEL_ROW` in `rdw-parse.ts` now joins row 2
  for those hybrids (14 duplicate matches in 788,000 Toyotas). This also corrects C/C2 power and CO2 for hybrids (engine, not electric motor).
- **Other fields:** kerb mass (`massa_rijklaar`, 50-60,000), cylinders (1-16; EVs report 0, excluded), consumption l/100 km (WLTP, else weighted PHEV,
  else NEDC text ::number; 1-40; `0.00` means unrecorded), EV kWh/100 km (Wh/km / 10, WLTP else the older field; 5-60) and EV range (20-1500 km), noise (text
  ::number; 40-120 dB, RDW has typos like 884). Each partial one has a `*_n`; the API hides a row with fewer than 10 vehicles (`partial()`). Kerb mass follows
  the group's own small-sample flag.
- **Recall share:** `recall_open_n` / `recall_n` (indicator Ja / Nee); API `openRecallShare` 0-1, hidden under 10 known vehicles. Wording is model-level
  ("X % of Dutch vehicles"), explainer says it cannot describe a particular car. **No longer shown in Specs (2026-10-08): the row, its i18n strings and info text were removed; the ingested data and `openRecallShare` stay for stage D.** Spot values: Skoda Octavia 2020 1.5 %, Tesla Model 3 2020 7 %.
- **Source limits found:** RDW's body label `stationwagen` is used for many hatchbacks (VW Golf 2015 reads 98 % "estate") — shown as RDW states it. `TOYOTA
COROLLA` is filed as "TOYOTA COROLLA" in recent years (5,795 in 2021), so a registry "COROLLA" still matches only the tiny bare "COROLLA" group — a
  matcher issue (unchanged, not C3). Old rows of the table that the re-ingest no longer produced stay (upsert only): 106,041 rows vs 102,862 upserted.
- Bind-parameter fix: `BATCH` 1000 -> 500 (114 columns x 1000 rows > 65,535 parameters).
- **Not browser-checked** (the UI was verified by types, lint, unit tests and the `/api/rdw` output only).

**Stage C4 — done (2026-10-09): estimated value chip, Ukrainian customs, NBU currencies.** No migration or ingest; everything is computed per request from the C3 columns.

- **Curve:** the Dutch BPM forfaitaire afschrijvingstabel (Belastingdienst, read 2026-10-09; licence not stated, numbers only, credited on About),
  `packages/shared/src/rdwValue.ts`. After 3 years it leaves 46 % of the new price (Autovista 47-59 % across Western Europe, cross-check). It
  reaches 100 % depreciation at ~17-18 years; **past that the estimate holds at a 5 % floor (`OLD_CAR_FLOOR_SHARE`) — OUR assumption, flagged
  "very rough"** (no open citable old-car curve exists; Autovista / Eurotax are paid). Range = estimate ±15 % (`VALUE_RANGE_SPREAD`), rounded to 100 EUR.
- **API:** `rdw.service.ts` adds `valueEstimate` (+ `newPriceEur`, `priceN`, `rough`, `extrapolated`) and `priceByYear` (years with >= 10 priced
  cars) to the match. Unlike the Specs price row, a thin price (< `RDW_MIN_DISPLAY_N`) still gives an estimate, flagged `rough`. Hidden only with no price at all
  or an amount under 100 EUR. New `GET /api/fx`: NBU official EUR and USD rates (`bank.gov.ua/NBUStatService/v1/statdirectory/exchangenew?json`), cached 6 h,
  last good value served if the NBU is down. NBU reuse terms not retrievable — a source link is shown.
- **Ukrainian customs** (`ukrCustoms.ts`): duty 10 % (0 % electric), excise = base rate (petrol 50 / 100 above 3000 cc, diesel 75 / 150 above 3500 cc EUR per 1000 cc)
  x cc / 1000 x age coefficient (full years after the production year, 1..15), VAT 20 % (electric too since 2026-01-01) on value + duty + excise. Excise from Tax Code
  art. 215 / Law 2611-VIII (primary text read); duty and VAT from broker and customs-calculator pages (the customs and Rada pages returned 403). **Not modelled:** pension fee
  (sources disagree), delivery, dealer margin, EV battery excise (kWh unknown), hybrids (treated as the combustion fuel). Computed in the web from the registry fuel and
  capacity of the car (RDW typical capacity as a flagged fallback). Example: Octavia 2012 diesel 1.6, EU ~2,200 -> ~4,800 EUR with customs; AUTO.RIA asks ~6,200-8,400 EUR, the
  rest of the gap is the steep old-car curve plus delivery and dealer margin.
- **UI:** green chip `~ € X–Y 💶` (⚠️ when rough) = EU estimate + customs, right-aligned between the chip row and the plate explainer; hover tip (value-by-age chart + one line
  with the Dutch vehicle count); a chevron opens one bordered block: clean EU value, duty / excise / VAT at the middle of the range, EUR / USD / UAH switch (NBU), caveats,
  AUTO.RIA link (`auto.ria.com/uk/car/{make}/{model}/year/{year}/`, a plain link; no RIA data is read) and a collapsed "Charts and explanation" folder. Share link `?section=value`.
  The "?" popover and a Specs-folder "Estimated value" block repeat the EU explanation (easy to delete). The panel and popover bodies are lazy chunks (preloaded on chevron hover).
- **Follow-up (2026-10-09, owner: "show as much data as possible, no new chips"):** (1) the range now widens with age — `rangeSpread()` in `rdwValue.ts`:
  ±15 % to 10 years, linear to ±35 % at 20+ (OUR choice; `estimate.spread` carries it and the explanation prints it); (2) an old-car note in the
  "Charts and explanation" folder when the 5 % floor is in use (`value.info.floor`, `floorStartYears()`); (3) **per-fuel prices**: migration 0050 adds
  `rdw_specs.price_by_fuel` (jsonb `[class, median EUR, n]`), the ingest query adds `pf_<class>` / `pfn_<class>` medians per fuel class (`FUEL_CLASSES`),
  `RdwMatchInfo.priceByFuel` feeds a "New price by version (fuel)" table (`ValuePriceByFuel.tsx`) in the value panel, shown when >= 2 classes; rows under
  `RDW_MIN_DISPLAY_N` cars are dimmed ("only 5 cars"). Needs `pnpm ingest:rdw -- --refresh` (+ `pnpm export:rdw:csv`) to fill; until then the table is absent.
  The Charts-folder headline follows the EUR / USD / UAH switch. (4) **Link preview for `?section=value`:** `PreviewService.describeValue` looks up the
  RDW estimate and prepends "Estimated EU value: ~€X–Y" (EU range, no customs) to the plate description; falls back to the plain preview without an estimate. Other sections still share the plain plate preview.
- **Not done / ideas:** RIA price data (forbidden without a written agreement; owner chose not to contact RIA); a licensed old-car curve (would replace the floor in `rdwValue.ts`);
  customs-declaration data (backlog below); no `/stats` panel; **not browser-checked on real devices**.

**Stage E — done (2026-10-09): Open EV Data "Electric" block.** Source: `data/ev-data.json` on the `master` branch of OpenChargingCloud/open-ev-data (MIT, © 2019 Niklas Hösl).
**Finding: the file is frozen — `meta.updated_at` and its last commit are 2020-07-30, 118 variants, 2011-2020 models only (no Model Y, ID.4, Ioniq 5 …).** The repo itself still gets commits, the data does not. Built: migration 0056 `registry.open_ev` (one row per variant: powertrain bev/phev, release year, usable kWh, kWh/100 km, AC kW + phases + ports, DC kW + ports; charging curves and per-point power are not kept), `scripts/src/open-ev.ts` + `open-ev-parse.ts` (Zod, `--dry-run`, `--export-csv`, `--from-csv`), seed `seed-data/open-ev.csv.gz` (5 KB, in `ingest:ratings:csv`), `GET /api/ev?brand&model` (`apps/api/src/ev/`, the VehiclesDB matcher over `open_ev` keys, cross-make aliases included), contract `packages/shared/src/openEv.ts` (own file), web block `OpenEv.tsx` (🔌, `LazySection`, share `?section=electric`, query key `['rdw','ev',…]` so it rides the rdw offline group), ua/ru/en strings, About credit. **Decisions:** the block shows only when the registry fuel resolves to `electric` (so a petrol Kona gets none; hybrids with electricity count); it lists every variant of the model, oldest first, and marks the one closest to the car's year; the vPIC "battery-electric" trigger from the original plan was not built (the registry fuel is enough). **Coverage:** ~32 % of registry vehicles with electric fuel (514k) match the file on an exact make+model key (166k; the real matcher is looser). **Not browser-checked in the UI.**

**Stage C3 / C4 / later RDW datasets — planned (discussed 2026-10-08; nothing started, owner says "go stage X").**
RDW publishes 68 datasets; the vehicle ones worth syncing (checked against the live catalogue, ids in brackets). All are CC0 for the
vehicle and recall data; **check the licence on the dataset page before adding any TGK or APK dataset.**

- **C3 — main (`m9d7-ebf2`) + fuel (`8ys7-d773`) fields, same per-make ingest, one migration, one re-ingest (~1 h). Do this before D so
  the recall share rides along.** `catalogusprijs` (new list price, ~100 % filled from 2010; incl. 21 % VAT and BPM, so also store
  ex-tax = price / 1.21 - `bruto_bpm`), `bruto_bpm`, `inrichting` (body type: hatchback / stationwagen / MPV, 100 %), `eerste_kleur`
  (colour distribution, top 3 colours), `aantal_cilinders` (96 %), `massa_rijklaar`, `zuinigheidsclassificatie` (Dutch energy label,
  ~70 %), fuel mix share per model-year (`brandstof_omschrijving` — fixes the known "petrol + diesel + hybrid mixed in one range"
  limit), combined consumption l/100 km, EV kWh/100 km and WLTP range, noise `geluidsniveau_rijdend`, and
  `openstaande_terugroepactie_indicator` aggregated as a **share of Dutch vehicles of the model with an open recall** (an EU-only
  statistic; per-plate it cannot apply to a Ukrainian car, so wording stays model-level). Skip: taxi / export / wheelchair flags.
- **C4 — estimated value.** `catalogusprijs` is the **new** price, not a resale price; RDW has no used prices. Plan: median new price
  per model-year gives a real "price when new over the years" series; an approximate current value needs an assumed depreciation curve
  (published ~15-20 % in year one then ~8-12 %/yr, or the official Dutch BPM depreciation table). Must read "rough estimate based on EU
  new price, not a market price" and never be shown as a Ukrainian price. Research first: other open price / index datasets (Eurostat,
  ECB car price indices) and depreciation sources. No paid RIA price API.
  **Design (decided 2026-10-09, owner approves each step; estimate ~3-5 h, one session):**
  - **Research step first, then stop for sign-off.** Find a published, citable depreciation curve (% of new price left by age).
    Candidates: the Dutch BPM depreciation table (official, but a tax schedule, not market prices), published used-car studies
    (~15-20 % year one, then ~8-12 %/yr; check licence/citation), Eurostat/ECB price indices (likely too coarse). Record the chosen
    source in a code comment and on About.
  - **Storage: none.** No migration, ingest, CSV seed or refresh job. New price already lives in the C3 columns of `rdw_specs`; the
    curve is a constant table in `packages/shared` (own file, so no offline-cache bust). Estimate = median new price x curve(age),
    computed per API request, so changing the curve needs no re-ingest.
  - **Charts (card):** an "Estimated value" block beside Specs (folder sections): (1) new price by model-year for the model — real RDW
    data; (2) estimated value by age with this car's year marked, shown as a range — real price x assumed curve, so labelled as such.
    Info popover wording: "rough estimate based on EU new price, not a market price, not a Ukrainian price". ua/ru/en strings, tests
    for the helper.
  - **Chip + popover (decided 2026-10-09, supersedes "block beside Specs" as the only placement):** a green "~ € X–Y" chip
    ("Est. value") in the result-card chip area, between the chips/"New <make>" row and the plate explainer, with a "?" popover
    (same pattern as the VehiclesDB chips) holding the explanation and the charts. Hidden when there is no RDW match or the sample
    is small. **Currency: euro** (the data is EUR; no exchange-rate dependency). Rounded, "~" prefix, range not a point value.
    The Specs-folder "Estimated value" block stays too for now (like Emissions, it duplicates the chip's data); easy to remove later.
  - **Stats view: not in C4.** Per-make/model averages would stack an assumption on an assumption; skip. A `/stats` panel later only
    from the real new-price data (e.g. models whose new price rose/fell most by year), and only if the card block proves useful.
  - **Price-source research (2026-10-09) — what is and is not allowed.** No free model-level used-car price dataset exists for UA, US
    or EU; everything below was checked on 2026-10-09 (terms may change; re-read before use).
    - **Forbidden / unusable:** AUTO.RIA — public offer `oferta.ria.com/auto` bans automated collection (cl. 1.6.1), parsing the
      database (1.16, 2.18), phone numbers entirely; EUR 500 per violation (1.6.6). Its API (cl. 2.19) bars redistribution and commercial
      use without consent; median price is freemium, period/AI price paid. Needs a written agreement with RIA before any price is shown.
      RST.ua — terms not retrieved (rules page 404); treat as forbidden until read. AutoScout24 — terms not retrieved, bot-protected;
      RWI-GEO-CARMKT (AutoScout24 listings, 30.8 M rows, 2019-2024) is non-commercial / research only. Cox Manheim index — data files
      login-gated, no public terms found. Mendeley "Used Car Price Prediction" (CC BY 4.0, 5,997 rows, scraped from unnamed sites) —
      too small and provenance unclear.
    - **Allowed, low value:** Eurostat / ECB HICP second-hand cars index (series `ICP.*.071120`, 2015 = 100, EU only; reuse with
      acknowledgement of Eurostat, state modifications). Market-timing only (range ~97 to ~117 since 2020), not per model/age, and no
      Ukraine series. Optional: one constant "market vs long-run" factor beside the curve; no ingest job.
    - **Worth checking after C4 (none verified as datasets):**
      - **Ukrainian customs (Держмитслужба) — checked 2026-10-09, usable but weak.** Open dataset
        `data.gov.ua/dataset/scsu-register-export-import-declarations-source`: licence **CC BY** (commercial reuse OK with credit
        to the publisher + link), monthly gzip JSON `CD_UA_YYYY-MM` (~30 MB each), no API. Published months only 2020-02 to 2024-01
        with gaps (nothing after 2024-01, despite "updated 2026"). Per goods item: month submitted, 10-digit UKTZED code, origin /
        export country, weight, units, `customsCostInUah`. **No make, model, year or VIN.** Sample (2024-01 file): 237,571
        declarations, 28,139 import items under 8703 (cars), median customs value per unit e.g. EV code 8703809010 ~ 710 k UAH,
        petrol 8703239013 ~ 155 k UAH. Gives a UA level by engine class / age bracket / origin country only. Declared value, often
        understated (bill 10380 cites manipulation). Possible use: one UA-vs-EU level factor; not per car. Not built.
        **Backlog, on demand (not scheduled after C4; start only if the C4 chip proves useful).** Placement if built: a separate line
        in the C4 card popover ("Ukrainian import declarations, 2024-01, were ~N % lower/higher than this EU estimate for this engine
        class"), never blended into the chip's EUR range; optional second marker on the value chart; `/stats` panel only later.
        Wording: declared customs value, mostly imports, as of January 2024, not a market price; credit the State Customs Service with
        a link (CC BY). **Estimate ~4-6 h, one session; DB < 100 KB** (stream ~36 monthly files, ~1 GB gz, keep 8703 import items,
        store a few hundred aggregate rows; committed gz CSV seed of a few tens of KB):
        1. `ingest:customs` + `:csv` + `export:customs:csv` (~1 h). 2. Migration, seed, refresh wiring (~0.5 h).
        2. UKTZED 10-digit decode (engine type, size, age bracket) from the official table, helper in `packages/shared` + tests
           (~1 h, **riskiest: mapping not yet verified**). 4. Match a car to a code from RDW / our fuel, cc and age; no line when
           missing (~0.5-1 h). 5. UAH -> EUR via a constant monthly NBU rate table (~0.5 h). 6. API field + popover line + ua/ru/en
           strings + attribution (~1 h). 7. Tests (~0.5 h). Risks: data ends 2024-01, extra FX assumption, partial car coverage.
      - **eAuto.org.ua** (Ukrainian market analytics from listing data: average age and price of used cars, imports vs domestic).
        Aggregate figures only; ask permission before reusing numbers. Could calibrate a UA-vs-EU level factor.
      - **KSE master's thesis 2021** (pricing used cars in Ukraine, 100,000+ deals) — find the full text for a citable age / mileage
        effect; only the table of contents was seen.
      - **Mileage:** none of the above has it. RDW registers odometer readings (cars from 2014, NAP before) but only a per-plate
        report with a logical / illogical verdict was seen; no open dataset of mileage values was found. NL cars only, so it would
        give an EU mileage-by-age profile, not a Ukrainian one. Low priority.
      - **eAuto.org.ua / KSE terms (checked):** eAuto data comes from Automoto.ua (~300 k ads, AUTO.RIA + OLX + RST), "All rights
        reserved", data only on request / paid reports. KSE thesis PDF could not be read by the fetch tool (download manually).
      - **Official registers (NL, DK, EE, PL, NO)** carry no sale prices (searched, nothing found); useful for fleet age mix only.
- **D — RDW recalls (campaigns).** Join key = `referentiecode_rdw`: campaign `j9yg-7rg9` (defect, remedy, risk, dates, vehicle count),
  make/type `mu2x-mu5e`, risk `9ihi-jgpf`, per-plate status `t49b-isb7` (open vs repaired counts per model), owner informed
  `mh8w-8cup`. One **Recalls** block, rows labelled by market (EU now, US from stage F, CA from H); the open-recall share from C3 is an
  EU-only line in it. Group the same global campaign across markets by defect description where it matches; otherwise show both,
  labelled. Never "this car has an open recall".
- **TGK gearbox / drivetrain (new, needs a feasibility test).** Type-approval catalogue joined through `typegoedkeuringsnummer` /
  `variant` / `uitvoering` from the main dataset: gearbox type + number of gears (`7rjk-eycs`; manual vs automatic is what UA buyers
  ask and the registry lacks it), drivetrain / engine code / hybrid & plug-in flags (`4by9-ammk`). Heaviest join (structured keys,
  a mapping step); extra detail in `gr7t-qfnb` (82 columns) and `byxc-wwua` (48) only if wanted.
- **APK defects (last, needs a feasibility test).** `a34c-vvps` (defects found per vehicle per inspection) + `hx2c-gt7k` (defect codes) +
  `sgfe-77wx` / `vkij-7mwc` (inspections): defects per vehicle by model and age = a free reliability signal, "Common faults"-style
  block labelled as Dutch inspection stats. Tens of millions of rows; check the server-side aggregate does not time out first.
- Not worth syncing: axles `3huj-srit` (trucks), odometer-verdict texts `jqs4-4kvw` (a verdict, not mileage — real mileage is not open),
  body / class / special-feature side tables (the main dataset's body field is enough), all "Parkeren" / garage / carpool datasets.

**Stage D — done (2026-10-09): RDW recalls.** Source: opendata.rdw.nl (CC0), three small datasets read page by page (no aggregation needed):
campaigns `j9yg-7rg9` (5,319), make/type links `mu2x-mu5e` (10,787 -> 10,780 after key collisions), hazard texts `9ihi-jgpf`. Built: migration 0054
(`registry.rdw_recalls` keyed on RDW reference code, `registry.rdw_recall_models` keyed on campaign + make_key + model_key), `scripts/src/rdw-recalls.ts` +
`rdw-recalls-parse.ts` (campaigns upserted, links replaced; `--dry-run`, `--export-csv`, `--from-csv`), seed `seed-data/rdw-recalls.csv.gz` (601 KB, one file with a `part`
column), `GET /api/rdw/recalls?brand&model` (`RdwService.recalls`: the VehiclesDB matcher over distinct recall make/types, newest `RDW_RECALLS_LIMIT` = 30 plus the total),
contract `packages/shared/src/rdwRecalls.ts` (own file), web "Recalls" block (`RdwRecalls.tsx`, `LazySection`, share link `?section=recalls`, 📣, "EU (NL) data" pill,
a `<details>` per campaign), ua/ru/en strings. The C3 open-recall share is a line under the block's footnote (read from the cached specs query). **Decisions:** the texts are RDW's
Dutch (no open translation) and are marked `lang="nl"`; campaigns have no model-year so the year is not filtered; the per-plate status dataset `t49b-isb7` is Dutch plates
and was not used; no cross-market grouping yet (that comes with NHTSA, stage F). Wording is model-level, never "this car has an open recall". **Not browser-checked in the UI yet;
the monthly refresh row is in SCHEDULE.md.**

**Stage D follow-up 1 — done (2026-10-09, same session): list, tags, explainers, static translations.** The block shows the first 3 campaigns, then "Show N more"
(`RECALLS_PREVIEW`); each row carries a market tag (`market` field on the recall contract, `NL` now, "🇳🇱 EU (NL)", so other countries slot in with stages F / H); every field label in an
expanded campaign has a "?" (`recalls.about.*`, `RdwRecallField`); a visible box at the top explains what a recall campaign is and how it relates to Ukraine (hedged: "no comparable open
register found"; `recalls.what.*`). **Category (19 fixed values) and hazard (5 fixed values) are translated statically** (`categoryKey` / `hazardKey` in `RdwRecalls.helpers.ts`,
`recalls.cat.*` / `recalls.hazard.*` in ua/ru/en; an unknown new wording falls back to the Dutch original).

**Stage D follow-up 2 — built + piloted (2026-10-09); the FULL translation run is the last stage, see the end of this file.** Free-text fields (defect, consequences,
remedy) are Dutch: **~11.4k distinct texts, ~1.66 M characters**. Translated with a free **local** model, no API key (the owner has none).

- **Built:** migration 0055 `registry.rdw_recall_texts` (`text_hash` = sha256 of the whitespace-collapsed Dutch text, `lang` en / uk / ru, `engine`, `quality`, `translated_at`; PK hash + lang + engine, so a
  paid API or a reviewed row can be added later as another engine without a migration; the API serves the newest / `reviewed` row per language and only when **every** present field of a campaign has it).
  `recallTextHash` in `packages/db`. `GET /api/rdw/recalls` returns `translations` per campaign (`rdwRecallTranslationSchema`, optional field). UI: the campaign header and the Defect / Consequences /
  Remedy rows show the translation first with an "AI translation (may contain errors)" label and a "Show original" switch (`RdwRecallField`, header state in `RdwRecalls`); no translation = Dutch with `lang="nl"` as before.
  Not a web lang file (it would ship to every browser). App language `ua` = stored `uk`. **Not browser-checked yet** (API and type-check verified).
- **Script:** `pnpm ingest:rdw-recalls:translate` (`scripts/src/rdw-recalls-translate.ts`). Node only (this PC has no Python): `@huggingface/transformers` 4.3.1 + NLLB-200-distilled-600M, **GPU via DirectML fp16**
  (`--device cpu` = q8; DirectML + q8 segfaults). Model downloads to `scripts/.cache/models` (git-ignored). Resumable and sliceable: `--max-minutes 60`, `--limit N` / `--offset N`, `--make`/`--model` (registry keys),
  `--langs`, `--dump file.md` (no DB writes). Saves every 100 texts. Sentence-level, each distinct sentence once. **Degeneration guard:** a segment that is empty, runaway-long or repeats a 3-gram 3× is retried
  with a harsher repetition penalty; still bad = that text gets no row in that language and shows Dutch. Speed measured: 100 texts x 3 languages in ~6 min incl. model load.
- **Findings (pilot on Toyota Camry, Škoda Fabia, Honda Accord, 90 texts x 3 languages; owner reviewed the UI and liked it, "leave it as is for now"):**
  - OPUS-MT (nl-en + en-uk) mangled technical words ("airbag" -> "ящик для повітря", "bezwijken" -> "збанкрутувати").
  - NLLB direct Dutch -> uk / ru still garbled airbag / dealer / owner ("сідма", "торговий дилер").
  - A glossary with placeholder tokens (`QX1Z`) made NLLB loop; tokens were dropped. A glossary of English rewrites (`rdw-recalls-glossary.ts`, `--gloss`) fixes dealer / owner but not airbag; **off by default**.
  - **Pivot Dutch -> English -> uk / ru (engine `nllb-600m-pivot`, the default) was clearly best.** Remaining errors are real ("ввільонник", "аероспад", "дилер товарних знаків" for brand dealer), hence the label and switch.
  - **fp16 batches > 1 hallucinate (repeated English)**: translate one segment at a time.
- **Fallbacks if quality is not enough later:** a larger NLLB model, more glossary terms, Claude / DeepL as a higher-ranked engine (needs a key), Dutch only for a language.

**Stage F — done (2026-10-10): NHTSA recalls + owner complaints in the Recalls block.** Source: `api.nhtsa.gov` (public domain, no key), **live, no table, no ingest, no seed, no
schedule row** — a bounded in-memory TTL cache in the API (recalls **7 days**, complaints **30 days**, 500 entries each, lost on restart; a failed call is a 502 and never cached).
Built: `apps/api/src/nhtsa/` (`NhtsaService`, controller, `nhtsa-parse.ts` with Zod on the upstream payload), `GET /api/nhtsa/recalls?make&model&year` and
`GET /api/nhtsa/complaints?make&model&year`, contract `packages/shared/src/nhtsaRecalls.ts` (own file), the Mazda "6" / Mercedes class / first-token model retry now lives in
`safety/nhtsa-models.ts` (`nhtsaModelCandidates`) and feeds both ratings and these endpoints, web `NhtsaRecallList.tsx` + `NhtsaComplaints.tsx` inside `RdwRecalls.tsx`,
queries `nhtsaRecallsQuery` / `nhtsaComplaintsQuery` (key head `safety`, so they ride the offline 'safety' group), ua/ru/en strings (`nhtsa.*`, `recalls.market.US`, a market-neutral
`recalls.what.body`), About credit extended. **Decisions:**

- **One Recalls section, two collapsible market sub-sections** (owner review 2026-10-10). After the what-is-a-recall box come "📂 🇳🇱 EU (NL) data (N)" (RDW list) and "📂 🇺🇸 US (NHTSA) data (N)",
  both **collapsed by default** (`VinToggleSection`, a "?" with the market hint each). Inside the US one: the "NHTSA lists N recall campaign(s)…" footnote, then the **Owner complaints** box, then the recall rows
  (3-row preview + "Show N more"). The section header count is EU + US campaigns; the block shows when **any** of the three has data (complaints alone still open a US sub-section, without the footnote).
  US queries need the model **year** (NHTSA is per model-year, unlike RDW) and start only when the section is opened.
- **Flags are inline SVG (`MarketFlag.tsx`, NL + US), not emoji** — Windows draws emoji flags as the letters "US". Used on the sub-section titles, the per-row market chips and the complaints chip; the `recalls.market.*`
  strings carry no emoji. A new market (stage H, CA) needs its flag added there.
- **No cross-market grouping** of the "same" global campaign (RDW and NHTSA share no id and the wording differs in language): both are listed, each labelled by market.
- **Texts are NHTSA's English, unmodified** (`lang="en"`), no machine translation. Row headline = NHTSA component label; fields = summary (defect), consequence, remedy, advisory
  (`parkIt` "do not drive", `parkOutSide`, over-the-air fix), campaign number, link to `nhtsa.gov/recalls?nhtsaId=`.
- **Complaints are aggregated server-side and only counts leave the API**: total, crashes, fires, injuries, deaths, top-5 components (a complaint can name several) and the newest filing date.
  The free-text narratives (they carry personal detail) are never forwarded. The copy says complaints are unverified owner reports, not findings.
- **NHTSA quirks found against the live API:** an unknown make/model/year answers **HTTP 400 with an empty `results` list** (treated as "no match", so the model retry continues);
  recall dates are `dd/mm/yyyy` but complaint dates `mm/dd/yyyy`; the same campaign can appear once per model spelling (deduplicated by campaign number).
- **Wording:** "recalls issued for this model year in the US", never "this car has an open recall"; the footnote and popover say a US-spec car can differ and a Ukrainian car may not be affected.
- **Coverage is thin by nature:** only US-market models. Spot checks 2026-10-10: Mazda "6" 2015 → 3 recalls / 60 complaints (via "Mazda6"), Toyota Camry 2015 → 1 recall / 271 complaints, ZAZ Lanos → nothing (section hidden).
  **Not browser-checked** (verified by types, lint, 884 unit tests and the live `/api/nhtsa/*` output only). Not done: Transport Canada (stage H); a persistent cache (add a table only if NHTSA proves unreliable — flat-file bulk load is the fallback in the cadence table).

**Stage I — proposal (2026-10-09, last stage; nothing started, owner says "go stage I").** Car generations from Wikipedia + Wikidata.
Prototype: `scripts/src/wiki-generations-probe.ts` (prints a table, writes nothing; run from `scripts/`:
`pnpm exec tsx src/wiki-generations-probe.ts "Toyota Camry"`). Licence: Wikipedia text/infobox CC BY-SA, Wikidata CC0 — facts only,
credit + link on About, same posture as the photo credits.

- **What the probe showed (15 popular models, 2026-10-09):** clean for Toyota Camry (XV10…XV80), VW Golf (Mk1…Mk8), Ford Focus, Honda
  Civic; Skoda Octavia / BMW 3 / Audi A4 returned one generation each, Opel Astra names without years; **no generation items at all**
  for Mégane, Qashqai, Tucson, Mazda6, Sportage, Lanos, Lancer. Wikidata overall: 375 series have generations (943 items, P179 =
  "part of series", P155/P156 = previous/next), 425 with an English article, **only 58 with a start date** — Wikidata gives the list and
  order, not the years.
- **Sources, in order of use:**
  1. Wikidata P179 chain for the generation list (+ ua/ru sitelinks for labels).
  2. Wikipedia **prefix search** (`list=prefixsearch`, "BMW 3 Series (") finds generation articles Wikidata misses (E21…G20 chain).
  3. **Section headings of the main article** for models without separate articles — `First generation (Typ 1U; 1996)`, `Third generation
(J12; 2021)` carry number, code and start year (Octavia, Qashqai, Tucson verified; Sportage not — API rate-limited the check). End
     year = next generation's start.
  4. `{{Infobox automobile}}` (50 titles per request) for `production`, `model_years`, `body_style`, `platform`, predecessor/successor.
- **Known parsing traps:** the probe takes min/max of every year in the infobox, which is wrong when regional production is listed
  (Golf Mk1 shows 1974–2009 because of South Africa) — prefer `model_years`, and the first production line / main-market year; strip
  `<ref>` and nested templates. Facelifts and regional variants ("North America") are separate articles — keep them as flagged rows or drop.
- **Storage / pipeline** (follows stage C): migration `registry.model_generation(brand_key, model_key, gen_code, gen_label, year_from,
year_to, body_styles, platform, wiki_title, wikidata_id, source)`; `ingest:generations` + `:csv` + `export:generations:csv`; a small
  committed override CSV for hand fixes; start from the top ~300 (brand, model) pairs of the registry and measure the hit rate before
  widening. Matcher = the VehiclesDB/RDW `makeKey`/`modelKey` matcher; pick the generation whose year range contains the car's year.
- **UI ideas:** generation chip/line on the card ("Generation XV40, 2006–2011") that opens the generation's facts; a line in the
  "About this vehicle" section with previous/next generation; the VIN page next to the decoded model year; generation-specific
  Commons photos (file names carry the code); generation as an extra key for the C4 depreciation curve. No line when nothing matches.
- **Risks:** messy registry model strings make matching the hard part; coverage is high for popular models and thin for rare ones (UI
  must simply show nothing); the data ages slowly — refresh yearly. **Estimate: 1-2 sessions** for the prototype-to-table step, +1 for
  API/UI. Not browser-checked (nothing built).

**Stage J — proposal (2026-10-10, last stage; research only, nothing started, owner says "go stage J").** Other countries' open vehicle
data. Input: `scripts/src/DATA/countries.research.txt` — an AI-search summary (Google-redirect links), **not authoritative**: terms below were
re-checked on 2026-10-10 against the portals; where a page was bot-blocked (Regitra, CAPTCHA) or 404 (Transpordiamet) it says so. Status
words: **clean** = licence read and compatible with a public product + credit; **research** = licence/dataset unconfirmed; **skip**.

- **Errors in the research file** (do not copy from it): INSEE does not publish the new-car series — SDES does, from the SIV register, and SIV
  reuse is licensed case by case; HistoVec is a per-owner lookup (needs the registration document), not a dataset; KBA's open data is
  statistics tables (stock / new registrations by make and model series) — no evidence of a Parquet feed or a public HSN/TSN → specs
  catalogue; Dataful states **no licence** (citation format only), a mirror says "License not specified"; the "China Data Portal" is a private
  aggregator, not MIIT/CAAM; Lithuania/Estonia "free CSV catalogues" were not found (see below); Korea "approved instantly" is true for the key,
  but the licence is per dataset.

| Source                                                                                                              | Terms found (2026-10-10)                                                                                                                                        | Verdict                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 🇩🇪 KBA open data ([kba.de](https://www.kba.de/EN/Service_en/OpenData_en/opendata_node_en.html))                     | "Data licence Germany – attribution – 2.0" (free use, copying, transfer if the source is named; licence PDF itself not readable by the fetch tool)              | **clean** (read the PDF once for the exact credit wording); FZ10 / FZ11 tables     |
| 🇦🇺 DataVic ([discover.data.vic.gov.au](https://discover.data.vic.gov.au/dataset/monthly-new-vehicle-registrations)) | CC BY 4.0 on the DTP datasets (a data.gov.au mirror says CC BY 3.0 AU — use the DataVic page). Make+model+colour counts; make+postcode+fuel counts, no model    | **clean**; only the by-model snapshots + monthly new registrations are useful      |
| 🇯🇵 MLIT ([terms](https://www.mlit.go.jp/links/terms-of-use.html))                                                   | PDL 1.0, compatible with CC BY 4.0, plus a per-dataset "important note"                                                                                         | **research** the exact recall + registration dataset pages (not located)           |
| 🇰🇷 data.go.kr                                                                                                       | Per dataset: many "제한 없음" (no restriction), some "출처표시 + 상업적 이용금지 + 변경금지" (no commercial use), some blank. Seoul new-car file is KOGL type 1 | **research** each candidate dataset's licence field before any build               |
| 🇱🇹 Regitra                                                                                                          | No open licence found; register data is released on request after a legal-basis / proportionality review. Open-data page is CAPTCHA-blocked                     | **research** by hand in a browser (regitra.lt/atviri-duomenys, data.gov.lt)        |
| 🇪🇪 Transpordiamet / avaandmed                                                                                       | No open vehicle dataset confirmed; `/en/open-data` 404; register is served via X-Road to institutions                                                           | **research** avaandmed.eesti.ee for "liiklusregister" / "sõidukid"                 |
| 🇪🇺 ACEA                                                                                                             | Only a 2015 notice found: reproduction needs prior written consent, ACEA named as source. Current terms not found                                               | **research** the footer legal notice; likely permission request (like Euro NCAP)   |
| 🇦🇺 NSW (TfNSW), ABS Motor Vehicle Census                                                                            | Not checked (ABS is normally CC BY 4.0)                                                                                                                         | **research**                                                                       |
| 🇮🇳 VAHAN / Dataful / indiadataportal                                                                                | Dataful: no licence; mirror: "not specified"; GODL-India probably applies upstream but not confirmed                                                            | **skip** (aggregates by RTO/fuel; nothing per model we lack); Roboflow plates: n/a |
| 🇫🇷 INSEE / SDES / SIV, HistoVec                                                                                     | SIV reuse = case-by-case licence; no open licence statement found for the series                                                                                | **skip**                                                                           |
| 🇨🇳 "China Data Portal", CAAM                                                                                        | Private aggregator, no licence; border/regulatory limits                                                                                                        | **skip**                                                                           |
| Encar / EnCarAPI, Japan Vehicle Data, auction sheets                                                                | Commercial listings / paid                                                                                                                                      | **skip** (same reason as carguru)                                                  |

- **Terms still to research (hand checklist, in value order):** (1) Lithuania — is there any per-vehicle open file at all; if yes licence,
  fields, whether plate/VIN are absent. (2) Korea — which data.go.kr datasets hold per-model registrations or type-approval specs and their
  licence field. (3) MLIT — recall announcements (リコール) dataset page + its PDL note. (4) KBA licence PDF wording + the FZ10/FZ11 file list and
  download URLs (and whether the `fzXX` xlsx are under the same licence as the portal). (5) ACEA legal notice. (6) Estonia. (7) ABS / NSW. For
  each: write the licence text, URL, date and attribution wording into this section (as for Euro NCAP above) before building anything.
- **Aggregation rule for every source here:** store only aggregates per (make, model, year) or per country; never plates, VINs or owner
  fields. Each source is its own removable block (own table, ingest, CSV seed, card section, i18n keys, About credit) like stages C–E.

**What could be added to the DB (only after its terms are read), with feature ideas** — the honest summary: country-level fleet totals add
little to a result card (same finding as Eurostat), so value comes from **model-level** facts and **name bridges**:

| Candidate                                                | New table / fields                                                                                         | Feature it would enable                                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KBA stock + new registrations by make / model series     | `market_stock(country, brand_key, model_key, year, count, source)`                                         | "Germany: #4 among new cars in 2019, 310k still registered" chip next to the VehiclesDB decile; a `/stats` page "what Ukraine imports vs what Germany registered" (a large share of the UA used fleet is ex-German), flagging models common in DE but rare here          |
| DataVic whole-fleet by model + monthly new registrations | same table, `country='AU'`; `registered_new` per month vs `on_road` per model                              | **Survival curve**: "of the 2008 Corolla registered new in Victoria, 61% are still on the road" — a durability / rarity line for old models and a second axis for the C4 value curve. Only RHD market: label it, never as a UA statistic                                 |
| Korea registrations by model, type-approval specs, EV    | `market_stock(country='KR', …)`, maybe `kr_specs`                                                          | Korean **domestic-market names ↔ export names** (Kia K5 = Optima, Hyundai Grandeur = Azera, Kia K3 = Cerato/Forte): UA imports many KR-spec cars under either name → alias rows for the matcher (see below); an "Electric" fallback for KR EVs missing from Open EV Data |
| MLIT recalls (Japan)                                     | `jp_recalls` shaped like the RDW recall tables, market label `JP`                                          | Recalls block gets a third market for the large JDM-import share (Toyota / Nissan / Honda / Mazda / Subaru); same wording rule as stage D/F: "recalls issued for this model in Japan", never "this car has an open recall"                                               |
| Lithuania per-vehicle register (if open)                 | aggregate like `rdw_specs` (median power / mass / displacement / fuel, count) keyed by make / model / year | A **second EU-spec source** for models RDW lacks, and a neighbouring used-car feeder market for the "Specs" block; no plates / VIN stored. Highest value but lowest odds of being open                                                                                   |
| ACEA monthly EU registrations by fuel                    | `eu_fuel_mix(month, fuel, count)`                                                                          | One `/stats` line "EV share of new cars: EU x% vs Ukraine y%". Cosmetic, needs permission — last priority                                                                                                                                                                |

**Wiki / model normalization state (verified 2026-10-10 against commits `f7f3292…cede223`)** — new sources spell models yet another way
(KBA "Modellreihe", DataVic ALL CAPS, Korean in Hangul), so the matching layer decides how cheap each import is:

- **Three separate layers exist, not one:** (1) `makeKey` / `modelKey` + `MODEL_ALIASES` / `CROSS_MAKE_ALIASES` (`vdbMatch`) drives VehiclesDB, RDW specs
  and recalls; (2) `wikiSearchName` (`wikiAliases.ts`) feeds only the Commons / Wikipedia photo search; (3) `modelFamily` (`modelFamily.ts`,
  ZAZ / Daewoo / Chevrolet Lanos) is **used by nothing except `export:model-families:csv`** (a review CSV). The photo aliases do not help VehiclesDB / RDW
  matching, and `modelFamily` does not feed stats grouping or any matcher. The Lanos alone sits on **63 raw brand/model pairs (335,210 cars)**, so
  `stats_by_model` and every per-model source split it.
- **Checked and working:** `vitest` on `wikiAliases` / `modelFamily` / `commonsImage` = 23 passed. `pnpm wiki-images:coverage` = **99.1 % of cars have a
  photo** (13,256,199 of 13,371,190; commit claim holds), but only **88.0 % of brand/model/year groups**; for models under 100 cars it is 76.6 %.
  Probes: `ваз 21063` → VAZ-2106, `заз t13110` → Sens, `bmw 320d` → 3 Series, `mercedes-benz e 200` → E-Class, `lexus rx350` → RX,
  `infiniti fx 35` → FX, `toyota corolla 1.33l` → corolla, diacritic-folded titles ("Doblò" = "doblo") all behave as described.
- **Verified gaps (all small, none visible to users yet):**
  1. `заз-daewoo t13010` / `заз-daewoo|t13010` (1,689 cars) are `not_found`: `modelFamily` knows `t13010` (Sens) but `wikiAliases` matches only `t1311…`.
  2. `wikiSearchName` returns null for `заз|lanos`, `chevrolet|lanos`, `заз-daewoo|sens`, which `modelFamily` maps to a family — harmless today (the rows
     are `ok`, via the lead-image fallback), but the two modules disagree; one table should feed both.
  3. Engine-size stripping skips the brand rules: `mazda|6 2.5` searches "mazda 6", `mazda|6` searches "Mazda6" (both found; cosmetic).
  4. Largest remaining `not_found` rows: Geely `jl7162` (9.8k cars; only `jl7152` is aliased), Honda `m-nv` (4.3k), Chrysler `gr.voyager` (1.5k),
     Skoda `octavia a8` (1.0k), Renault `taliant`, BYD `leopard 3`, Citroen `c1sx` (typo of C1), Smart `cabrio`. Cheap rules, ~0.2 % of cars.
- **Recommendation before stage J (or any new model-keyed source):** (a) make `modelFamily` / the wiki alias table feed the VehiclesDB / RDW matcher
  (one alias source, one test file), and group `stats_by_model` by family; (b) add a Korean / Japanese **domestic-name alias list** only when KR / JP data is
  actually built; (c) keep matching misses hidden — a new source never shows a section on a fuzzy guess.
- **Priority:** stage J is optional; its realistic yield is KBA + DataVic (clean licences, popularity / survival lines) and MLIT recalls (if the PDL note
  is fine). Everything else depends on the terms checklist above. **Estimate:** 0.5 session for the terms checklist; 1 session per source after.

**Stage M — model alias unification (prerequisite for stage F and J; owner chose "asap, new session", 2026-10-10; M1–M3 built 2026-10-10 (write-up: `docs/plan-done.md` "Model alias unification"); M4 not started until "go M4").**
Why: three alias layers exist today — `vdbMatch.ts` (`MODEL_ALIASES`, `CROSS_MAKE_ALIASES`, `makeKey`/`modelKey`; VehiclesDB, RDW specs, recalls),
`wikiAliases.ts` (`wikiSearchName`; photo search only, used by `wiki.service.ts` and `scripts/src/wiki-images.ts`) and `modelFamily.ts` (ZAZ / Daewoo /
Chevrolet Lanos families; used by nothing but `export:model-families:csv`). A rule added to one does not reach the others (verified gaps in the
Stage J "Wiki / model normalization state" list). Every new model-keyed source would otherwise need its aliases in three places.

- **M1 — one alias source (pure refactor, no behaviour change).** Put the ZAZ / Daewoo / Lanos / Sens knowledge in one module in `packages/shared`; `modelFamily`
  and `wikiSearchName` both read it. Existing tests (`wikiAliases`, `modelFamily`, `commonsImage`, `vdbMatch`) must pass unchanged; add a test that pins that
  `заз|lanos`, `chevrolet|lanos`, `daewoo|lanos 1.5`, `fso|lanos` give the same family and that `t13010` / `t1311x` both reach Sens.
- **M2 — feed the matcher.** `vdbCandidateKeys` / `matchVdbModel` try the family (so `ЗАЗ|lanos` hits the same VehiclesDB / RDW / recall row as `Daewoo|lanos`).
  Measure before / after with `stats_vdb` coverage and the RDW match count; a changed number needs an explanation, not a shrug. Keep "a miss hides the section".
- **M3 — cheap photo rules** from the verified `not_found` list: Geely `jl7162`, ZAZ `t13010`, Chrysler `gr.voyager`, Citroen `c1sx` → C1, Skoda `octavia a8`; then
  `--aliased` pre-warm, re-export `wiki-images.csv.gz`, delete the brand's `-alias` cache files first (cache is not keyed by the query). Re-run
  `pnpm wiki-images:coverage` and note the new figure (now 99.1 % of cars / 88.0 % of groups).
- **M4 — stats grouping (separate step, optional).** Group `stats_by_model` by family (Lanos is 63 raw pairs / 335,210 cars): a new migration + `pnpm db:refresh-stats`
  (slow, ~15+ min) + `pnpm db:refresh-derived`. Raw rows stay keyed by raw brand/model; the family is an extra column or a view, never a rewrite. Ask the owner before
  running the refresh on the real-data DB.
- **Out of scope:** Korean / Japanese domestic-name aliases (only when that data is built), any new data source, UI changes.
- **Definition of done:** `pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm test` green; `pnpm --filter @carplates/shared build` run (API / web consume `dist/`); docs updated
  (`docs/features-reference.md` alias convention, `docs/plan-done.md` write-up, one ✅ line in `PLAN.md`); then a commit message and stop.
- **Estimate:** M1 + M2 + M3 = 1 session; M4 = +0.5 (mostly the wait for the refresh).

Not planned (decided): VehiclesDB per-country deciles, derived body-type label, vPIC offline dump, Eurostat. (Wikidata moved into stage I; other countries into stage J.)

### Refresh cadence (data that lands in our local DB)

**Rule: implement a source's ingest, CSV seed, refresh command and schedule entry only when its card block is built** —
nothing below exists yet, and no table/script is created ahead of its feature. When a feature ships, add its row to
`SCHEDULE.md` (post-deploy recurring jobs) and its commands to CLAUDE.md. Until deploy (Phase 4) everything is manual;
cadence = how often to run it by hand, then by scheduler. Each bulk source follows the existing pattern: `ingest:<x>`
(download), `ingest:<x>:csv` (committed seed), `export:<x>:csv`, idempotent, then `db:refresh-derived` if a rollup depends on it.

| Source                                    | Stored in DB?                                                              | Upstream changes                  | Refresh                                                                        | Notes                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| RDW specs (aggregate per make/model/year) | yes, aggregated table (not the ~15M raw rows)                              | daily                             | **every 6 months** (new models/years only add rows)                            | re-run also after a registry ingest adds new models, so matching stays current               |
| RDW recalls (+ status)                    | yes                                                                        | continuous, new campaigns weekly  | **monthly** (weekly if recalls get prominence)                                 | status (open/repaired) changes, so upsert, not insert-only                                   |
| NHTSA recalls + complaints                | **no raw copy** — live API behind a cache (in-memory or small cache table) | continuous                        | cache TTL **7 days** recalls, **30 days** complaints; no scheduled job         | like `api/safety`; flat-file bulk load only if the live API proves unreliable (then monthly) |
| UK MOT                                    | yes, aggregated per make/model/year/failure item (not raw tests)           | one new annual file               | **once a year**, after the new year's ZIP appears; re-aggregate only that year | portal's newest file was 2023 — check before building                                        |
| Transport Canada recalls                  | yes                                                                        | monthly                           | **quarterly**                                                                  | low value; can be dropped                                                                    |
| Open EV Data                              | yes, tiny                                                                  | data file untouched since 2020-07 | **yearly** (check the repo for a newer ev-data.json)                           | re-run `ingest:<x>:csv` seed is enough between pulls                                         |

Result-card blocks: **Recalls** (RDW + NHTSA + CA, market-labelled), **Complaints** (NHTSA), **Common faults** (MOT),
**Specs** (RDW), **Electric** (Open EV Data). Status: **Specs (RDW), Recalls (RDW) and Electric built**; the others **not started**.

## Decisions on the former open questions (2026-10-08, best-practice defaults; owner may override)

- **Recalls, NHTSA or RDW only?** RDW (EU) first (stage D), because most of the UA fleet is EU-spec; NHTSA later (stage F) with
  an explicit "US" market label and "may not apply to your build" copy. Never "this car has an open recall". Owner re-confirms
  before stage F ships.
- **RDW specs granularity?** Aggregate per (make, model, year) with median + min/max + count; no per-generation (RDW has no
  generation field, and inventing one would be a guess). Look at the data at the start of stage C and adjust only if it is clearly unusable.
- **VehiclesDB per-country decile?** No — global decile is enough; per-country needs another file for little card value.
- **VehiclesDB motorcycle/truck/bus?** Yes, small and later (stage B); all kinds are already loaded.
- **Derived body-type label?** No — the registry's own `body` is better; `body_types` stays stored, unused.
- ~~Which Cyrillic make aliases would close the ВАЗ/ЗАЗ gap?~~ None needed — `brandSlug` covers them; see "Known gaps".
- gor3a/autoevolution: autoevolution replied 2026-10-08 (repo unauthorized, DMCA in progress, no permission yet); owner
  answered, awaiting their reply (= stage Z); the GitHub copy is not usable; nothing ingested.

## Method notes (to reproduce the overlap numbers)

Download `dist/vehicles.csv` from the VehiclesDB repo into a scratch folder (untrusted data; scripts elsewhere), export
`select brand, model, total_rows from registry.stats_by_model`, then match with `makeKey`/`modelKey` from
`@carplates/shared/dist` — exact key first, then same-make model prefix (≥3 chars) either way; collapse doubled model
spellings ("TRANSIT TRANSIT"). Scripts were scratch-only and are not committed.

**Last stage — Stage D2 full translation run (owner will do it later; nothing to build).** The pilot rows (engine `nllb-600m-pivot`, 3 models + ~200 texts from two test slices) are already in the DB; the rest is a backlog run:
`pnpm ingest:rdw-recalls:translate -- --max-minutes 60` repeated (or `--limit 1000` slices; resumable, stops on its own, no double work). ~11.2k texts left; roughly 3-4 s per text for all three languages on the RTX 3070.
After it: `pnpm export:rdw-recalls:csv` must also dump `rdw_recall_texts` (a second `part`, **not done yet** — the seed CSV carries campaigns and links only), then add the translate command to the monthly refresh row in SCHEDULE.md
(new campaigns only: it translates just the texts without a row).
