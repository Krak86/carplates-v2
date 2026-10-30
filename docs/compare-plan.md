# Compare two vehicles: `/compare`

Status: **phase 1 (core) built 2026-10-30; phases 2-4 open.** Built-state conventions: features-reference.md "Compare two vehicles". Tracked in PLAN.md "To discuss / research" ("Car compare"). The catalog MVP
(`/cars/:make/:model`, see [catalog-plan.md](catalog-plan.md)) is live, so the old "blocked on catalog" note is lifted.

## Decisions (owner, 2026-10-30)

- **Exactly 2 vehicles** (A and B). Mirrored layout, no third column.
- **Compare anything we have some data for**, not only catalog models. Input per slot is a **plate**, a **VIN**, or a
  **model ref** (make / model / year / fuel). A plate or VIN of a rare model, truck or van works.
- Show only data that exists: a row where **neither** car has a value is skipped; one-sided gaps show "-". A footer says how many rows were hidden.
- Add as many charts as are honest: radars, mirrored bars, dumbbells, curves, share bars, maps, size overlay.
- Export like "Copy all info". Compare sizes too. Compare chip on the search card, prefilled as slot A.

## Input and URL

`/compare?a=plate:AA1234BB&b=m:bmw/3series/2015/diesel` (also `vin:<VIN>`). Not `/compare/:a~:b`: slots take three kinds of input.
Route goes **before** `/:query` in `App.tsx`. New public route checklist (CLAUDE.md): `ROUTE_TITLE_KEYS`, `STATIC_PAGES` entry
(ua/ru/en, `noindex` unless indexed pairs are added later), `max-w-6xl`, `@Throttle` on any new enumerable endpoint, edge cache rules.

Every input resolves to one `CompareCar`: `{ brand, model, year, kind, fuel, capacity, powerKw, body, ownWeight, totalWeight, registry? }`.
- **plate**: `plateQuery` (row + the card bundle `/api/card/:plate`, which already carries rdw, vdb, ev, wikiSpecs in one call).
- **VIN**: `vinQuery` decode, brand/model/year from the NHTSA fields.
- **model ref**: the catalog (`catalogLookupQuery`, `GET /api/catalog/:make/:model`) gives `topBrand` / `topModel` / `kind` / typical year;
  year, fuel and body come from the picker (same defaults as `ModelVariants`).

All model-level sources take raw `brand, model, year`, so after resolving, plate and model refs behave identically.

## Two kinds of data, labelled differently

1. **This exact car (plate / VIN only):** year, colour, region, registered since, cc, kW (2026+), own/total weight, owners count, history
   count, last operation, imported flag, stolen check. Plate also gets the existing "this car vs model typical" delta. **Never show `person`.**
2. **Typical for the model (catalogue and fleet values):** RDW, Wikipedia generation specs, size, value, safety, recalls, MOT, markets, origin.

Header of each car: photo, name, generation, years, and a **coverage strip** (Registry / RDW / Wikipedia / Safety / MOT / Recalls matched or not).

## Row model (no duplicated logic)

Extract row definitions from the existing UI into a shared pure list in `apps/web/src/components/compare/`:
`CompareRow = { id, group, labelKey, unit, values: [number|string|null, number|string|null], direction: 'higher'|'lower'|'neutral', source, flags }`.
Reuse, do not re-implement: `SPEC_ROWS` (`RdwSpecs.helpers.ts`), `engineRows` / `engineMatchesCar` (WikiSpecs), `computeVehicleSize`
(`size/use-vehicle-size.ts`), `valueEstimate` / `ukrPrice` (`EstimatedValue.helpers.ts`), safety helpers, MOT and recall helpers.
A hook `useCompareCar(ref)` gathers the `queryOptions()` (rdwQuery, wikiSpecsQuery, vdb, safety x6, mot, recalls, fuel, wiki image, catalog stats).
Pruning is a plain filter. **Wait for each group's queries to settle before pruning** (skeleton, no rows popping in and out).
Online-only: not in `offline-cache.ts`.

Groups (each hides itself when empty): Overview (class, production span, markets, popularity decile) / Engine and performance / Size and weight /
Economy and emissions / Price and value / Safety / Reliability (MOT, recalls, complaints) / In Ukraine (counts, fuel/body/colour/regions) / Origin /
link row (reviews, videos, news; not table rows). Plus the "this exact car" group for plates.

Highlight "better" only where unambiguous: lower price, mass, CO2, consumption; higher power, range, safety. Dimensions neutral.
**No overall winner score.** Instead generated sentences ("A is 18 kW more powerful, 9 cm longer, about EUR 3k cheaper new in NL").
"Differences only" toggle, group collapse, swap button, per-row explainers (reuse the existing "?" strings), small-sample warning, flag when RDW's year differs from the asked year.

## Charts

Fixed colour per car (A blue, B orange), oklch/P3 with sRGB fallback (memory: CSS HDR colours). Dependency-free SVG like `ValueLineChart`.
Load the `dataviz` skill before writing chart code.

**Radars** (3 rules: fixed absolute scales, reuse `SpecScale` from `RdwSpecs.helpers`; an axis is drawn only when **both** cars have a value;
fewer than 3 common axes falls back to bars; every radar has a data table behind it for accessibility):
Performance (power, top speed, power-to-weight, displacement) / Practicality (length, wheelbase, seats, tow limit, kerb mass inverted) /
Economy and cost (consumption or EV range, CO2, NL new price, value, customs total) / Safety (Euro NCAP adult, child, pedestrian, assist; NHTSA stars).

**Bars and others:** mirrored bars per numeric row with centre delta; dumbbells for RDW min-median-max; percentile bars in the registry fleet
(`stats_weight`, `stats_spec`, `RdwFleetRank`); stacked share bars (fuel mix, colours, body types, regions); overlaid curves (depreciation by age,
NL price by model year, MOT fail rate by age via `MotFailChart`, registrations per year); production Gantt of generations; star pills for the
six safety programmes; two `RegionMap`s; CO2 A-G scale for both; optional 5-year cost stacked bar (depreciation + fuel, needs user km/year and fuel price).

**Size:** blueprint overlay of both at true scale on the mm grid (`SideSilhouette`, `SizeCarTop`, `SizeCarFront`, `.blueprint` tokens), side / top / front
tabs, overlay or side-by-side toggle, garage and parking verdicts for both (`fit.ts`), save-as-PNG (`size/export-schema.ts`).

## Export

New `buildCompareReport` in `lib/export-compare.ts` -> `ExportReport` (one table section per group; charts via the `chart` section type: table in
text formats, canvas PNG in docx/pdf; plate-only rows in their own labelled section; size overlay PNG; `buildSourcesSection` lists only contributing sources).
Add `export.*` i18n keys. Any new field is handled in `record-formats.ts`, `export-pdf.ts`, `export-docx.ts`. Wire the menu like `CopyAllInfoButton`.

## Entry points

- **"Compare" chip** on the plate card chip row (next to `GenerationChip` / `SizeClassChip` in `ResultCard.tsx`), VIN card chip row (`CatalogModelChip` area)
  and the catalog model page (picked year/fuel/body carry over). Slot A prefilled with the current car; slot B empty with the picker open.
- **Compare tray** (phase 4): "Add to compare" on `/cars/:make` rows, `/stats` boards, favourites, history, advanced search; a sticky "2 selected -> Compare" bar.
  Two saved favourites -> compare is the most natural plate-to-plate flow.
- **Slot B suggestions:** same model other fuel (`priceByFuel`), previous generation (generation chips), same size class and price band, `CatalogSiblingChips`.
- Picker: make -> model -> year reusing `/api/search/models`, `/api/search/brands`, `/api/catalog/makes`; plate and VIN typed in the same field (`normalizePlate`, never re-implement).

## Edge cases

- Different kinds (car vs motorcycle/truck): no radars, notice, bars only for rows that line up.
- EV vs combustion: rows appear with "-" where they do not apply (`appliesToFuel`); economy uses CO2 and cost per 100 km.
- Brand/model missing on a registry row: slot shows registry facts only, model sections omitted.
- Registry rows without a plate are VIN-keyed (`plate.service.ts`): the `vin:` input covers them.
- Plate 404: inline error in that slot, the other slot keeps working.
- UI strings use "-" not an em dash (memory). All text ua/ru/en.

## Phases

1. **Core (DONE 2026-10-30; sidebar entry not added yet):** route, input resolver (plate / VIN / model), `CompareCar`, header + coverage strip, mirrored table with pruning, plate-card chip. Tests for the resolver, row builders, pruning.
2. **Visuals:** radars, bars, curves, share bars, size overlay, generated sentences.
3. **Export:** report builder, formats, sources.
4. **Growth:** compare tray, slot B suggestions, saved comparisons (IndexedDB like history), optional indexable popular pairs `/compare/bmw-3series-vs-audi-a4` (pre-rendered like the catalog), `GET /api/compare` bundle for edge caching, `/read/*` article embeds.

Docs to update when built (CLAUDE.md): write-up -> `plan-done.md`, one-line check in PLAN.md, conventions -> `features-reference.md` "Compare",
`releases.ts` entry (new day -> bump `releases/latest.ts`), About (`about.feature.compare`), ua/ru/en strings.
