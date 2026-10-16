# Feature conventions reference

Moved out of CLAUDE.md to save tokens each session. Read only the section for the feature you're touching.

## VehiclesDB cross-market data

Files: `packages/shared/src/vdbMatch.ts` + `vdb.ts`, `apps/api/src/vdb/`, web `components/VdbChips.tsx`,
`routes/stats/VdbStatsPanel.tsx`, `scripts/src/vehiclesdb*.ts` + `vdb-stats.ts`; migrations 0039 `registry.vdb_models`, 0040
`registry.stats_vdb` (+ 0046 `vehicle_kind`: car/motorcycle/truck/bus; `vdbVehicleClass` maps the registry `kind`, `vdbCatalogKinds` limits catalog kinds).

CC BY 4.0 catalog of makes/models with the countries they are sold in and a popularity decile, used for the result-card chips
(top chip row) and the `/stats` Markets panel. A separate, removable block — credit "Vehicle data by VehiclesDB" on About. The
registry↔catalog link is only the `make_key`/`model_key` strings (no FK); matching is TypeScript (`matchVdbModelAcrossMakes` →
`matchVdbModel`, one code path for API/chips/rollup; curated `MODEL_ALIASES` / `CROSS_MAKE_ALIASES` (Renault Dokker → Dacia) only
for pairs verified in both sides; a miss hides the data). The seed CSV stores
the computed keys, so after changing `makeKey`/`modelKey`/`brandSlug` re-run `ingest:vehiclesdb` from the download, not `:csv`.
`stats_vdb` is stale until `pnpm db:refresh-derived`. Full status, gaps and refresh rules: DATASETS_PLAN.md ("VehiclesDB — built").

## RDW specs (EU / NL)

Files: `packages/shared/src/rdw.ts` (contract, own file) + `rdwMatch.ts`, `apps/api/src/rdw/`, web `components/RdwSpecs.tsx` +
`.helpers.ts`, `scripts/src/rdw.ts` + `rdw-parse.ts`; migrations 0047 `registry.rdw_specs` + 0048 (stage C2 columns).

Cross-links: `JumpTarget` (`RdwSpecs.helpers.ts`) = section | `history` | `vin` | `specs-<group>`; `ResultCard.jumpToSection` handles all of
them and is provided as `CardJumpContext` (`card-jump.ts`). Basic-section rows get a `RowJump` "📐↓" button (shown only when the target
has data: `hasSpecGroup`, size class); Value / Generation specs / Size / Emissions open with a `SpecsJumpLink` "↑" back to their Specs
group. `RdwSpecs` takes `openSignal` + `openGroup`; `VinToggleSection.openSignal` no longer fires `onOpenChange`.

CC0 data from RDW (Dutch vehicle authority): power, engine capacity, unladen and gross mass, combined CO2, top speed, towing limits, seats, doors, wheelbase and length/width/height as min / median / max per
(kind, make, model, first-registration year) — the "Specs" result-card block, labelled "EU (NL) data" (EU-spec, may differ from a
Ukrainian build). RDW's SODA server does the work: `ingest:rdw` posts one grouped, server-side-joined query per make (main
dataset `m9d7-ebf2` LEFT JOIN fuel/emissions dataset `8ys7-d773` on kenteken, first fuel row only) — the ~17M raw rows are never
downloaded. Power/CO2 live only in the fuel dataset and are TEXT columns there (cast with `::number`); EVs report power in
`netto_max_vermogen_elektrisch`; CO2 is WLTP where present, else NEDC. Each measure is plausibility-bounded in the query so a typo row
can't become a min/max. Matching is the VehiclesDB matcher (`matchRdwModel` → `matchVdbModelAcrossMakes`, widened to
`ModelReferenceRow`) over distinct RDW models, then `pickRdwYear` (nearest year within `MAX_YEAR_GAP`); a miss hides the block. Groups of 3-9 vehicles (`RDW_MIN_DISPLAY_N` = 10) are still shown but flagged "small sample" (owner: more info beats less); matching and year picking prefer well-sampled models/years and only fall back to thin ones (a stray thin spelling must not shadow the real one).
RDW `voertuigsoort` → kind: Personenauto=car, Bedrijfsauto=truck (vans), Motorfiets=motorcycle, Bus=bus; trailers etc. skipped.
Stage C2 measures live in the main dataset (no join); lengths are cm. Length/width/height/top speed are filled for only ~30-40 % of cars, so their aggregates run over the vehicles that have the value, `*_n` stores how many, and the API (`partial()`) hides a row built from fewer than `RDW_MIN_DISPLAY_N` (10) such vehicles. The contract fields are `.nullable().optional()` and `SPEC_ROWS` picks use `?? null` — cached pre-C2 answers have no such keys. Stage C3 adds the Dutch NEW list price (incl. 21 % VAT and BPM — labelled so; also ex-tax and BPM rows), kerb mass, cylinders, combined consumption, EV kWh/100 km and range, noise, and four categorical measures stored as jsonb `[value, count]` pairs with a `*_n` (fuel mix: petrol/diesel/ev/hev/phev/gas; top-3 colours, body types, energy labels) — the API returns shares and hides them under `RDW_MIN_DISPLAY_N`; the UI shows classes >= 2 % as chips (`RdwShareRow`, `SHARE_ROWS`). `openRecallShare` is still ingested and in the contract but NOT shown in Specs (reserved for a future Recalls section; model-level wording only, never "this car"). All new contract fields are `.nullable().optional()`, read with `?? null`. The fuel join takes row 2 for hybrids whose first fuel row is electricity (`FUEL_ROW`). The gross-mass row shows the registry's `totalWeight` under it.
UI: collapsible block, the "Typical figures … Similar vehicles" footnote on top, rows grouped into 📂 folder sub-sections (`VinToggleSection`, Engine open by default; `SPEC_GROUPS`: engine, mass, body, price, the NL-fleet chips, then consumption & emissions last, next to the Emissions section); rows carry a `powertrain` and `appliesToFuel(…, fuel)` hides electric rows for combustion cars and vice versa. Per-row ❓ explainers, brackets (hp / litres / tonnes), a "this car (registry)" comparison line, share link `?section=specs`, approximate vehicle count, and a small-sample ⚠️. Rows come from `SPEC_ROWS` (`RdwSpecs.helpers.ts`) — a new measure is one entry. The Emissions section (`FuelEconomy.tsx`) sits right after Specs and falls back to RDW CO2 (labelled, same score scale) when EPA/EEA has no estimate; the score is CO2/300 g/km capped at 100, a scale not a percentage.
Two RDW spellings that share a key collapse to the larger group (medians don't merge). Seed: `seed-data/rdw-specs.csv.gz`; after
changing `makeKey`/`modelKey`/`brandSlug` re-run `ingest:rdw` (cached per make in `scripts/.data/rdw/`, `--refresh` to re-query), not `:csv`.

### Result-card sections load on expand

A section's own request starts only when it is opened (`enabled: open`): Recalls list, Electric, News, Social, Stock photos — plus every section that was already click-only. Their headers always render (Electric only for electric fuels, Stock only for brands with an importer link), carry no count until the data is in, and show `section.empty` after an empty result. The exception is the RDW specs query: `EstimatedValueChip` in the card header shares its key with Specs/Recalls, so it fires on render. Side widgets (≥1400px, after the first scroll) share the News/Bluesky keys with the sections.

### Card bundle — one parallel request for the chips

`GET /api/card/:plate` (`apps/api/src/card/`, contract `packages/shared/src/card.ts` — own file, no offline-cache bust) answers, from the plate alone, what the card's chips would otherwise fetch after the plate row arrives: `vdb`, `rdw`, `ev` (electric fuel only), `models3d`, `models360`, `fx`, `wikiImage`, `wikiSpecs` (needs a year). Each part is exactly its own endpoint's answer; `plateQuery` (`lib/queries.ts`) fetches it **in parallel** with the plate lookup (4 s timeout, failure ignored) and `seedCardBundle` writes the parts into the chips' own query keys, never over existing data — so chips and sections are unchanged and a null part just falls back to its own request.

Rules: the bundle uses **local data only** — `WikiService.peekImage` (stored rows, never Commons) and `FxService.peek` (cached NBU rates, starts a background refresh when cold; never waits). New chip data that depends on brand/model → add it to `CardService` + the schema + `seedCardBundle` with the same key its query uses. `statsTopQuery` (global, ~19 kB) is prefetched with the plate on plate routes. Persisted-offline keys (`plate`, `vdb`, `rdw`, `wiki`) come back from IndexedDB without a bundle; `models3d` / `models360` / `fx` are not persisted and refetch on their own.

### Open EV Data — "Electric" block (stage E)

Files: migration 0056 (`registry.open_ev`), `scripts/src/open-ev.ts` + `-parse.ts`, `packages/shared/src/openEv.ts` (own file, no offline-cache bust), `EvService.lookup` (`GET /api/ev`, `apps/api/src/ev/`), web `OpenEv.tsx` / `OpenEv.helpers.ts`.

Model-level, European spec, **data frozen at 2020** (118 variants) — the popover says so. Same VehiclesDB matcher as Specs/Recalls (placeholder kind `any`). The block renders only when `resolveFuelCategories(c.fuel)` includes `electric`, so a petrol car of an EV-sharing nameplate (Kona, Golf) never shows it. Query key starts with `rdw` (offline group). Refresh yearly at most: `pnpm ingest:open-ev` then `export:open-ev:csv`; `ingest:open-ev:csv` is part of `ingest:ratings:csv`. MIT notice is the About source entry.

### RDW recalls (stage D)

Files: migration 0054 (`rdw_recalls`, `rdw_recall_models`), `scripts/src/rdw-recalls.ts` + `-parse.ts`, `packages/shared/src/rdwRecalls.ts` (own file, so no offline-cache bust), `RdwService.recalls`
(`GET /api/rdw/recalls`), web `RdwRecalls.tsx` / `RdwRecallField.tsx` / `.helpers.ts`.

Model-level only: a campaign covers a make/type, never a plate or VIN, so wording is "recalls RDW lists for this model", never "this car has an open recall". The model is matched with the VehiclesDB matcher
(`matchVdbModelAcrossMakes`, recall rows carry the placeholder kind `any`), so aliases and cross-make homes work as for Specs. Campaigns have no model-year -> no year filter. The API returns the newest
`RDW_RECALLS_LIMIT` (30) and the total. Texts are RDW's Dutch (`lang="nl"`, labelled in the popover). The web query key starts with `rdw`, so it is cached offline in the `rdw` group. Refresh monthly:
`pnpm ingest:rdw-recalls` then `export:rdw-recalls:csv` (campaigns are upserted, the links replaced); `ingest:rdw-recalls:csv` loads the seed and is part of `ingest:ratings:csv`.

UI details: the first `RECALLS_PREVIEW` (3) campaigns show, then "Show N more"; each row has a market tag (`market`, default `NL`); every field has a "?" (`recalls.about.*`); category and hazard are translated from RDW's fixed wording via `categoryKey` / `hazardKey` (an unknown wording stays Dutch, `lang="nl"`) while defect / consequences / remedy stay Dutch until stage D2 (planned in `DATASETS_PLAN.md`: `rdw_recall_texts` with an `engine` column, "AI translation" label, original-text switch).

#### Canada recalls without a US twin (stage H)

Files: migration 0060 (`ca_recalls`, `ca_recall_models`), `scripts/src/ca-recalls.ts` + `-parse.ts`, `packages/shared/src/caRecalls.ts` (own file), `CaRecallsService` (`GET /api/ca/recalls?brand&model&year`),
web `CaRecallList.tsx` / `CaRecalls.helpers.ts` (third group in `RdwRecalls.tsx`). Only Transport Canada safety campaigns since 2010 that have **no** NHTSA twin are stored (twin = same make + same
manufacturer campaign number, or same model within 120 days; decided at ingest from NHTSA's flat file), so the list adds to the US one instead of repeating it. Matching = the VehiclesDB matcher, as RDW recalls;
a `year` keeps campaigns covering that model year (or recording none). Text is TC's English ("Issue / Safety Risk / Corrective Actions", `multiline` on `RdwRecallField`); the 19 system labels are translated
(`ca.sys.*`, `systemKey`). Link: `wwwapps.tc.gc.ca/Saf-Sec-Sur/7/VRDB-BDRV/search-recherche/detail.aspx?lang=eng&rn=<number>`. Compliance/label notices are not recalls and are dropped. Refresh quarterly:
`pnpm ingest:ca-recalls` then `export:ca-recalls:csv`; `ingest:ca-recalls:csv` loads the seed and is part of `ingest:ratings:csv`. A new market needs its flag in `MarketFlag`.

**CA text translation:** `pnpm ingest:ca-recalls:translate` (the RDW NLLB script with `--source ca`, en → uk/ru, resumable) stores each heading's body in `rdw_recall_texts` (hash of the body, so repeats are done once). `splitCaText` / `joinCaText` (`packages/shared/src/caRecalls.ts`) cut the text at "Issue: / Safety Risk: / Corrective Actions:" (variants mapped by `caHeading`); `CaRecallsService.translations` reassembles it with localized headings, only when every section has the language, as `recall.translations[lang]`.

#### "Translate" on untranslated text (recalls, MOT, Wikipedia specs, generation chip)

`GoogleTranslateLink` sits under every untranslated field (and the RDW header): a **Translate** button that lazy-opens `TranslateDialog`, plus the always-visible external link (`GoogleTranslateAnchor`: logo + ↗, `translate.google.com/?sl=<source>&tl=<UI language>&text=…`, text capped at 2000 chars; Google cannot be iframed). The dialog (`lib/local-translate.ts`, `use-translate-dialog-actions.ts`) lists on-device engines for the pair, downloading nothing until the reader picks one: the Chrome/Edge built-in Translator API (size not reported) and OPUS-MT through transformers.js (lazy chunk; ~110 MB nl→en, ~105 MB en→uk, ~107 MB en→ru, nl→uk/ru pivots through English; shown before the download, then cached by the browser). The transformers chunk is excluded from the service-worker precache.

**Convention (decided 2026-10-11): no stored translations, no full translation runs.** Any value that is a source's own wording — free text, notes, raw strings that no `t()` key covers — is tagged `lang="xx"` and gets a `GoogleTranslateLink` (`text`, `from`) under it; the link renders nothing when `from` equals the UI language. Wired in: recall fields (`RdwRecallField`: RDW nl, NHTSA / Transport Canada en), UK MOT reasons without a static label (one link under the list: `untranslatedReasons` in `MotFaults.helpers.ts`, in `MotFaults` per group and `MotCarModal`), Wikipedia spec rows with the article's own words (`WikiSpecRow sourceLang`: engine `note` / `raw`, drive rows with `raw: true`; the language is the block's `enginesSource` / `driveSource` edition), and the generation chip's body styles. Values with a fixed vocabulary stay static i18n keys (categories, components, layout, fuel); a new source with free text follows the rule above. The in-place **Translate here** button shows whenever the browser translator can do the pair (`canChromeTranslate`): installed, or a pack it downloads on that click (progress % in the label). The Wikipedia summary (`CarWikiInfo`) gets the link when the article is shown in another edition. Several lines sent as one text (`untranslatedReasons`) are joined with `;` + a line break, so the translation keeps one item per line. A curated Wikipedia-spec source has `lang: 'curated'` (manufacturer's English page): `sourceTextLang` maps it to `en` for the link. Never put the link inside a `<button>` (nested interactive element): put it under the list instead.

#### NHTSA recalls + complaints (stage F)

Live, **no table**: `apps/api/src/nhtsa/` calls `api.nhtsa.gov` (`recallsByVehicle`, `complaintsByVehicle`) behind an in-memory TTL cache (recalls 7 d, complaints 30 d; errors are 502 and not cached). Contract
`packages/shared/src/nhtsaRecalls.ts` (own file). Per **model year** — the web queries need `year`. The model-name retry (Mazda "6" → "Mazda6", Mercedes "E 200" → "E-CLASS", first token) is the one shared
`nhtsaModelCandidates` (`safety/nhtsa-models.ts`); extend it there, not per service. NHTSA answers a non-match with HTTP 400 + empty `results` — that is "no match", not an error. Dates: recalls `dd/mm/yyyy`,
complaints `mm/dd/yyyy`. Complaints are returned as counts only (never narratives). UI: `RdwRecalls` shows two collapsed-by-default `VinToggleSection` sub-sections (📂 + flag + count) — EU (RDW) and US (NHTSA); the US one holds `NhtsaRecallList` = footnote, `NhtsaComplaints` box, then the campaign rows (English text `lang="en"`). Market flags are inline SVG (`MarketFlag.tsx`; Windows does not draw emoji flags) — add a flag there for a new market. Queries use key head `safety` (offline group). **Component translation:** NHTSA's top-level component (the part before the first `:`, ~42 fixed labels) is translated through `componentKey` (`NhtsaRecalls.helpers.ts` -> `nhtsa.comp.<slug>`), both as the campaign title and in the complaint chips (original in the chip `title` / a "NHTSA component" field); an unknown label stays English (`lang="en"`). Sub-parts after the colon, summary, consequence and remedy stay English (a D2-style translation table would be the next step). A new label = a `COMPONENT_SLUGS` entry + `nhtsa.comp.*` in ua/ru/en. Complaint components are split on commas except inside "FUEL SYSTEM, …" / "SERVICE BRAKES, …" (`COMPONENT_SEPARATOR`). Wording stays model-year-level and market-labelled (`recalls.market.US`).

### Estimated value (stage C4)

A copy button beside the chip copies the range in the **shown** currency only (`formatMoneyCopy`: `€ 10 600–14 400`, plain spaces, no "~"); the NBU rates are fetched as soon as the estimate shows (not only on panel open) so ₴/$ can be copied.

Chip `~ € X–Y 💶` on the result card = Dutch NEW price (C3 median, `rdw_specs`) x depreciation curve, plus Ukrainian import customs, computed per request; the only stored extra is `rdw_specs.price_by_fuel` (migration 0050, filled by `ingest:rdw`, in the RDW CSV seed). Details: `DATASETS_PLAN.md` "Stage C4 — done".

- **Shared (`packages/shared`, own files, not `schemas.ts`):** `rdwValue.ts` (BPM curve constant — source in its header comment; `retainedShare`, `estimateValue`, `valueCurve`; the 5 % old-car floor is our assumption), `ukrCustoms.ts` (duty / excise / VAT, cites Law 2611-VIII), `fx.ts` (`Currency`, `convertEur`, `/api/fx` schema). Rebuild `@carplates/shared` after editing.
- **Range and floor:** `rangeSpread(age)` = ±15 % to 10 y, linear to ±35 % at 20 y+ (our choice, `valueEstimate.spread`); `floorStartYears()` feeds the old-car note in the "Charts and explanation" folder.
- **Per fuel version:** `priceByFuel` (per fuel class median new price + car count) -> `ValuePriceByFuel.tsx` table in the value panel (>= 2 classes; rows under `RDW_MIN_DISPLAY_N` cars dimmed). No chip — everything extra lives inside the panel.
- **Contract:** `rdwMatchSchema` gained `priceByYear`, `priceByFuel` and `valueEstimate` (all new fields `.nullable().optional()`, read defensively — offline caches predate them). `rough` = the price has < `RDW_MIN_DISPLAY_N` vehicles; `extrapolated` = past the table.
- **Web:** `EstimatedValuePill.tsx` (range pill + hover tip + copy + "?", shown in the card header AND at the top of the section), `EstimatedValueChip.tsx` (header: pill + chevron that scrolls to the section and opens it via `ResultCard`'s `valueOpenSignal` + `LazySection forceMount`), `EstimatedValueSection.tsx` (the single lazy "Estimated value" section: breakdown, per-fuel table, charts folder; Specs no longer has a value sub-section), `use-estimated-value.ts` (shared query + price hook; currency is lifted to `ResultCard`), `UkrPriceBreakdown.tsx`, `EstimatedValueTip/Details.tsx`, `ValueByAgeChart/ValueLineChart.tsx` (dependency-free SVG), helpers + tests in `EstimatedValue.helpers.ts` (`ukrPrice`, `valueWarnings`, `formatMoneyRange`, `riaSearchUrl`). Customs run in the browser from the registry fuel and capacity. `effectiveCurrency` falls back to euros without NBU rates. Share link `?section=value` (in `SHARE_SECTIONS`). `InfoPopover` takes an optional `trigger` / `triggerClassName` (the chip is a hover target).
- **Rules:** the figure is never called a market price; every caveat is a ⚠️ line (`value.warn.*`); AUTO.RIA is a link only — its terms ban collecting data. A new caveat = a `valueWarnings` entry + `value.warn.<key>` strings in ua/ru/en.
- **Classifieds links:** `riaSearchUrl` / `rstSearchUrl` / `olxSearchUrl` + `MARKET_SITES` (`EstimatedValue.helpers.ts`) are plain make/model/year links, shown in the value breakdown (AUTO.RIA) and as the "Used {car} on: …" line at the bottom of `StockSection`; text links only, no site logos (trademarks, no licence). Slugs come from `marketSlug` (apostrophes dropped; `MARKET_SLUG_ALIASES` fixes spellings that differ between our sources and the sites, e.g. RDW `CEE D` / registry `CEE'D` → `ceed`). A model that 404s = a new alias entry + a test.

## UK MOT "Common faults" (stage G)

Files: migration 0058 (`registry.mot_keys`, `mot_stats`, `mot_issues`, `mot_baseline`, `mot_reasons`, `mot_meta`), `scripts/src/mot.ts` + `mot-aggregate.ts` / `mot-lookup.ts` / `mot-zip.ts` / `mot-store.ts`, `packages/shared/src/mot.ts` (own file: kinds, band edges, group codes, the `/api/mot` contract — no offline-cache bust), `apps/api/src/mot/` (`GET /api/mot?brand&model&year&kind`), web `MotFaults.tsx` (+ `.helpers.ts`), `MotFailChart`, `MotSparkline`, `MotIssueRow`, `MotHelp`, `MotReasons.ts`, query `motQuery` (key head `mot`, online-only on purpose).

DVSA anonymised MOT results (UK yearly roadworthiness test), OGL v3 — the About entry carries the required statement. **Model-level and UK-market**: wording is "in UK inspections of this model", never "this car will fail". Aggregated while streaming the ZIPs; raw tests/plates are never stored. Only years >= 2019 (new layout; loaded so far: 2021–25, see `mot_meta.years`); 2018 straddles the May-2018 directive, pre-2018 is a different schema.

- **Pooled counts, kinds apart:** cars (class 4), vans (7), motorcycles (1, 2) are separate keys (`kind`); normal tests (`NT`) that ended P / PRS / F; mileage miles -> km, tests with no mileage or more than 40,000 miles x max(age, 1) are dropped. A make/model needs >= 200 such tests over all loaded years to be stored.
- **Bands** (km, lower edges, one constant per kind in `mot.ts`): cars/vans 0, 25k, 50k, 75k, 100k, 150k, 200k, 250k+; motorcycles 0, 5k, 10k, 20k, 35k, 50k+. A band stores only its index — changing edges means re-running the ingest. A band (or model-year window) with < `MOT_MIN_BAND_TESTS` (200) tests is `null` ("not enough data").
- **Counting rule:** every issue count is **tests with the issue** (once per test, however many items); the 2021 and 2024+ item files (12 part / monthly CSVs) scatter a test's rows far apart (2025: repeats > 65k rows apart), so for a multi-part item ZIP (`MotFiles.scattered`) "already counted" is exact per test id (bit masks + `PairSet`, ~2 GB RAM); single-file years use a sliding window (`RECENT_TESTS`) over contiguous runs. Severity (dangerous) comes from the lookup category (`rfr_deficiency_category`), not `dangerous_mark`. `rfr_id` -> group is class-independent; reasons merge by wording into codes `group/item/fault` (DVSA renumbers ids), group codes are `MOT_GROUP_CODES` (derive from the node tree by name rules in `mot-lookup.ts`).
- **Stored shape:** `mot_stats` = chart-1 cells (kind, make, model, model year, band: tests, fails, tests with an advisory); `mot_issues` = per (model, band), pooled over model years: dangerous fails, per-group `[fails, advisories]`, the model's top-10 reasons; `mot_baseline` = the UK average per (kind, band); `mot_reasons` = DVSA wording of the stored reason codes; `mot_meta` = the pooled years (`years` array, migration 0064). A full ingest replaces all six tables in one transaction.
- **Adding a year (merge mode):** `pnpm ingest:mot -- --dir <folder> --years 2024 --merge` (add `--reuse-aggregate` to merge the cached `scripts/.data/mot/aggregate.json` instead of re-reading the ZIPs) **sums** the new year onto the tables (`mergeMotData` in `mot-store.ts`); it refuses a year already in `mot_meta.years`, so a year is never counted twice and **the raw ZIPs of the old years are not needed**. Approximation: `mot_issues.reasons` keeps only each run's top-10 reasons per model, so a reason in one run's top list but not the other's is under-counted (group counts stay exact). Models are tracked from each run's own census (>= 200 tests in that run). A plain run without `--merge` (re-)builds from scratch. The CSV seed carries the exact year list (`years` column of the `meta` line). The aggregate cache is overwritten by every run; `--years` runs of one year are what feed `--merge`.
- **2024+ file layout:** `dft_test_{result,item}_extracts_<Y>.zip` hold twelve stored (uncompressed) monthly CSVs, are **Zip64** (> 4 GB), comma-delimited and quote a field with `\"` (`SERIES 2 88\"`) — `splitQuoted` handles it. Info-ZIP `unzip` and Windows `tar.exe` cannot read them: **7-Zip must be installed** (`mot-zip.ts` tries `7z`, `Program Files\7-Zip\7z.exe`, then unzip / tar). Lookup = loose `dft_item_group_extract.csv` + `dft_item_detail_extract.csv` (no `lookup.zip`). Mileage has no unit column (miles, as since 2022).
- **Matching:** the shared VehiclesDB matcher over `mot_keys` (`matchVdbModelAcrossMakes`); registry cars try MOT kinds car then van, trucks van then car, motorcycles motorcycle only, buses nothing. MOT-only make alias `opel -> vauxhall` (`MOT_MAKE_ALIASES`). A miss hides the section ("Nothing found"). **Trim families:** DVSA's 2024+ files put the trim in the model ("EV6 GT-LINE"), so a model with no exact key is split over many keys; on a `prefix` match the API pools every key of the same make/kind that starts with the registry key (`mot-family.ts`: `motFamilyOf`, `mergeIssueRows`, name = shared leading words; a key ending in a digit never takes a longer number, "ix3" vs "ix35"). Exact matches stay one key (so "range rover" never swallows "range rover sport"). **Folded at ingest (2026-10-12):** `mot-fold.ts` (`MotFold`, applied in `KeyCache`, and by `foldCensus` to the cached censuses) counts a trim key under its base model: the longest whole-word prefix of the raw model text whose key is a _real model_ (>= 300 tests in both 2021 and 2022, the old base-name years; list in `mot-real-models.json`, rebuilt by `mot-fold-build.ts`). A real model is never folded ("transit connect", "range rover sport", "cooper s", "land cruiser" keep their own keys); word boundaries stop `viva`/`vivaro`, `gl`/`gla`. **Distinct models launched after 2021 that extend an older name** ("IONIQ 5", "MUSTANG MACH-E", "YARIS CROSS", "AYGO X", "C5 AIRCROSS", "SX4 S-CROSS", "GRANDLAND X", "CROSSLAND X", "DS 3 CROSSBACK", "TIGUAN ALLSPACE", "TOURNEO COURIER"…) were never seen in 2021-22 as their own key, so they are listed by hand in `MOT_KEEP_SEPARATE` (add a line when a new one shows up; audited 2026-10-12 against the 2024-25 censuses: groups >= 250 tests/yr). A kept-separate model never gets the EV split. Abbreviated spellings of a base name are expanded before the lookup (`MODEL_ABBREVIATIONS`: "DISCOVERY SPT" -> Discovery Sport, "RANGE ROVER SPT", "TIGUAN ASPACE"). Deliberately not split: body-style/variant words (Jazz Crosstar, Tipo Cross, Panda City Cross, V60/V90 Cross Country, A1 Citycarver, A3 e-tron, D-Max V-Cross, Mustang Mach 1), Niro EV/Soul EV (fuel-aware split), Corsa E, Mokka E, Leaf E+, and Mini "ONE/COOPER CLUBMAN" (trim-first naming). Trim keys under 200 tests a run are now pooled too, and a folded key's name is the base words (`baseModelName`). Changing the real list or the keep list needs a full rebuild of every year (`--merge` cannot re-fold old tables). **Electric split (2026-10-12):** `MotFold.split` counts a trim whose words after the base contain a standalone `EV`/`BEV`/`ELECTRIC` word under `<base>ev` ("NIRO 4 + EV" -> `niroev`, name "NIRO EV"); `PHEV`/`HEV`/`E-TECH`/bare `E` never match. Not split: models in `MOT_EV_ONLY` (electric throughout: Zoe, Leaf) and kept-separate ones (IONIQ 5…). `ingest:mot` gates it: an `ev` key below `MOT_MIN_KEY_TESTS` in the pooled census folds back into the base (`evAllowed`). Pre-2024 files carry no EV marker, so the `ev` key holds 2024-25 tests only. `GET /api/mot?fuel=electric|other` (optional; web sends it only when `registryFuelClass` is known, hybrids = `other`): an electric car on an exact match uses `<base>ev` when it has >= `MOT_MIN_EV_KEY_TESTS` (1,000) tests, else the base; no hint or `other` = base. Prefix families still pool by prefix, so they include `ev` keys. Change = full rebuild.
- **API windowing:** chart 1 uses the car's model year +/- 2 (then +/- 5, then all years) until the window holds 1000 tests (`window.widened` says so); the group and reason lines are always all model years.
- **UI:** lazy section `faults` (in `SHARE_SECTIONS`, `LazySection` in `ResultCard`), fetches only when opened. Toggle Both / Failed / Watch for; chart 1 = orange columns (fails), dashed blue line (tests with an advisory), black tick (UK average); groups as collapsible rows with their own small line chart, reasons inside; tapping/hovering a band highlights it in every chart; table view and a glossary (`MOT_TERMS` -> `mot.help.<term>.*`, a "?" popover beside each key term). Colours are the tokens `--color-mot-fail` / `--color-mot-watch` (dataviz palette slots 2 and 1, validated light and dark). Translations: UI + group names in `i18n/*.json` (`mot.*`); the 80 most frequent reasons in `MotReasons.ts` ([en, ua, ru] by reason code); every other reason is shown in DVSA's English (`lang="en"`), never machine-translated. A new top reason = one line in `MotReasons.ts`.
- **Reading aids:** a UK flag chip (`MarketFlag market="GB"`) marks the data as UK-only; a one-line description under the Both / Failed / Watch for toggle changes with the mode; the readout under chart 1 keeps the last band touched (so its "?" is reachable) and has a fixed height (no layout shift); the small charts pulse (`animate-mot-nudge`, random delay) until the first hover / tap. **"My car's mileage"** (`MotCarModal`): odometer km or a band chip (typing picks the band) -> that band's headline numbers, every group and the top reasons; shared as `?section=faults&tab=km<n>|b<i>` (`motCarTab` / `parseMotCarTab`, opens once the data is loaded). The modal panel is always full height; open / close use `animate-modal-backdrop` / `animate-modal-panel` (close = `data-closing`, unmount on `animationend`), and the content under the chips is re-keyed per band (fade + staggered rows). Reuse those utilities for any new modal.
- **Refresh:** yearly when DVSA publishes a new year (`SCHEDULE.md`): put the latest three years' ZIPs in a folder, `pnpm ingest:mot -- --dir <folder>`, `pnpm export:mot:csv`, commit the seed. The ZIPs are Deflate64 (neither Node's zlib nor `unzipper` reads them) and the 2021 pair is 12 part files with quoted comma-delimited rows — `mot-zip.ts` handles both layouts and ignores `__MACOSX` entries.

## Weight rankings

Files: migrations 0051-0053 (`registry.stats_weight`), `scripts/src/weight-stats.ts` (`pnpm db:refresh-weight-stats`, also in `db:refresh-derived`), `packages/shared/src/weightGroups.ts` (`WEIGHT_GROUPS`, `weightGroupOfKind`: passenger / truck / bus / motorcycle / trailer / other, plus "all"), web `routes/stats/WeightModels*.tsx`.

The group tab lives in `?weight=<group>` (shareable; a deep link scrolls the panel into view). Per (kind_group, source, brand, model): n, min_kg, max_kg. Registry weights are sanity-checked against `total_weight` and a per-kind minimum mass (300 kg cars/trucks, 50 kg two-wheelers/trailers); a model's edges are its 1st/99th percentile. Passenger cars that RDW recognises (`matchRdwModel`) use RDW's year-median unladen mass instead. `/api/stats/top` returns `weightBoards` per group (top 10 heaviest + lightest, per-group vehicle floor; defaults to `{}` so offline-cached answers still parse). UI: group tabs on `/stats` ("all" default), cards on the home page (a lazy `Home*Section`), and 🏋️ / 🪶 chips on the result card and in the export, ranked within the vehicle's own group. Weights show in kg, with tonnes in brackets from 1000 kg.

## Spec rankings

Files: migration 0063 (`registry.stats_spec`), `scripts/src/spec-stats.ts` (`pnpm db:refresh-spec-stats`, also in `db:refresh-derived`), `packages/shared/src/specMetrics.ts` (`SPEC_METRICS`), web `routes/stats/SpecModels*.tsx`.

Passenger cars only; per (metric, brand, model): n, min, max. Power / displacement = 5th / 95th percentile of the registry column (typos reach a few percent; pure-electric capacity is a placeholder and skipped). Height / length = matched RDW year-medians, else the model's Wikipedia generations; fuel tank = Wikipedia only (thin: ~5 ranked models until `ingest:wikispecs` covers more). Matching = `matchRdwModel`. `/api/stats/top` returns `specBoards` per metric (top 10 highest + lowest, API floor 500 vehicles, `stats_spec` stores models with >= 200; defaults to `{}`). UI: metric tabs on `/stats` under the weight panel. Registry-filed vans (Crafter, Transit) rank as cars.

**Explanations on /stats, /fuel, /safety:** each section carries a `SectionInfo` ❓ (`section.about.stats*` / `fuel*` / `safety*` in ua/ru/en: summary, boards, chart tabs, model rankings, distribution) listing meaning, sources and exclusions — add one for any new section on these pages. The collapse-all floating button (`ScrollButtons`) is plate / VIN pages only.

**Loading state of lazy sections:** a section that fetches after it expands shows `<SectionSkeleton />` (`components/ui/SectionSkeleton.tsx`), never a bare "Loading…" line. Sections that hide on a miss (Specs, Engines, Wiki) show nothing until matched.

## Community posts (Stack Exchange, Lemmy, Bluesky)

Files: `lib/community.ts` (keyless browser-side searches, Zod-validated), `lib/bluesky.ts`, `SocialGroup` + `CommunityPostCard`, `CommunityWidget`, `useSideCommunity`.

The Social section lists Bluesky, Mechanics Q&A (Stack Exchange "Motor Vehicle Maintenance & Repair") and Lemmy, each with a "More" link to the source's own search. The search term is "make model" — **without the year** (it empties the results). Side widgets (desktop, appear on scroll, latch via `useScrolledOnRoute`): left column = Bluesky, then Lemmy beside it (or in its place if no Bluesky); right = news, then Q&A beside it (or in its place); the second column needs >= 1760 px and shows ~1 s after the first. All widget chunks are excluded from the PWA precache (live third-party data).

## Export, wiki text and brand logos

- **"Copy all info"** (`lib/export-*`, `use-copy-all-info-actions`): sections come from the lookup plus RDW specs, VehiclesDB, the reviews catalog and videos, the value breakdown (EU value, Ukrainian customs in EUR/USD/UAH, per-fuel prices, caveats) NBU rates, the Recalls block (RDW / NHTSA + owner complaints / Canada) and UK MOT Common faults (builders in `lib/export-recalls-mot.ts`). **A new result section or data source must also be added to `export-report.ts` + `use-copy-all-info-actions.ts` (plus `export.*` i18n keys).** A `chart` section type is a table in clipboard/txt/md/csv and a canvas PNG (`renderChartPng`) in docx/pdf. VIN decode labels are localized with the English original in brackets (`useVinText`). `valueInfoLines` is shared with the on-screen value details (`EstimatedValue.helpers`).
- **Wiki:** `/api/wiki` fetches the full plain-text article (the `exchars` extract is capped at 1200), splits intro / sections server-side, falls back to the English edition (with a note) and strips IPA / CJK / "(listen)" parentheticals. The UI shows the intro with a "Read more…" toggle; the export uses the intro only.
- **Hero photo origin + refresh:** `GET /api/wiki/image` (and `/api/wiki`) answers `{ image, from }`; `from` is `db` (stored `wiki_image` row, or a memoized answer — a live fetch is stored at once, so only the first response says `live`) or `live` (Wikimedia asked for this request). `WikiHeroImage` shows it as a "DB" / "Wiki live" label (top-left, not translated). `?refresh=true` skips stored rows and caches, re-fetches, and replaces the stored photo; a refresh that finds nothing or fails never overwrites an `ok` row (`persist`). The "Update photo" button (bottom-left) calls it via `useCarHeroImageActions().refresh`, which sets the query data only when a photo came back. Unauthenticated, so gate it before a public deploy. `from` lives in `schemas.ts` (`wikiImageResponseSchema`, optional).
- **Alias input case:** `wikiSearchName` lower-cases brand and model itself — the API passes the registry's upper-case text, and the rules are written in lower case.
- **Wiki photo aliases:** registry models that Commons does not know by name (factory indexes `21104`, `110307`, `T13110`; `E 270 CDI`; `corolla 1.33l`) get a search name from `packages/shared/src/wikiAliases.ts` (`wikiSearchName`, keyed on the first word of `brand` because many rows hold `brand = "ваз 21063"`). `wiki_image` rows stay keyed by the registry name; the pre-warm search (`ingest:wiki-images -- --aliased`) and the live fallback in `wiki.service.ts` (lead image + Commons year search) both use the alias. New rule = edit `wikiAliases.ts` + its test, rebuild `@carplates/shared`, **delete that brand's `-alias` files under `scripts/.data/wiki-images/{search,lead*}/`** (the cache is not keyed by the query, so a stale `null` is reused), re-run `--aliased`, `export:wiki-images:csv`. Title matching (`commonsImage.ts` `normalize`) folds diacritics ("Doblò" = "doblo"). Coverage query: collapse whitespace with `[[:space:]]+`, as `wikiImageKey` does.
- **Non-passenger photos (КРАЗ):** the pre-warm loads passenger cars only unless `--all-kinds`. `wikiSearchName` maps КРАЗ indexes to their article (`63221` / `6322xx` → `KrAZ-6322`, other numbers as is; `krasz` is a trailer maker, not aliased) and `КРАЗ` lead images also try the `ru` edition. Registry rows often repeat the model in the brand (`краз 63221`), and that is the stored key, so `--brand краз` matches both forms. The API keeps "no photo" answers in memory — restart it after re-running an ingest.
- **Truck / van aliases (2026-10-13):** `wikiAliases.ts` also maps ГАЗ (Soviet numbers + 3302 → Gazelle), ЗИЛ, ПАЗ, УАЗ-452, MAN (TGX/TGS/TGA/TGL/TGM, L2000, F2000) and Mercedes Vario/T1 codes. Soviet articles are Cyrillic-titled: the lead-image guard accepts a Cyrillic title when an alias vouches for it, and the uk edition is where the article lives (en often returns the plant). Re-scrape one brand at a time: `pnpm ingest:wiki-images --aliased --all-kinds --min-cars 1 --brand X --rps 1`; `--retry-failed` also needs `--all-kinds` for trucks.
- **Seed CSV rule:** every change to `registry.wiki_image` must be followed by `pnpm export:wiki-images:csv` so `scripts/seed-data/wiki-images.csv.gz` stays the snapshot a fresh setup loads instead of re-scraping.
- **One alias source for ZAZ / Daewoo / Chevrolet Lanos:** `modelFamily.ts` owns it (`modelFamily`, `zazFactoryFamily`, `ZAZ_FAMILY_SEARCH`). `wikiSearchName` reads the factory-code rules and the search names from it (`zazFactoryFamily(m, true)` = code at the start only), and `vdbMatch.ts` (`zazDaewooFamilyKeys`) appends the family keys (`lanos`, `daewoolanos` — RDW's spelling) to `vdbCandidateKeys` and the `daewoo` / `zaz` makes to `vdbRelatedMakeKeys`, so ЗАЗ / Chevrolet / FSO / Daewoo Lanos and `T13010` / `T1311x` Sens reach one VehiclesDB / RDW / recall row. The own make and every direct, curated and series key are still tried first, a family hit is `how: 'alias'` (not the "loose" `prefix`), and a miss still hides the section. A new ZAZ / Daewoo rule goes in `modelFamily.ts` + `aliasUnification.test.ts`, never in `wikiAliases.ts` or `vdbMatch.ts` alone. Stats grouping by family (`stats_by_model`) is not done (stage M4).
- **Brand logos:** PNG-sourced logos ship as capped WebP (`pnpm --filter scripts build:logo-images`, originals gitignored in `apps/web/assets-src/kind/logos/`); `brandLogoUrl` returns `.webp` for those slugs, SVG logos unchanged. WebP, not AVIF — lossy AVIF fringes the white background under `mix-blend-multiply`. `BrandLogo` puts a solid white chip behind inline logos in dark theme.
- **About `SOURCES` logos:** 64 px circular/rounded WebP in `apps/web/public/icons/sources/` (sharp: resize 64, alpha mask for square PNGs), or SVG; a source whose terms forbid or do not clearly allow its mark (Euro NCAP, auction sites, Transport Canada) gets a plain `tile` instead.

## Test-drive racer

Files: `apps/web/src/lib/racer/`, `components/game/`; docs/plan-done.md "Test-drive racer game". Follow-ups: PLAN.md "Test-drive racer game".

Desktop-only, online-only game in a modal, opened from the promo banner beside the result card. Engine ported from javascript-racer
(MIT) — **never import its sprites/music (OutRun-derived / licensed to that project)**; cars are rear-view renders of CC0/CC-BY 3D
models (Sketchfab CC-BY sedan/hatch/sport/SUV/pickup/van/bus/motorbike; Kenney Car Kit CC0 for the taxi/police/ambulance/fire/garbage
specials — all credited on About; **check `asset.extras.license` in a GLB before using it: "SKETCHFAB Standard" and CC BY-NC are not
allowed**) tinted through a body mask (the body only needs to be its own material, textured is fine) (`lib/racer/vehicle-assets.ts`,
files in `lib/racer/assets/`, built by `scripts/racer-render/` with no Blender); the photo backdrops (the owner's own photos) are lazy
per id (`backdrop-assets.ts`, `lib/racer/backdrops/`); trees, signs and sound stay procedural. Steering sprites are mirrored per model
family — see docs/plan-done.md "Racer art pass". The engine is a dynamic-imported chunk (import it only with `import type` elsewhere)
and `RaceGameModal`/`engine` chunks are `globIgnores`d from the PWA precache. Settings are shareable via `?section=race&tab=…`
(`encodeRaceConfig`/`decodeRaceConfig`, validated); without a share link scenery, backdrop, lanes, traffic and resolution start
random on every opening (`randomScenery`/`randomBackdrop`/`randomLanes`/`randomTraffic`/`randomQuality` in `config.ts`). The HUD
shows speed, a bump counter (hits on cars/trees/signs, one per contact via a 0.7 s cooldown; a "crash test" warning at `BUMP_WARNING`, a "driving lessons" one at `BUMP_LESSONS`) and the km odometer (the lap readout is hidden; lap timing still runs in the engine). Update `RACER_SIZE_KB` after big changes (470
now: sprites ~365 KB + one ~100 KB backdrop + the engine).

**Standalone route `/race`** (`routes/RaceRoute.tsx`, sidebar 🎮, also in `ROUTE_TITLE_KEYS`, `STATIC_ROUTES`/`APP_PAGES` and the API's `spa-text.ts`): no plate or VIN — a random famous car of a random category (`lib/racer/presets.ts`: hardcoded make/model/year + paint per `CarBody`, `randomPreset`/`randomCar`), everything else random. The car-type chips pick a random example of that type (`onPickBody` on `RaceGameSettings`); a hand-picked colour clears the label; "🎲 Random car" re-rolls. The plate reads "CARS UA". No share link. `RaceGameStage.tsx` (intro, canvas, HUD, settings) is shared by the route and `RaceGameModal`. The HUD also shows a **km odometer** (`RacerHud.km`, engine `driven`: HUD speed / 100 = km/h integrated over time; counts this opening only, a restart keeps it). **Touch**: on `(pointer: coarse)` the stage overlays `RaceTouchControls` (← → left, ↓ ↑ right) driving `racer.setInput` — the same flags as the keyboard; settings collapse into a `<details>`; iPhone (no element full screen) uses a pseudo-full-screen. Next: `GAME_PLAN.md` (real-device pass, tilt).

## Accounts

Files: `apps/api/src/auth/`, `features/`; web `components/auth/`, `routes/features|admin/`.

User data lives in the separate `app` Postgres schema (migration 0034) — never mix it into `registry`, and treat it as the one part
of the DB that is **not** re-ingestable. Own thin auth: Google ID token verified locally → httpOnly `carsua_sid` cookie, only its
SHA-256 in `app.sessions`. Admins are granted by SQL only (`UPDATE app.users SET role='admin' …`); never add an API that grants
roles. The account contract is `packages/shared/src/account.ts`, **not** `schemas.ts` (that file's hash busts users' offline
caches). Account UI is online-only: `useSession()` reports anonymous while offline, query keys `auth|account|admin` stay out of
`lib/offline-cache.ts`, and the account chunks are `globIgnores`d from the PWA precache (add new ones there too). Controllers use
`SessionGuard`/`AdminGuard` + `@CurrentUser()`; cookies are set via `WithSessionCookie`, not `@Res()`.

**Favorites/history sync** (`apps/api/src/sync/`, `use-saved-sync-actions.ts`): IndexedDB stays the source of truth, deletes are
tombstones (`deleted: true`, 30-day TTL), conflicts = newest `date` wins per `kind:value`, lists capped at `FAVORITES_LIMIT` 100 /
`HISTORY_LIMIT` 200 (oldest dropped, no age expiry). Table `app.user_saved_entries`.

**Settings** (`/settings`, tabs; `apps/api/src/settings/`, `store/settings-store.ts`, `use-user-settings-actions.ts`): one JSON
document per user in `app.user_settings` (migration 0036), schema `userSettingsSchema` in `account.ts` — new tabs add fields there.
localStorage (`carplates.user-settings`) is the working copy; sync is whole-document last-write-wins by `updatedAt`. Holds the
default layer, saved streams (auto-saved when a stream is picked in the layers panel) and ≤ 5 background presets; the active preset
(or built-in defaults) is pushed into `useBackgroundStore` for signed-in users only.

**Admin Statistics** (`/admin?tab=stats`; `apps/api/src/usage/`, migration 0038): a global `UsageInterceptor` logs plate/VIN/photo
lookups and sign-ins into `app.usage_events` (kind, UI language, found, has-cookie — **never** the plate/VIN, IP or user id);
`GET /api/admin/stats` aggregates it, `GET /api/admin/analytics` proxies PostHog HogQL (10 min cache; needs
`POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`, optional `POSTHOG_API_HOST`, `SENTRY_ORG_SLUG` for the link). Add a new counted
route in `ROUTE_KINDS` + `USAGE_KINDS` (`account.ts`) + the `admin.stats.kind.*` i18n keys.

**Telegram login** (`auth/telegram-login.ts`, `POST /api/auth/telegram`, web `TelegramSignInButton` + `lib/telegram-login.ts`):
Login Widget payload verified by HMAC (key = SHA256(bot token)), `auth_date` ≤ 24 h. Identity `('telegram', <numeric id>)` only —
**`app.users.email` is nullable** (migration 0066), so `SessionUser.email` can be `null`; never assume it in UI/SQL. Telegram users are
never merged into a Google account (no verified email to match on). Env: `TELEGRAM_BOT_TOKEN` (secret) + `TELEGRAM_BOT_USERNAME`;
BotFather `/setdomain` needs https (use a tunnel locally). Both absent → `auth/config.telegramBotUsername` is `null`, button hidden.

**Email sign-in + /profile** (`auth/email-challenge*.ts`, `account-security.*`, `mail/`; web `EmailSignInForm`, `routes/auth`, `routes/profile`;
migration 0067): passwordless — `POST /api/auth/email/start` always answers 202 (no account enumeration), the mail holds a 6-digit code **and** a
magic link (`/auth/email#t=<token>`, fragment so it never reaches logs/Referer; the page POSTs only after a click so mail scanners can't consume
it). Challenges live in `app.email_challenges`: code stored as HMAC(`AUTH_SECRET`, id:code), link as SHA-256, 15 min, single use, 5 attempts,
≤ 3 sends / 15 min and ≤ 10 / day per address (counted in the DB, all purposes together). Set-email / re-auth mails are code-only (no link).
**Invariant: every `users.email` is verified** (Google `email_verified` or a code). Email sign-in attaches to the user with that email (this is
how it merges with a Google account); a Telegram user adds an email on /profile — if another account owns it the 409 `EMAIL_IN_USE` only appears
_after_ the code proves the mailbox. No password, no backup email: linked methods (email · Google · Telegram) are the recovery paths; unlinking the
last one is refused. **Sudo mode**: `SudoGuard` needs `sessions.auth_at` < 10 min (a sign-in counts), else 403 `REAUTH_REQUIRED`; the web
`ReauthGate` / `useRunSudo(mutation, vars)` opens the dialog and retries. Sudo routes: set-email, link/unlink, `DELETE /api/auth/me`.
Deleting only _schedules_ (`users.deletion_scheduled_at`, all sessions end, notice mail); any sign-in clears it, `AccountPurgeService` hard-deletes
after `ACCOUNT_DELETION_GRACE_DAYS` (14). A sign-in from a browser without a known `carsua_did` cookie (`app.known_devices`) on an account that
already had a device mails a "new sign-in" notice. Mail: `MAIL_TRANSPORT` = `log` | `smtp` | `resend` (`mail/mail.service.ts`), React Email
templates in `mail/templates.tsx` with copy in `mail/mail-text.ts` (ua/ru/en; sRGB hex only), preview at `/api/dev/emails` (dev). New mail kind =
add it to `CODE_MAIL_KINDS`/`NOTICE_MAIL_KINDS` + text; `render.test.ts` covers every kind × language. A global `OriginGuard` rejects cross-site
writes (`Sec-Fetch-Site` / `Origin`). Turnstile (`TURNSTILE_*`) guards "send code" and is skipped without a secret.

`GOOGLE_CLIENT_ID` is documented in `apps/api/.env.example`. `/features` is the feature opt-in route (no "paid" wording on the site;
toggles hidden while `AVAILABLE_PAID_FEATURES` is empty); FEATURES_PLAN.md wants the same URL for the guide — see PLAN.md Phase 5.

## VIN page

Files: `apps/web/src/components/vin/` (`VinResult`, `VinDecodeTabs`, `VinTypicalData`, `vin-text.ts` + `use-vin-text.ts`, `helpers.ts`).

NHTSA field names/values are localized client-side: every NHTSA variable and enumerated value has a `vin.var.* / vin.val.* / vin.vv.* /
vin.unit.*` key (ua/ru; the English original is shown beside it, the Raw tab stays English). A new NHTSA value shows untranslated until
a key is added — `vin-text.test.ts` covers labels, values, units, weight class and countries. "Typical model data" (`VinTypicalData`)
reuses the plate-card components (VehiclesDB chips, RDW Specs, Emissions) through `typicalLookup`, which maps NHTSA make/model/year/
fuel/type/displacement to registry-style inputs; it is labelled "≈ typical, not decoded". Crash ratings and wiki info go through the
`overviewExtras` slot so only the Overview tab shows them; so does `VinTypicalData` (VehiclesDB chips + RDW specs + emissions) — VIN page only, the plate card has its own sections for those. The "Copy all info" export (`export-report.ts`) also gathers RDW specs, VehiclesDB and the reviews catalog.

**Auction history** (`?section=auctions`, `AuctionCheck.tsx`, sites in `lib/auction-sites.ts`): lazy section on the plate card (valid VIN only) and the VIN page. `tier: 'main'` archives bind a search to the visitor's session, so they open `AuctionVinModal` (copy VIN, paste on the site); none has a VIN-in-URL search; Bidfax/Bid.cars open the language-matching home (`bidfax.info` ua, `en.bidfax.info` en/ru, `bid.cars/{ua,ru,en}`). `tier: 'extra'` sites (Copart — active lots only, opens pre-filled; IAAI, Stat.vin, OPENLANE, Encar) have no VIN archive and sit in a "More resources" list. The "imported — possible auction car" chip comes from `hasImportOperation` (import op codes **or** `ПРИВЕЗЕН/ВВЕЗЕН` in `operName`) over whatever history is loaded; the card's "imported" last-operation chip opens/scrolls this section via `openSignal` instead of linking to Advanced search. The URL patterns could not be verified from tooling (sites block bots) — recheck in a browser when touching them. Link-out only; the facts are static copy, no statistics. Each site is also listed on `/about#sources` (`AboutRoute.tsx` `SOURCES`, i18n `about.source.<id>`) as a plain `tile` — no logos: commercial marks, no licence found in their terms (mostly unreachable by tooling); add an icon only after written permission or published brand guidelines.

**VIN data starts in 2021**: `VinSince2021Note` (`vin.since2021.*`) explains that the registry has no VINs before 2021, so earlier plates/owners are not linked; shown under the registry history (VIN page + plate card), `variant="noVin"` when the plate has no VIN. Add it to any new view that links records by VIN.

**Imported-earlier chip**: `/api/plate` returns `everImported` (any used-import op in the whole VIN history, other plates included; `hasImportOperation` in `@carplates/shared`, new cars brought in by dealers excluded). `LastOperationChip` adds a second 🌍 "Was imported" chip when the last operation is not itself an import; it opens Auction history.

## Offline / PWA details

Rules in CLAUDE.md are the short form. Full detail: the service worker only exists in production builds. Changing a Zod schema in
`packages/shared/src/schemas.ts` discards every user's saved offline data (intended). Contracts in their own file (`vdb.ts`, `rdw.ts`,
`account.ts`) do not: the persisted IndexedDB cache is rehydrated without re-parsing, so a Zod `.default()` on a new field never reaches
old cached answers — make new fields `.nullable().optional()` and read them defensively (`match.aliases ?? []`). A new `/api/*` query
that should work offline goes into the persisted-cache rules in `lib/offline-cache.ts` (size-capped); heavy online-only endpoints
(`/api/stats`) stay out. Runtime caches are prefixed `carplates-rt-`. SPA cache headers: hashed assets immutable, `index.html` / `sw.js` /
manifest `no-cache` (`spa.controller.ts`). `@vite-pwa/assets-generator` must stay on v2 (sharp).

**`/install` page** (`routes/install/`): static explainer (what a PWA is, what the app does offline, limits, cache cautions, update/remove steps, best practice) + a live install button. `beforeinstallprompt` fires once and early, so `lib/install-prompt.ts` is imported from `main.tsx` and holds the event; the hook reads it via `useSyncExternalStore`. iOS has no such event (hint text instead). Copy is flat keys `install.<section>.h` / `install.<section>.<n>`; when you add a bullet, bump `items` in `routes/install/helpers.ts` and add the key in ua/ru/en. Update the copy whenever the offline scope (`globIgnores`, `OFFLINE_LIMITS`) changes.

## Link previews

Meta tags + `/og/*.png` are produced by the **API** (`apps/api/src/spa/`) on first load/deep link — Vite (`:5173`) never shows them. To
test: `pnpm build`, set `WEB_DIST_DIR=../web/dist` in `apps/api/.env`, restart the API, open `localhost:3000/<plate>` (Incognito, the
SW caches `index.html`). Plate/VIN pages are `noindex`; `?lang=` selects the language.

## Sitemap, robots and rate limits

- **Legacy VIN (not 17 chars):** the registry stores pre-1981 / Soviet chassis numbers in `vin` (e.g. `382590`). `ResultCard` shows them as plain text with an "old-style number" chip (`result.vinLegacy*`), no link, and skips the VIN decode section / NHTSA / VIN registry history. Test with `isVin` from `@carplates/shared`.
- `/sitemap.xml` and `/robots.txt` are generated by `SeoController` (`apps/api/src/spa/`) from `PUBLIC_SITE_URL`; they take precedence
  over any static file. The sitemap = every key of `STATIC_PAGES` (`spa-text.ts`) except the per-device `/history`, `/favorites`
  (`sitemap.ts` `EXCLUDED`). **A new public route must get a `STATIC_PAGES` entry (ua/ru/en)** — without it the page is `noindex` and
  absent from the sitemap. Settings/admin/plate/VIN pages stay out on purpose.
- **Languages:** every sitemap page is listed once per language (`/about`, `/about?lang=ru`, `?lang=en`; default `ua` = bare path), each
  `<url>` with the full `xhtml:link` hreflang set + `x-default`. The page `<head>` mirrors it (`alternates: true` in `renderMetaTags`):
  self-canonical per language + `<link rel="alternate" hreflang>`. Helpers `langUrl`/`alternateLinks` in `meta.ts`. Plate/VIN pages stay
  `noindex` with a bare canonical.
- Rate limits: one global `ThrottlerGuard` (`AppModule`, `common/throttle.ts`) counts **only `/api/*`** per IP (short/medium/long).
  Heavy or enumerable routes add `@Throttle(...)` constants from the same file (plate, VIN); never skip a route without a reason
  (`/api/auth/me` is the only skip). recognize/auth/og keep their own tighter module-level guards. Behind a proxy set `TRUST_PROXY`.
- Legal/cookie/monetization findings: `docs/legal-and-monetization.md`.

## Plate regions

`regionName` (`packages/shared/src/regions.ts`) = letter prefix (`REGIONS`) or, for digits-first legacy plates, `LEGACY_REGIONS`.
`DІ`/`ЕD` plates (`plateSeries`) are online-service series with no region by design. `registry.plate_regions` (stats rollups) mirrors both
tables — change them together, in a new migration (0045 holds all 108 statutory pairs + code 31); `regions.statute.test.ts` asserts the
tables equal the statute, so edit it with them. A pair is the region at issue, not the car's location.

- **Top-models boards read `stats_model_grouped`, not `stats_by_model`:** ZAZ / Daewoo / Chevrolet spellings are folded by `modelFamily` into one row. Rebuild with `pnpm db:refresh-model-family-stats` (after `db:refresh-stats`; `db:refresh-derived` does it). Raw `stats_by_model` still feeds the search model suggestions.

## Body type spelling ("-B")

The registry writes the body with a licence-category suffix (`КАБРІОЛЕТ-B`) for registrations dated up to 2020 and without it from 2021 — same vehicles, same kind / purpose / fuel (checked 2026-10-11 on cabriolets: no overlap, cut at 2021-01-01). `normalizeBody` (`vehicleBody.ts`) strips a trailing `-B` / `-В`; the card, AR card, export and the "?" popover use it, `mergeBodyStats` sums the two `stats_by_body` rows at read time (`/api/stats`, `/api/stats/field/body`, body suggestions), and the advanced-search body filter normalizes its input (it is a substring match, so plain `СЕДАН` already hits both). Stored data and the rollup are untouched — no migration, no refresh. `resolveBodyCategory` keyword rules ignore the suffix. Use `normalizeBody` for any new body display or grouping.

## Registration status (last operation)

- **What it is:** a vehicle's status = its latest registry operation (`current_registration.oper_code`, e.g. 215 = ТИМЧАСОВИЙ ДЕРЖАВНИЙ ОБЛІК ТЗ ЗА ВІЙСЬКОВОСЛУЖБОВЦЕМ). `operStatus()` in `apps/web/src/lib/oper-info.ts` maps a code to one of 9 statuses (military / temporary / properUser / new / import / owner / modification / deregistered / other); it reuses `operCategory` and splits out 2xx.
- **Result-card chip** `LastOperationChip` — built from the plate payload (`current.operCode/operName/dReg`), no extra request; links to `/advanced-search?oper=<code>`.
- **Advanced-search filter** `oper=<code>` (exact code, `ix_current_reg_oper_code`); dropdown from `GET /api/search/operations` (`stats_by_oper`: one row per code, most common name, vehicle count by _current_ status). Contract in `packages/shared/src/operStatus.ts` (not `schemas.ts`). `stats_by_oper` is rebuilt by `db:refresh-stats`.
- Filter by **code, not name**: the names have many spelling variants per code. (`0011_stats_by_origin.sql` warns codes can be reused across years; for the codes surfaced here the name is consistent.)

## Powertrains panel (/fuel)

`GET /api/fuel/powertrains` (`apps/api/src/fuel/powertrain-stats.service.ts`, contract `packages/shared/src/fuelPowertrains.ts` — own file, no offline-cache bust) is computed live from `registry.stats_fuel` (passenger cars; refreshed by `db:refresh-fuel-stats`, no extra table or ingest). Per fuel class: count, % of fleet, distinct brands/models, avg CO₂, top 50 models, top 30 brands, 30 rarest models with >= 5 cars (`RARE_MIN_CARS`, single-car rows are registry noise) and the model-year share trend (2000+, newest 15). Each model/brand row carries `classShare` (% of the class) and `modelShare`/`brandShare` (% of that model's cars, all fuels, that are this class). `hybrid` = hybrid + plug-in together: the registry fuel text cannot tell them apart. UI: `PowertrainPanel` (table + drill-down, default electric) above the CO₂ tabs; keys `fuel.pt.*`.

## Car generations

Files: `packages/shared/src/generations.ts` (contract, own file; `pickGeneration`, `generationSpan`), `apps/api/src/generations/`, web `components/GenerationChip.tsx` + `.helpers.ts`, `scripts/src/generations.ts` + `generations-parse.ts`; migration 0061 `registry.model_generations`.
Same VehiclesDB matcher as Specs/Recalls (placeholder kind `any`, cross-make homes). A chip renders only when the car's model year falls inside a known span — never on a guess; a year shared by two generations picks the newer and the popover says so. Rows come from Wikidata (CC0) + Wikipedia (CC BY-SA), facts only, credited on About; `year_to` NULL = still produced. Query key starts with `rdw` (offline group). Refresh yearly: `pnpm ingest:generations` then `export:generations:csv`; the ingest replaces only the processed models' rows. Parsing traps are covered in `generations-parse.test.ts` (first range only, month names, nested variants, ordinal gaps in headings).

A model with one generation (VAZ-2109, Lanos, Sens) has ONE row, `source = 'single'`, empty code and label: the chip stays hidden (`match.total < 2`) and only the Generation specs section uses it, with model-level wording. `generations-titles.csv` (`query,title[,lang]`) pins article titles the search cannot find; an optional `lang` (default `en`) reads that edition instead — the stored `wiki_title` then carries a `de:` prefix (`splitWikiTitle` / `wikiTitleUrl` in shared), `fetchSeries` skips the en-only Wikidata/prefix sources for it (headings or a single row from the article's own infobox years), and `ingest:wikispecs` makes that edition the primary one (`editionTargets`: the other editions come from its langlinks). Nothing in the web app reads `wikiTitle`; the spec source link uses the page's own `lang` + `title`; the source with the fewest defects wins (`chainScore`) and the others fill its holes.

## Generation specs (Wikipedia, stage K)

Files: `packages/shared/src/wikiSpecsApi.ts` (contract, own file; `wikiSourceUrl`), `apps/api/src/wikispecs/`, web `components/WikiSpecs.tsx` + `.helpers.ts`, `WikiEngineCard.tsx`, `WikiSpecRow.tsx`, `WikiSourceLine.tsx`; data `registry.model_spec_wiki` (migration 0062, `scripts/src/wikispecs*.ts`, seed `wikispecs.csv.gz`).
Power cell rule (`cellPower`): a line naming the system total (`zusammen`, `Gesamt`, `combined`, `суммарн…`; the label may be the line before the figure) is the figure; otherwise several lines are one range (min–`powerKwMax`) unless a line is under 25 % of the strongest — that is a hybrid's motor / 48 V booster and is ignored. `productionSpan` also reads the de `Infobox Motorrad` pair `Produktion von` / `Produktion bis` (missing end = still produced).

`GET /api/wikispecs?brand&model&year` finds the model with the generation chip's matcher (`GenerationsService.locate`), picks the generation by year (`pickGeneration`), reads the row keyed `(make_key, model_key, generation.yearFrom)`; no model / generation / stored figure = `match: null` and the section is hidden. Share id `engines`; query key starts with `rdw` (offline group); every contract field is `.nullable().optional()`.
A table row whose first cell spans ≥ 5 columns and states a power is a footnote and is dropped (it would be repeated into every column); the row `Dauerleistung laut Zulassung` is not a power row; a header naming both displacement and engine code is an `engine` column. Table layouts (`tableSpecs`): row per engine, column per engine, and **transposed model-year** (header `Model year | 1999–2002 | 2003 | 2017–present`, a row per attribute; only with `yearFrom`, one column, first line of a cell, empty cell = no value, used even in `series` articles; dry weight ignored, wet = kerb).
Rules: values are **catalogue values for the generation, not for this car** (footnote + popover); each block (engines, drive/gearbox, dimensions) carries its own source edition, shown as "Wikipedia (RU)" with a link. Dimensions / mass / tank exist only where RDW has no row, so they live in this section, not in `RdwSpecs` (which is hidden on an RDW miss). Engine card rows come from `engineRows`; the parser (`wikiSpecs.ts`, `COLUMN_KINDS`) reads the code column's header (en / ru / uk / de) and stores **`engineCodes`** ("Engine code", "Motorcode", "Motorkennbuchstaben", "Код двигателя / двигуна") or **`chassisCodes`** ("Chassis code", "Кузов", "Baureihe", "Model code"); whenever a header named the column `engineCodes` is written, even empty, and that presence is the "both lists are exact" marker. An ambiguous header ("Code", "Type/code", "Engine and code") leaves `engineCodes` unset and the whole column in `chassisCodes`; `wikiRowCodes` then falls back to `splitWikiCodes` (shape guess, also for old rows and offline caches; the popovers say so). Both the parser (`chassisOf`) and the guess drop gearbox words (`GEARBOX_WORD`: `3-phase`, `N-speed`), and `chassisOf` strips a trailing `-` from a code. `engineCodes` lives in `wikiSpecsApi.ts`, so it is `.nullable().optional()` and offline-safe. A new row = a key in `ENGINE_ROW_KEYS` / `DIMENSION_KEYS` plus `wikispec.row.*` and `wikispec.about.*` strings in all three languages. Not in the card bundle yet.
**Curated rows** (K-M7 step 5): models no Wikipedia article covers live in `scripts/src/wikispecs-curated.csv` (`make_key, model_key, make, model, source_label, source_url, accessed` + figures; power in PS, converted to kW). Rules: manufacturer pages only (facts, nothing copied verbatim) or our own registry data, never scraped third-party catalogues; ONE citation per row; fewer than 3 sourced figures = dropped (`MIN_FIGURES`); unsourced figure stays empty. `pnpm ingest:wikispecs:curated` upserts a `model_generations` row (`source='curated'`, `year_from` = `CURATED_YEAR_FROM` 1900, open end, so it spans every year and the chip stays hidden) + a spec row with `*_lang = 'curated'` and `source_label/url/accessed` (migration 0065); `ingest:wikispecs` skips curated generations so a refresh never wipes them; after changing the CSV re-run the curated ingest and re-export both seeds. The API returns the source as `{ lang: 'curated', title: label, url, accessed }`; the UI (`isCuratedSource`) shows "Source: <label> · accessed <date>" linking the page, curated footnote/credit strings, no span and no year-of-N line — never "Wikipedia".
A known gross-as-kerb infobox weight is dropped by key in `GROSS_WEIGHT_KEYS` (`wikispecs-merge.ts`, currently Volvo B7R 1997); add a `make|model|yearFrom` there, not a parser rule (no way to tell gross from kerb in the text).
Engine edition choice (`mergeEditions`): the edition with the most engine entries **that carry power** wins (chain order en, ru, uk, de, home; earlier wins a tie). Never count raw entries: a cell split into "1,4 л" + "(55 кВт)" fragments would outscore whole engines.
Relation to the car: `ResultCard` passes `own` (registry fuel / cc / kW / own mass); `engineMatchesCar` (WikiSpecs.helpers) highlights and lists first the engine within 3 % displacement, 7 % power and fuel-compatible (never on fuel alone), the others show `engineVsCar` deltas in brackets; the footnote adds the car's year within the generation. Drive and gearbox are parsed to key/values by `WikiDrive.helpers.ts` (`parseLayout`, `parseGearboxes`; en/ru/uk/ko/cs/ja/fr wording, covers all 592 seed rows) with the source text as fallback; a new gearbox kind = `GEARBOX_KINDS` + `wikispec.gearbox.*` / `wikispec.about.gearbox.*` strings.

## Size & parking (`?section=size`)

Files: `apps/web/src/components/size/` (write-up: `docs/plan-done.md` "Size & parking section"). Share link `?section=size&tab=schema|parking|garage|norms` (`parseSizeTab`; `'size'` is in `SHARE_SECTIONS`).
Rules: figures come from the best source per field (RDW → Wikipedia → VIN); a missing one is a **forecast** (`source: 'estimate'`, dashed, ≈, own ❓) and the wording is always "catalogue / fleet value for the model, not this car". The class (A–F, SUV, MPV) is an approximate length-based European segment, never official; the header chip reads only the Specs queries (no VIN) and is hidden for a typical-shape-only forecast. **Ship no norm number that is not verified in the source text.** A new norm = a `LEGAL_LINKS` entry (url + clause, rendered as a ↗ link) + a `PARKING_REFS` row + `size.link.*` / `size.bay.*` strings in ua/ru/en. A new body shape = `SIZE_SHAPES` + `SHAPE_TYPICAL` + a path in `silhouettes.ts` + `size.shape.*`. Verdict thresholds and the mirror allowance are constants at the top of `fit.ts`. Tabs are separate lazy chunks; the VIN is decoded only once the section is open.

## Read guides (`/read`, 2026-10-16)

Files: `apps/web/src/routes/read/` (write-up: `docs/plan-done.md` "Read guides"). Hub `/read` + articles `/read/body-types`, `/read/sizes`, `/read/fleet`; each article is its own lazy route (not a `:slug` resolver).
Data: one rollup `registry.stats_size_models` (migration 0071; per passenger model with ≥ 50 cars: dominant normalized registry body, RDW's usual body key, length/width/height/wheelbase in mm) rebuilt by `scripts/src/spec-stats.ts` with `stats_spec` (`db:refresh-spec-stats` / `db:refresh-derived`; **derived, no seed CSV**). `GET /api/stats/size-models` → contract `packages/shared/src/sizeModels.ts` → `sizeModelsQuery()` (online-only, `['stats', …]` key). Dimensions: RDW medians (well-sampled years first, thin samples as a fallback), Wikipedia where RDW has none.
Rules: **a model's shape is its majority style** (`profileModel` in `read/helpers.ts`): named crossovers/vans (`SUV_MODELS` / `VAN_MODELS` regexes — the registry files every SUV as "УНІВЕРСАЛ" and RDW tags Tucson-sized crossovers MPV) → registry body unless it is a wagon → RDW body key → registry wagon. Add a model to the regex when a big one lands in the wrong class. The segment comes from `sizeClass()` + `CLASS_CUTS` / `SUB_CUTS` (never copy the numbers into prose). Examples are curated `brand/model` pairs in `body-types/content.ts` (registry spelling; a model the data lacks is skipped); real plates are fetched **on demand** through `/api/search` (`ExamplePlates`), never hard-coded. Article prose is inline `L10n` (ua/ru/en) in `content.ts`; titles are `nav.read*` keys; UI strings are `read.*`.
Links: every URL is built by `readHref` (`read/links.ts`): the plate card's body row → `/read/body-types?shape=` (scrolls to and highlights the card), the size chip's ❓ → `/read/sizes?shape=&class=&brand=&model=#explorer` (explorer preset, "your car" first). Explorer state lives in the URL (`shape`, `class`, `q`). A new article = a route in `App.tsx` + `ROUTE_TITLE_KEYS` + `STATIC_PAGES` (ua/ru/en) + an `ARTICLES` entry + `nav.*` keys.
**`/read/fleet`** (colours, fuel, fleet age; `read/fleet/`) needs no rollup: it reads `GET /api/stats/field/:dimension` (`statsFieldQuery`) for `color`, `fuel` and `year` (`year` = `stats_by_year`, the registration-action year `d_reg`, **not** the model year — the copy says so; it is not in `FieldInfoDimension`, no "?" popover). Pure folding is in `fleet/helpers.ts`: colours via `resolveVehicleColor` (orange spellings merge), fuel groups via `resolveFuelCategories` (a petrol + gas car is its own group), `ageSummary` (median year, share of the last `RECENT_YEARS`). Bars are painted from `VEHICLE_COLOR_HEX`.

## Stock news and info popups

- **Stock news** (`GET /api/stocks/news?brand=`, `apps/api/src/stocks/`): Yahoo search (images, publishers) merged with the per-ticker RSS, matched by ticker (share-class aware — `GOOG` ≠ `GOOGL`), deduped, 15 min cache. Contract `stockNewsResponseSchema` (`publisher` / `imageUrl` optional) lives in `packages/shared/src/schemas.ts`; unofficial endpoint, same caveat as the share-price widget — never build anything that needs it. Web: `StockNewsWidget` (right column, 3 → 10 headlines) and the "💹 <Company> news" group in `SocialSection` (counted in the section total); both use `StockNewsCard`.
- **`FieldInfoButton`** portals its panel to `body` with fixed, viewport-clamped coordinates (never `absolute` inside a card — it overflowed on phones). Sections with a "?" (`RdwRecalls`, `MotFaults`, `OpenEv`) render it even with no data, falling back to the "what is this" text.
- **Mobile drawer**: below `md` the Layers/Profile buttons live in `Sidebar` (`inSidebar` prop, popovers span the drawer); a menu item closes the drawer through `onNavigate`.
- **Reports** (copy/save) contain no Pixabay stock photos.

## Wanted vehicles (stolen check)

Files: migrations 0068 + 0069, `scripts/src/wanted.ts` (+ `wanted-parse.ts`), `apps/api/src/wanted/`, `packages/shared/src/wanted.ts` (own file — no offline-cache bust), `apps/web/src/components/WantedCheck.tsx`, query `wantedQuery` (`['wanted', …]`, deliberately **no** offline group: live data).

- **Source = National Police open data on data.gov.ua (CC BY)**, the same list stolen.in.ua shows. The feed holds **only current records**, so `pnpm ingest:wanted` upserts and never deletes: a record missing from a run gets `resolved_at` ("no longer wanted" — found _or_ cancelled, the feed does not say which; the UI says exactly that). History therefore only exists from our first run (`trackedSince`); the police `seized_at` / `registered_at` dates are shown too. **Run the ingest at least daily** (cron/VPS job — not yet scheduled in Phase 1). It refuses a feed under 20 000 usable rows so a broken export cannot mark everything resolved.
- **Not part of the seed CSVs** (live data; a fresh setup runs `pnpm ingest:wanted` once, ~15 s).
- **Matching:** `plate` is `normalizePlate`d; `vin` / `vin_alt` = the VIN-shaped (17-char) body and chassis numbers (a record can carry both a local `Y6L…` body number and the maker's `KNE…` VIN) — a lookup matches either. Records without a plate (≈ 11 %) are found by VIN only. `matchedBy` says which key hit.
- `GET /api/wanted` has the plate-lookup `@Throttle`; at least one of `plate` / `vin` is required. The section opens itself and shows a red chip when something is found; a clean result is worded "not on the list", never "clean" (not an official certificate). Link-outs: `stolen.in.ua/v/<Latin plate>` and the dataset page.

## Releases page (`/releases`, 2026-10-15)

- Public "What's new" log, one `ReleaseDay` per working day in `apps/web/src/routes/releases/releases.ts` (items tagged `new | improved | data | fix`, text in ua/ru/en). **After each big update add the day's entry (or extend today's).** Data is bundled in the lazy route chunk, not in `/api`.
- The PWA update bar has "Update & see what's new": it sets the URL to `/releases` (`history.pushState`) and then runs the normal update, whose reload lands the new shell there. A hint under it says the changelog shows the latest entries only after the update (the waiting service worker keeps serving the old shell until then).

## Deploy & maintenance (2026-10-15)

Runbook, secrets, folder layout: [deploy.md](deploy.md). Conventions:

- **Three path-filtered workflows on `main`** (`deploy-web|api|alpr.yml`); never add `web`/`api` branches. New runtime env var = add it to `env.ts`, to the
  `env:` block + `emit` list in `deploy-api.yml`, and to the secrets/variables table in `deploy.md` (web: a `VITE_*` var in `deploy-web.yml`).
- **Migrations must be backward compatible** (blue/green: the old api runs on the new schema for seconds) — add first, drop in a later release.
- **Web releases are folders + a `current` symlink**; the api serves `WEB_DIST_DIR=/web/current` and re-reads `index.html` by mtime. Never bake the
  web into the api image.
- **Never add `ports:` to postgres/alpr** (Docker-published ports bypass ufw); only Caddy publishes. Stock Caddy has no `br` encoder.
- **Proxy maintenance answer** = `503 {"status":"maintenance","retryAfter":N}` → `MaintenanceError` (`lib/api.ts`) → patient retry + `MaintenanceBanner`
  (`lib/maintenance.ts`). Any new fetch helper must go through `unwrap` to get this for free.
