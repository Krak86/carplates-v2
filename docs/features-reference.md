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

`GET /api/card/:plate` (`apps/api/src/card/`, contract `packages/shared/src/card.ts` — own file, no offline-cache bust) answers, from the plate alone, what the card's chips would otherwise fetch after the plate row arrives: `vdb`, `rdw`, `ev` (electric fuel only), `models3d`, `models360`, `fx`, `wikiImage`. Each part is exactly its own endpoint's answer; `plateQuery` (`lib/queries.ts`) fetches it **in parallel** with the plate lookup (4 s timeout, failure ignored) and `seedCardBundle` writes the parts into the chips' own query keys, never over existing data — so chips and sections are unchanged and a null part just falls back to its own request.

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

## UK MOT "Common faults" (stage G)

Files: migration 0058 (`registry.mot_keys`, `mot_stats`, `mot_issues`, `mot_baseline`, `mot_reasons`, `mot_meta`), `scripts/src/mot.ts` + `mot-aggregate.ts` / `mot-lookup.ts` / `mot-zip.ts` / `mot-store.ts`, `packages/shared/src/mot.ts` (own file: kinds, band edges, group codes, the `/api/mot` contract — no offline-cache bust), `apps/api/src/mot/` (`GET /api/mot?brand&model&year&kind`), web `MotFaults.tsx` (+ `.helpers.ts`), `MotFailChart`, `MotSparkline`, `MotIssueRow`, `MotHelp`, `MotReasons.ts`, query `motQuery` (key head `mot`, online-only on purpose).

DVSA anonymised MOT results (UK yearly roadworthiness test), OGL v3 — the About entry carries the required statement. **Model-level and UK-market**: wording is "in UK inspections of this model", never "this car will fail". Aggregated while streaming the ZIPs; raw tests/plates are never stored. Only years >= 2019 (new layout); 2018 straddles the May-2018 directive, pre-2018 is a different schema.

- **Pooled counts, kinds apart:** cars (class 4), vans (7), motorcycles (1, 2) are separate keys (`kind`); normal tests (`NT`) that ended P / PRS / F; mileage miles -> km, tests with no mileage or more than 40,000 miles x max(age, 1) are dropped. A make/model needs >= 200 such tests over all loaded years to be stored.
- **Bands** (km, lower edges, one constant per kind in `mot.ts`): cars/vans 0, 25k, 50k, 75k, 100k, 150k, 200k, 250k+; motorcycles 0, 5k, 10k, 20k, 35k, 50k+. A band stores only its index — changing edges means re-running the ingest. A band (or model-year window) with < `MOT_MIN_BAND_TESTS` (200) tests is `null` ("not enough data").
- **Counting rule:** every issue count is **tests with the issue** (once per test, however many items); the 2021 item file interleaves a test's rows with its neighbours', so "already counted" is tracked per test id over a sliding window (`RECENT_TESTS`), not per contiguous run. Severity (dangerous) comes from the lookup category (`rfr_deficiency_category`), not `dangerous_mark`. `rfr_id` -> group is class-independent; reasons merge by wording into codes `group/item/fault` (DVSA renumbers ids), group codes are `MOT_GROUP_CODES` (derive from the node tree by name rules in `mot-lookup.ts`).
- **Stored shape:** `mot_stats` = chart-1 cells (kind, make, model, model year, band: tests, fails, tests with an advisory); `mot_issues` = per (model, band), pooled over model years: dangerous fails, per-group `[fails, advisories]`, the model's top-10 reasons; `mot_baseline` = the UK average per (kind, band); `mot_reasons` = DVSA wording of the stored reason codes; `mot_meta` = the pooled years. Re-ingest replaces all six tables in one transaction.
- **Matching:** the shared VehiclesDB matcher over `mot_keys` (`matchVdbModelAcrossMakes`); registry cars try MOT kinds car then van, trucks van then car, motorcycles motorcycle only, buses nothing. MOT-only make alias `opel -> vauxhall` (`MOT_MAKE_ALIASES`). A miss hides the section ("Nothing found").
- **API windowing:** chart 1 uses the car's model year +/- 2 (then +/- 5, then all years) until the window holds 1000 tests (`window.widened` says so); the group and reason lines are always all model years.
- **UI:** lazy section `faults` (in `SHARE_SECTIONS`, `LazySection` in `ResultCard`), fetches only when opened. Toggle Both / Failed / Watch for; chart 1 = orange columns (fails), dashed blue line (tests with an advisory), black tick (UK average); groups as collapsible rows with their own small line chart, reasons inside; tapping/hovering a band highlights it in every chart; table view and a glossary (`MOT_TERMS` -> `mot.help.<term>.*`, a "?" popover beside each key term). Colours are the tokens `--color-mot-fail` / `--color-mot-watch` (dataviz palette slots 2 and 1, validated light and dark). Translations: UI + group names in `i18n/*.json` (`mot.*`); the 80 most frequent reasons in `MotReasons.ts` ([en, ua, ru] by reason code); every other reason is shown in DVSA's English (`lang="en"`), never machine-translated. A new top reason = one line in `MotReasons.ts`.
- **Refresh:** yearly when DVSA publishes a new year (`SCHEDULE.md`): put the latest three years' ZIPs in a folder, `pnpm ingest:mot -- --dir <folder>`, `pnpm export:mot:csv`, commit the seed. The ZIPs are Deflate64 (neither Node's zlib nor `unzipper` reads them) and the 2021 pair is 12 part files with quoted comma-delimited rows — `mot-zip.ts` handles both layouts and ignores `__MACOSX` entries.

## Weight rankings

Files: migrations 0051-0053 (`registry.stats_weight`), `scripts/src/weight-stats.ts` (`pnpm db:refresh-weight-stats`, also in `db:refresh-derived`), `packages/shared/src/weightGroups.ts` (`WEIGHT_GROUPS`, `weightGroupOfKind`: passenger / truck / bus / motorcycle / trailer / other, plus "all"), web `routes/stats/WeightModels*.tsx`.

Per (kind_group, source, brand, model): n, min_kg, max_kg. Registry weights are sanity-checked against `total_weight` and a per-kind minimum mass (300 kg cars/trucks, 50 kg two-wheelers/trailers); a model's edges are its 1st/99th percentile. Passenger cars that RDW recognises (`matchRdwModel`) use RDW's year-median unladen mass instead. `/api/stats/top` returns `weightBoards` per group (top 10 heaviest + lightest, per-group vehicle floor; defaults to `{}` so offline-cached answers still parse). UI: group tabs on `/stats` ("all" default), cards on the home page (a lazy `Home*Section`), and 🏋️ / 🪶 chips on the result card and in the export, ranked within the vehicle's own group. Weights show in kg, with tonnes in brackets from 1000 kg.

## Community posts (Stack Exchange, Lemmy, Bluesky)

Files: `lib/community.ts` (keyless browser-side searches, Zod-validated), `lib/bluesky.ts`, `SocialGroup` + `CommunityPostCard`, `CommunityWidget`, `useSideCommunity`.

The Social section lists Bluesky, Mechanics Q&A (Stack Exchange "Motor Vehicle Maintenance & Repair") and Lemmy, each with a "More" link to the source's own search. The search term is "make model" — **without the year** (it empties the results). Side widgets (desktop, appear on scroll, latch via `useScrolledOnRoute`): left column = Bluesky, then Lemmy beside it (or in its place if no Bluesky); right = news, then Q&A beside it (or in its place); the second column needs >= 1760 px and shows ~1 s after the first. All widget chunks are excluded from the PWA precache (live third-party data).

## Export, wiki text and brand logos

- **"Copy all info"** (`lib/export-*`, `use-copy-all-info-actions`): sections come from the lookup plus RDW specs, VehiclesDB, the reviews catalog and videos, the value breakdown (EU value, Ukrainian customs in EUR/USD/UAH, per-fuel prices, caveats) and NBU rates. A `chart` section type is a table in clipboard/txt/md/csv and a canvas PNG (`renderChartPng`) in docx/pdf. VIN decode labels are localized with the English original in brackets (`useVinText`). `valueInfoLines` is shared with the on-screen value details (`EstimatedValue.helpers`).
- **Wiki:** `/api/wiki` fetches the full plain-text article (the `exchars` extract is capped at 1200), splits intro / sections server-side, falls back to the English edition (with a note) and strips IPA / CJK / "(listen)" parentheticals. The UI shows the intro with a "Read more…" toggle; the export uses the intro only.
- **Wiki photo aliases:** registry models that Commons does not know by name (factory indexes `21104`, `110307`, `T13110`; `E 270 CDI`; `corolla 1.33l`) get a search name from `packages/shared/src/wikiAliases.ts` (`wikiSearchName`, keyed on the first word of `brand` because many rows hold `brand = "ваз 21063"`). `wiki_image` rows stay keyed by the registry name; the pre-warm search (`ingest:wiki-images -- --aliased`) and the live fallback in `wiki.service.ts` (lead image + Commons year search) both use the alias. New rule = edit `wikiAliases.ts` + its test, rebuild `@carplates/shared`, **delete that brand's `-alias` files under `scripts/.data/wiki-images/{search,lead*}/`** (the cache is not keyed by the query, so a stale `null` is reused), re-run `--aliased`, `export:wiki-images:csv`. Title matching (`commonsImage.ts` `normalize`) folds diacritics ("Doblò" = "doblo"). Coverage query: collapse whitespace with `[[:space:]]+`, as `wikiImageKey` does.
- **One alias source for ZAZ / Daewoo / Chevrolet Lanos:** `modelFamily.ts` owns it (`modelFamily`, `zazFactoryFamily`, `ZAZ_FAMILY_SEARCH`). `wikiSearchName` reads the factory-code rules and the search names from it (`zazFactoryFamily(m, true)` = code at the start only), and `vdbMatch.ts` (`zazDaewooFamilyKeys`) appends the family keys (`lanos`, `daewoolanos` — RDW's spelling) to `vdbCandidateKeys` and the `daewoo` / `zaz` makes to `vdbRelatedMakeKeys`, so ЗАЗ / Chevrolet / FSO / Daewoo Lanos and `T13010` / `T1311x` Sens reach one VehiclesDB / RDW / recall row. The own make and every direct, curated and series key are still tried first, a family hit is `how: 'alias'` (not the "loose" `prefix`), and a miss still hides the section. A new ZAZ / Daewoo rule goes in `modelFamily.ts` + `aliasUnification.test.ts`, never in `wikiAliases.ts` or `vdbMatch.ts` alone. Stats grouping by family (`stats_by_model`) is not done (stage M4).
- **Brand logos:** PNG-sourced logos ship as capped WebP (`pnpm --filter scripts build:logo-images`, originals gitignored in `apps/web/assets-src/kind/logos/`); `brandLogoUrl` returns `.webp` for those slugs, SVG logos unchanged. WebP, not AVIF — lossy AVIF fringes the white background under `mix-blend-multiply`. `BrandLogo` puts a solid white chip behind inline logos in dark theme.

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
shows speed only (the lap readout is hidden; lap timing still runs in the engine). Update `RACER_SIZE_KB` after big changes (470
now: sprites ~365 KB + one ~100 KB backdrop + the engine).

**Standalone route `/race`** (`routes/RaceRoute.tsx`, sidebar 🎮, also in `ROUTE_TITLE_KEYS`, `STATIC_ROUTES`/`APP_PAGES` and the API's `spa-text.ts`): no plate or VIN — a random famous car of a random category (`lib/racer/presets.ts`: hardcoded make/model/year + paint per `CarBody`, `randomPreset`/`randomCar`), everything else random. The car-type chips pick a random example of that type (`onPickBody` on `RaceGameSettings`); a hand-picked colour clears the label; "🎲 Random car" re-rolls. The plate reads "CARS UA". No share link. `RaceGameStage.tsx` (intro, canvas, HUD, settings) is shared by the route and `RaceGameModal`. The HUD also shows a **km odometer** (`RacerHud.km`, engine `driven`: HUD speed / 100 = km/h integrated over time; counts this opening only, a restart keeps it). Next: `GAME_PLAN.md` (full screen, mobile controls, tilt).

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

## Offline / PWA details

Rules in CLAUDE.md are the short form. Full detail: the service worker only exists in production builds. Changing a Zod schema in
`packages/shared/src/schemas.ts` discards every user's saved offline data (intended). Contracts in their own file (`vdb.ts`, `rdw.ts`,
`account.ts`) do not: the persisted IndexedDB cache is rehydrated without re-parsing, so a Zod `.default()` on a new field never reaches
old cached answers — make new fields `.nullable().optional()` and read them defensively (`match.aliases ?? []`). A new `/api/*` query
that should work offline goes into the persisted-cache rules in `lib/offline-cache.ts` (size-capped); heavy online-only endpoints
(`/api/stats`) stay out. Runtime caches are prefixed `carplates-rt-`. SPA cache headers: hashed assets immutable, `index.html` / `sw.js` /
manifest `no-cache` (`spa.controller.ts`). `@vite-pwa/assets-generator` must stay on v2 (sharp).

## Link previews

Meta tags + `/og/*.png` are produced by the **API** (`apps/api/src/spa/`) on first load/deep link — Vite (`:5173`) never shows them. To
test: `pnpm build`, set `WEB_DIST_DIR=../web/dist` in `apps/api/.env`, restart the API, open `localhost:3000/<plate>` (Incognito, the
SW caches `index.html`). Plate/VIN pages are `noindex`; `?lang=` selects the language.

## Plate regions

`regionName` (`packages/shared/src/regions.ts`) = letter prefix (`REGIONS`) or, for digits-first legacy plates, `LEGACY_REGIONS`.
`DІ`/`ЕD` plates (`plateSeries`) are online-service series with no region by design. `registry.plate_regions` (stats rollups) mirrors both
tables — change them together, in a new migration (0045 holds all 108 statutory pairs + code 31); `regions.statute.test.ts` asserts the
tables equal the statute, so edit it with them. A pair is the region at issue, not the car's location.

- **Top-models boards read `stats_model_grouped`, not `stats_by_model`:** ZAZ / Daewoo / Chevrolet spellings are folded by `modelFamily` into one row. Rebuild with `pnpm db:refresh-model-family-stats` (after `db:refresh-stats`; `db:refresh-derived` does it). Raw `stats_by_model` still feeds the search model suggestions.
