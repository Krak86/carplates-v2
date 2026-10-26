# ORIGIN_PLAN.md - vehicle origin chip + "Where it comes from" section

**Status:** Steps 0-1 done. Step 2 is done except the NHTSA WMI import (blocked by NHTSA throttling, see "Step 2 notes" at the bottom). To continue in a new session: "finish the WMI part of Step 2 in ORIGIN_PLAN.md", or "start Step 3/4/5". Tick the boxes below as steps finish.
Read CLAUDE.md and CLAUDE_RULES.md first; they govern every step (ESM `.js` imports, explicit `@Inject`, Zod at boundaries, tests colocated,
`pnpm format` first, never `git commit` unless asked, suggest a commit message after each big update).

## Goal

Show where a vehicle comes from, only when the data is known (never guessed):

- **Chip** (VIN page + plate card): brand home flag, owner flag when it differs, assembly-plant flag when known. Tooltip explains each flag.
  Click opens the section (same pattern as the "imported" chip opening Auction history).
- **Section** `?section=origin` (`LazySection`): chronological timeline, dot-and-line style like `RegistrationTimeline.tsx`, arrows pointing down.
  Steps, each shown only if known:
  1. Brand origin (country, founded year, HQ city)
  2. Ownership changes with years (Volvo: Ford 1999-2010, then Geely)
  3. Assembly (plant country + city, plus "also built in" for popular models)
  4. Ukraine (first registration, imported or new, source country if the registry carries it)
- Warning banner when the registry brand disagrees with the VIN prefix (WMI) maker.
- Collapsed explainer at the top: what this is, where the data comes from, why it matters (a "German" car built in Mexico, plant often
  affects quality/recalls/parts), disclaimer "brand and plant level, not a guarantee about this exact car".
- Every fact shows its source and an "as of" date.

## Decisions already made

- **Section is shown whenever any origin fact is known**, even one, so the explainer is always reachable. The chip is the summary.
- **Legacy countries by year, with their own name and flag** - never the modern successor: USSR, Czechoslovakia, East Germany (GDR),
  **West Germany (FRG, pre-1990)**, Yugoslavia, Serbia and Montenegro (2003-2006). A 1985 Skoda = Czechoslovakia, a 2005 Skoda = Czech
  Republic; a plant in Bratislava is Czechoslovakia up to 1992, Slovakia after. ZAZ/LuAZ (Ukrainian SSR) show the USSR flag with
  "Ukrainian SSR" in the text.
- **SVG flags for everything** (no emoji flags: none exist for historical states, and Windows renders emoji flags as letters). One `Flag`
  component replaces `countryFlag()` in the VIN card so both look the same. If the flag package lacks the legacy flags, draw them as SVG.
- Country names: `Intl.DisplayNames` for current countries, own i18n keys (ua/ru/en) for the legacy ones.
- Pre-1981 VINs are not standardized: old cars get origin from brand/model periods only; the assembly step is often empty. Acceptable.
- Derived hints (US-spec likelihood from plant country, brand-vs-WMI mismatch) are labelled as hints, in neutral wording.
- **Not doing:** editorial call-outs for specific assembly countries (RU/BY/CN). Plain facts + flags only.
- **Deferred to a second release:** Step 3 (hand-curated model plants / "also built in") and Step 9 (stats breakdown). They are in the plan
  but not in the first release; the first-release data model and API already leave room for them.
- UI text: no em dash, use "-" (comments may keep "-"). New tint colors: oklch/P3 with an sRGB fallback.

## Data sources

| Data                                                         | Source                                                                       | Confidence                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------- |
| Brand country, founded year, HQ city, owner, ownership dates | Wikidata (SPARQL, CC0)                                                       | High; ownership has gaps     |
| Plant country + city for a VIN                               | NHTSA `Plant Country` / `Plant City` (already decoded on the VIN page)       | High, US/CA-market VINs only |
| Plant country from VIN prefix                                | WMI list (NHTSA free download; today a curated `packages/shared/src/wmi.ts`) | Medium, country only         |
| VIN region / market-spec hint                                | First VIN characters + plant country                                         | Medium, shown as a hint      |
| Models built in several countries                            | Hand-curated from Wikipedia (Step 3, deferred)                               | Medium                       |
| Ukraine step                                                 | Existing registry history (`RegistrationTimeline` data)                      | High                         |

Existing code to reuse: `VinOriginCard`, `countryIso()`/`countryFlag()` in `apps/web/src/components/vin/helpers.ts`,
`packages/shared/src/wmi.ts`, `apps/web/src/components/RegistrationTimeline.tsx`, `lib/offline-cache.ts`, the "imported" chip -> Auction history
`openSignal` pattern.

## Steps

### [x] Step 0 - Prep and verification (30 min)

- Read these `docs/features-reference.md` sections (grep headings, never read whole): VehiclesDB, "Export, wiki text and brand logos", "VIN page", "Offline / PWA details".
- Find the brand normalization / alias code and the logo slug scheme; the new tables must key on the same brand slug.
- Check what registry `operName` says for imports and whether it carries a source country (`ПРИВЕЗЕН З ...`). Decides whether the Ukraine step can show it.
- Verify the flag source (`flag-icons` or similar) has USSR, Czechoslovakia, GDR, FRG, Yugoslavia; otherwise plan hand-drawn SVGs.
- Run `SELECT count(*) FROM registry.registrations` (synthetic vs real DB) before any test data work.
- Check how legacy country codes should be encoded (e.g. `SU`, `CS`, `DD`, `YU`, `DE-FRG`) and write the choice down.
- **Done when:** answers to the flag, brand-slug, import-wording and country-code questions are written into this file under "Step 0 findings".

### [x] Step 1 - Schema and shared contract (1 h)

- Migration `packages/db/migrations/NNNN_origin.sql` (backward compatible, new tables only; blue/green api):
  `brand_origin_period` (brand_slug, country_code, from_year, to_year, founded_year, hq_city, source, updated_at),
  `brand_ownership` (brand_slug, owner_name, owner_country, from_year, to_year, source),
  `model_plant` (brand_slug, model_slug, country_code, city, from_year, to_year, source_url) - created now, filled in Step 3,
  `wmi_prefix` (wmi, maker, country_code, region, from_year, to_year).
- `packages/shared/src/origin.ts` - its own file (not `schemas.ts`, so offline data is not discarded); new fields `.nullable().optional()`.
  Includes the country-by-year helper and the legacy country list (`as const` array + derived type).
- Unit tests: Skoda 1985 -> CS, 1995 -> CZ; Bratislava 1990 -> CS, 1995 -> SK; VW 1985 -> West Germany, 1995 -> DE.
- `pnpm --filter @carplates/shared build` after editing.
- **Done when:** migration applies cleanly, helper tests pass.

### [~] Step 2 - Ingest from Wikidata and NHTSA (2 h) - Wikidata part DONE, WMI import PENDING

- `scripts/src/ingest-brand-origin.ts`: Wikidata SPARQL for country (with dates), founded, HQ, owner, ownership dates. Header-name-driven
  mapping, `INSERT ... ON CONFLICT DO NOTHING`, cache raw responses, descriptive User-Agent, respect rate limits.
- WMI import from NHTSA's free list into `wmi_prefix`; keep the old `wmi.ts` as fallback until verified.
- Alias file for brands whose registry spelling differs from Wikidata + an **unmatched-brand report sorted by registry vehicle count**; work
  down it until the top brands (covering the great majority of cars) are matched.
- Manual overrides file for legacy-country gaps (ZAZ, LuAZ, Moskvich, ...), documented in the script.
- **Done when:** the report shows the top brands matched; overrides documented.

### [ ] Step 3 - Hand-curated model plants - DEFERRED to release 2 (1.5-2 h)

- CSV of the top 30-50 models by registry count: countries, cities, years, a Wikipedia source link per row. Own ingest script.
- Validation test: every row has a source URL, a valid country, a sane year range.

### [ ] Step 4 - Seed exports (30 min)

- `export:brand-origin:csv`, `export:wmi:csv` (and `export:model-plants:csv` with Step 3) -> gzipped CSVs in `scripts/seed-data/`.
- Document the commands in `docs/commands-reference.md`. A new setup loads the CSV instead of re-scraping.
- **Done when:** a fresh setup loads all tables from the CSVs.

### [ ] Step 5 - API (1.5 h)

- `apps/api/src/origin/` (controller, service, Zod input schema). `GET /api/origin?brand=&model=&year=&vin=`. No logic in the controller,
  never `@Res()`, explicit `@Inject(...)` on every constructor dependency (`tsx watch` has no `design:paramtypes`).
- Returns brand periods, ownership history, plant (NHTSA fields or WMI), model plants (empty until Step 3), and derived hints:
  region + US-spec hint, brand-vs-WMI consistency warning, brand-vs-assembly-country note (neutral wording).
- `@Throttle` (brand list is enumerable). Tests for every hint rule incl. negatives (no VIN, pre-1981 VIN, unknown WMI).
- Add the query to `lib/offline-cache.ts`.
- **Done when:** tests pass and the endpoint returns sane output for ten real plates/VINs, incl. a Soviet-era car and a Japanese import.

### [ ] Step 6 - Flags and country names (1 h)

- One `Flag` component, SVG for every country incl. legacy; lazy-loaded, accessible name (`aria-hidden` when decorative next to the name).
- Replace `countryFlag()` usage in the VIN card. Legacy names in ua/ru/en i18n keys; others via `Intl.DisplayNames`.
- **Done when:** the VIN page shows the same flags as before; legacy flags render.

### [ ] Step 7 - Chip (1 h)

- `OriginChip.tsx` (default export, `Props` type, hook for data, derive during render). On the VIN page and plate card next to existing chips.
- Tooltip per flag; click opens the origin section via `openSignal`.
- Tests: brand only, brand + owner, brand + plant, nothing.
- **Done when:** correct on a Skoda (CZ/DE), a Toyota (JP) and an old VAZ (USSR).

### [ ] Step 8 - Timeline component and section (2.5 h)

- Extract the dot-and-line markup from `RegistrationTimeline.tsx` into a shared `Timeline`; `RegistrationTimeline` keeps its behavior
  (newest first, arrows up) and its tests must still pass. The origin section is chronological, arrows down.
- `OriginSection` as a `LazySection`; add its id to `sections`; shared pure helpers for the lazy chunk go in `vite.config.ts` `HELPER_GROUPS`.
- Steps, warning banner, collapsed explainer, source + "as of" per fact (see Goal). Semantic HTML, blank lines between JSX blocks,
  no synchronous `setState` in effects.
- **Done when:** renders for the three sample cars, empty states look right, `?section=origin` opens and scrolls.

### [ ] Step 9 - Stats breakdown - DEFERRED to release 2 (1.5 h)

- Stats-page charts: cars in Ukraine by brand origin country and by assembly country (same period rules; Soviet-built counts as USSR).
  Online-only, so not in `lib/offline-cache.ts`. Use the `dataviz` skill. Build only after the unmatched-brand report is clean.
- **Done when:** numbers match a direct SQL check on a sample of brands.

### [ ] Step 10 - i18n, accessibility, polish (1.5 h)

- ua/ru/en strings for every label, tooltip and the explainer. No em dash in UI text.
- Dark theme, mobile width, keyboard navigation for chip and expander, screen-reader labels on flags.
- Check in the browser (chrome-devtools): console clean, Lighthouse pass on the VIN page shows no regression.

### [ ] Step 11 - Docs, release, final checks (1 h)

- Write-up -> `docs/plan-done.md`, one-line ✅ -> `PLAN.md`, conventions -> `docs/features-reference.md` (new "Origin" section),
  user-facing entry -> `releases.ts`, commands -> `docs/commands-reference.md`.
- `pnpm format`, `pnpm lint`, full tests, production build (check the lazy chunk). Re-run every `export:*:csv` touched.
- Suggested commit message(s); do not run `git commit`.

## Suggested commit split

1. Schema, contract, country-by-year helper (Step 1)
2. Ingest scripts, seed CSVs, docs (Steps 2, 4)
3. API (Step 5)
4. Flags, chip, section (Steps 6-8)
5. i18n, docs, release notes (Steps 10-11)
6. Release 2: model plants + stats (Steps 3, 9)

## Effort

First release (Steps 0-2, 4-8, 10-11): about 11-12 h. Release 2 (Steps 3, 9): about 3-3.5 h.

## Risks

- **Brand matching** registry vs Wikidata is the most uncertain part; the unmatched-brand report keeps it measurable.
- **Wikidata ownership gaps**: the UI treats missing as "unknown", never "no change".
- **Legacy flags** may need hand-drawn SVGs (settled in Step 0).
- **Model plants** rest on manual Wikipedia reading; mark as curated and cite each row.

## Step 0 findings

Done 2026-10-25. Read-only checks only (no data touched).

- **DB is real:** `SELECT count(*) FROM registry.registrations` = 24,721,694. Never run `db:seed` / TRUNCATE / bulk DELETE on it; Step 1 adds only
  new tables, and tests use fixtures, not this DB.
- **Brand slug:** `brandSlug()` in `packages/shared/src/brandLogo.ts` (`BRAND_SLUG_BY_NAME`, ~280 spellings incl. Cyrillic -> `lada`,
  `zaz`, `gaz`, `volkswagen`, `mercedes-benz`, `land-rover`...). It is also the Euro NCAP slug and `makeKey` in `vehicleKey.ts` reuses it.
  `brand_slug` in all new tables = this slug; do not invent a second scheme. Registry `brand` is "BRAND MODEL" (double space), so
  `brandSlug` splits on 2+ spaces. Brands missing from the map get `null` -> they show up in the Step 2 unmatched report; extend the map
  (and keep a logo-less slug allowed) rather than a parallel alias table where possible. A Wikidata-name -> slug alias file is still needed
  for the Wikidata side only.
- **Import wording:** every import `operName` says only "З-ЗА КОРДОНУ" (from abroad) with no country. Top variants: "...ПРИВЕЗЕНОГО З-ЗА
  КОРДОНУ ПО ПОСВІДЧЕННЮ МИТНИЦІ" (1.16M), "...Б/В ТЗ ПРИДБАНОГО В ТОРГІВЕЛЬНІЙ ОРГАНІЗАЦІЇ, ЯКИЙ ВВЕЗЕНО З-ЗА КОРДОНУ" (795k), "...ПО ВМД" (625k).
  **Decision: the Ukraine step shows "imported" / "new" only, never a source country.** Reuse `isImportOperation` / `hasImportOperation`
  (`packages/shared/src/import-history.ts`); "new car brought in by a dealer" (ПЕРВИН/НОВОГО) = new, not a used import. The plan's
  "source country if the registry carries it" is dropped.
- **Flags:** no flag package is installed. `flag-icons` 7.5.0 (MIT, 271 flags in `flags/4x3`) has current countries (cz, sk, de, rs, ...) but
  **no su, cs/cshh, dd, yu**. Today emoji flags are used (`countryFlag`/`isoFlag` in `apps/web/src/components/vin/helpers.ts`, used by
  `VinOriginCard.tsx`, `VinSegments.tsx`; `vin-text.ts` uses only `countryIso`). **Decision: current countries = `flag-icons` SVGs, copied
  as needed and lazy per flag (not the whole package CSS); legacy = 5 hand-drawn SVGs** (USSR, Czechoslovakia, East Germany, Yugoslavia,
  Serbia and Montenegro). West Germany (FRG) uses the German flag file (same tricolour); only its name/code differs. Existing
  `RegionFlag`/`flag-<id>.webp` is for Ukrainian regions, unrelated.
- **Legacy country codes** (column `country_code`, text): ISO 3166-1 alpha-2 for current countries; for former ones the ISO 3166-3 style:
  `SU` USSR, `CSHH` Czechoslovakia, `DD` East Germany, `YU` Yugoslavia, `CSXX` Serbia and Montenegro (2003-2006), and **`DE-FRG` West
  Germany (1949-1990)** (not an ISO code; hyphen marks it as ours). Never plain `CS` (ambiguous: Czechoslovakia vs Serbia and Montenegro).
  Ukrainian SSR is stored as `SU` with the i18n label "Ukrainian SSR" chosen by brand override (ZAZ, LuAZ), not a separate code.
  Helper `countryAtYear(code, year)` maps a current code to the legacy one in force that year (DE: <=1990 `DE-FRG` for west plants/brands,
  `DD` for east ones, so the period data must say which; CZ/SK: <=1992 `CSHH`; RS/ME: 1992-2003 `YU`, 2003-2006 `CSXX`; Soviet republics
  <=1991 `SU`).
- **Reusable existing pieces confirmed:** `VinOriginCard`, `packages/shared/src/wmi.ts` (curated, no `wmi` hits by that name pattern, check
  its export names in Step 1), `RegistrationTimeline.tsx`, `lib/offline-cache.ts`, `openSignal` from the "imported" chip.
- **Docs read:** features-reference "Export, wiki text and brand logos", "VIN page" (incl. Auction history / imported-earlier chip). Not yet
  read in full: VehiclesDB and "Offline / PWA details" (do at the start of Step 2 and Step 5 respectively).

## Step 1 notes

Done 2026-10-25.

- Migration `packages/db/migrations/0075_origin.sql` is **applied to the local real DB** (4 new empty tables: `brand_origin_period`,
  `brand_ownership`, `model_plant`, `wmi_prefix`). Drizzle tables are at the end of `packages/db/src/schema.ts`.
- Key conventions the ingest must write: `from_year` 0 = since the beginning, `to_year` NULL = ongoing, `model_plant.city` '' = unknown.
- `packages/shared/src/origin.ts` (exported from the index, shared `dist` rebuilt): `LEGACY_COUNTRIES`, `isLegacyCountry`,
  `countryAtYear(code, year, { east })`, Zod `brandOriginPeriodSchema` / `brandOwnershipSchema` / `modelPlantSchema`. Periods store the
  **modern** ISO code and `countryAtYear` derives the legacy one; ZAZ/LuAZ rows store `SU` directly. Cutoffs: USSR <=1991,
  Czechoslovakia <=1992, West/East Germany <=1989 (reunified Oct 1990), breakaway Yugoslav republics <=1991, RS/ME in Yugoslavia
  <=2002, Serbia and Montenegro 2003-2005.
- `packages/shared/src/wmi.ts` exports `lookupWmi(vin)` -> `{ make, country }` and `hasKnownWmi`; keep it as the fallback in Step 2.
- Nothing exists yet for Step 2 onward (no ingest script, seed CSV or API). Before Step 2 skim `docs/commands-reference.md` and an existing
  scraper (e.g. `scripts/src/wiki-images.ts`) for cache dir, User-Agent and rate-limit style, and read the VehiclesDB section.

## Step 2 notes

Done 2026-10-26 (Wikidata part). WMI part pending.

**Wikidata (done, written to the local real DB):** `pnpm ingest:brand-origin` (`--report` = no write, `--show skoda,volvo` = print rows, `--refresh`,
`--top N`). Files: `scripts/src/ingest-brand-origin.ts`, `brand-origin-parse.ts` (+ test), `brand-origin-overrides.ts`. Result: 163 brands with
origin, 150 ownership rows, **97.8 % of registry vehicles** (by distinct plates) have origin data. Still unmatched: 46 slugs, mostly small
trailer/moto brands (`musstang`, `viper`, `lev`, `ams`, `geon`, `forte`, `saz`, `ruta`, `lider`, `dnipro` ...); the 4044 names with no slug at all
(765k vehicles) are trailer/body-builder spellings, not brands - not Step 2's job.

How it works / lessons (do not re-learn these):

- Candidates = Wikidata items with direct `P31` in the maker classes (`Q786820` automobile manufacturer, `Q10429667` car brand, `Q108460239` truck,
  `Q4380190` bus, `Q15081030` motorcycle manufacturer). `P279*` and `Q4830453` ("business") time out / return everything. Labels en/uk/ru + en altLabels.
- Matching = label slugified like `brandSlug()` (exact), else with a company suffix dropped ("Skoda Auto" -> skoda, "loose"). Scalars prefer exact
  items; spellings that do not match go in `WIKIDATA_ALIASES` (Qid per slug); gaps and legacy periods in `ORIGIN_OVERRIDES` (replace Wikidata).
- **Facts via SPARQL (batches of 25), ownership via the entity API** (`wbgetentities`, claims P127 + P749 with P580/P582 qualifiers, owner labels
  in a second call). Owners in SPARQL time out on big brands. Do NOT add `maxlag` to the entity API (the query-service lag makes it reject all calls).
  Entity JSON values vary per property: parse loosely, read `id`/`time` defensively.
- Ownership filter in `mergeBrand`: an undated plain "owned by" is dropped (shareholders such as Nippon Life -> Toyota); kept = parent organization
  or dated owner. Result: Skoda shows Volkswagen Group with dates; **Volvo shows only Geely (no Ford 1999-2010: Wikidata gap)**; Toyota/Lada have none.
  Ownership is therefore "known history", the UI must treat missing as unknown (already a plan rule). Owner country is not fetched (`null`).
- Raw responses cached in `scripts/.data/brand-origin/` (gitignored); re-runs are offline. Re-run writes by delete-then-insert per slug.
- Overrides added from knowledge, each with a Wikipedia source: zaz/luaz (SU until 1991 then UA), azlk, ural, nefaz, bogdan, odaz, daewoo, daf, krone,
  kogel, schwarzmuller, wielton, haval, loncin. `foundedYear` null where unsure.
- `@carplates/db` index now exports the four origin tables (`brandOriginPeriod`, `brandOwnership`, `modelPlant`, `wmiPrefix`) + row/insert types;
  `pnpm --filter @carplates/db build` is needed after schema/index edits.

**WMI (written, NOT yet run for real):** `pnpm ingest:wmi` (`--dry-run`, `--refresh`). Files: `scripts/src/ingest-wmi.ts`, `wmi-parse.ts` (+ test, 5 pass).
vPIC has no bulk WMI endpoint: it pages `GetAllManufacturers` (232 pages, all cached), keeps road-vehicle makers (2654) and calls
`GetWMIsForManufacturer/{id}` for each, cached in `scripts/.data/wmi/`. **NHTSA started answering 403 after ~1440 of the 2654 calls** (throttled IP);
the script now stops on 403/429 (no retry storm), uses concurrency 2 + 300 ms pause, and writes nothing when stopped.

- TODO (next session): wait (an hour or more), run `pnpm ingest:wmi --dry-run` (resumes from the cache), check the report (WMIs without a country,
  unrecognised country names -> add to `COUNTRY_ALIASES` in `wmi-parse.ts`), then `pnpm ingest:wmi` for real. Verify WVW (VW, DE), TMB (Skoda, CZ),
  JTD (Toyota, JP), XTA (Lada, RU) in `registry.wmi_prefix`. `packages/shared/src/wmi.ts` stays the fallback until the API (Step 5) uses the table.
- Step 4 (seed exports) must cover `brand_origin_period`, `brand_ownership` and `wmi_prefix`; there is no `--export-csv`/`--from-csv` in either
  script yet (add them in Step 4, same shape as `open-ev.ts`).
