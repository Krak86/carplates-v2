# Model catalog pages: `/cars/:make/:model/:year`

Status: **researched 2026-10-13, not started.** Tracked in PLAN.md "To discuss / research". Rollout, estimate (6-9 days, MVP 3-4)
and the surrounding SEO/outreach checklist: [discovery-plan.md](discovery-plan.md).

## Context

Today every rich section (specs, engines, value + customs, recalls, MOT faults, emissions, safety, reviews, videos, wiki,
photos, news, stock) is reachable only through a plate/VIN page, and those pages are `noindex`. So Google sees about 20
static routes and none of the model data. The question: should we expose the same model-level UX at slug URLs with no plate
or VIN, for SEO and for users who are "thinking about buying a 2015 X5"? Is it worth it, how many slugs, does it need a
matview, and does it need a taxonomy?

## Findings

**1. Almost all of ResultCard already works without a car.** Every `LazySection` in `apps/web/src/components/ResultCard.tsx`
(L580-656) needs only brand, model and year, plus kind, fuel and capacity for some. Those sections are specs, engines,
value, recalls, faults, electric, emissions, ratings, reviews, videos, wiki, photos, news, social, stock and nearby. The
`own` props on `RdwSpecs` and `WikiSpecs` are optional. Three parts need the actual car: the `basic` block, `vin` and
`history`. `VinTypicalData` + `typicalLookup` (`components/vin/helpers.ts:277`) already render a "≈ typical" card from
make, model and year alone, so the pattern exists.

**2. The real blocker is taxonomy, not speed.** Registry model text is at trim level. Numbers come from the real DB (24.7M
rows, 16.7M in `current_registration`, measured 2026-10-13):

- `BMW 320D`, `BMW 530D`, `SPRINTER 316 CDI` / `313 CDI`, `ВАЗ 21099` / `210994-20` / `21093`, and brands like `ваз 21063`.
- There are 78.8k raw (brand, model) pairs. Pairs with at least 200 current cars: 5,198; at least 1,000: 1,874.
- Raw make/model/year combos: 30.6k with at least 50 cars, 12.8k with at least 200, 3.3k with at least 1,000.
- After folding trims into models, the number of distinct pages drops and each page holds more cars.
- Rough target: 150-250 makes, about 1,500-2,500 models, and about 8-15k model-year pages that have real data.

Raw strings cannot be slugs: we would get `/cars/bmw/320d` and `/cars/bmw/530d` but no `/cars/bmw/3-series`, plus
thousands of near-duplicates. That is exactly what Google's doorway / scaled-content policy demotes.

**3. Partial canonicalisers already exist and should be reused, not reinvented:**

| Helper                               | Location                        | What it does                                                                      |
| ------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------- |
| `brandSlug` / `makeKey`              | `brandLogo.ts`, `vehicleKey.ts` | Brand to a Latin key                                                              |
| `brandCandidateKey`                  | `vehicleKey.ts:68`              | BMW 320D to 3series, Mercedes E 200 to eclass, Mazda 3 to mazda3                  |
| `modelFamily`                        | `modelFamily.ts`                | Folds ZAZ / Daewoo / Chevrolet Lanos                                              |
| `wikiSearchName`                     | `wikiAliases.ts`                | ВАЗ / ГАЗ / КРАЗ / MAN factory codes to the model name                            |
| `vdbCandidateKeys` / `matchVdbModel` | `vdbMatch.ts`                   | Matching against 14k VehiclesDB models                                            |
| Trim-prefix folding                  | `scripts/src/mot-fold.ts`       | Longest whole-word prefix that is a real model (`SPRINTER 316 CDI` to `sprinter`) |
| `model_generations`                  | DB table                        | 480 models / 1,213 generations, which gives a natural middle layer                |

**4. Speed: yes, precompute, but use a TS-built table, not a SQL matview.** A live `GROUP BY` over 16.7M rows takes
seconds. The canonical mapping logic lives in TS (`@carplates/shared`), so it cannot sit inside a matview definition. The
repo's pattern for this is the plain tables rebuilt by a script: `stats_weight`, `stats_spec`, `stats_model_grouped`, all
run from `db:refresh-derived`. The only rollups that have a make + model + year grain today are `stats_fuel` (passenger
cars only) and `stats_safety`.

## Verdict

**Worth doing, as a curated catalog and not as one page per raw string.** The pages have to carry data nobody else has,
otherwise they are thin template pages:

- How many of this model-year are registered in Ukraine.
- Fuel and engine mix, colour, body, region spread.
- Share imported used vs bought new, and how many arrived each year.
- Typical owner count.
- Customs or value estimate, MOT failure profile, recalls, generation specs.

AUTO.RIA's catalog has none of the registry stats. Index only pages above a data threshold; the rest stay reachable but
`noindex`.

Taxonomy, three levels with optional generation context:
`/cars/{make}` → `/cars/{make}/{model}` → `/cars/{make}/{model}/{year}` (the generation chip/link shows on the year page).
Slugs are Latin kebab-case: `vaz`, `zaz`, `mercedes-benz`, `3-series`, `lanos`, `2107`.

## Plan

### Step 1: Canonical model mapping (the taxonomy)

- New shared module `packages/shared/src/catalogKey.ts` with `catalogSlugs(brand, model) → { make, model, how } | null`.
  It composes, in order: `brandSlug`, the `wikiSearchName` factory-code rules, `modelFamily`, `brandCandidateKey`
  (BMW/Mercedes series), then MOT-style whole-word prefix folding against a known model list (VehiclesDB `make_key/model_key`
  plus `model_generations`). Unit tests cover the sample strings above.
- Migration `NNNN_catalog.sql`:
  - `registry.catalog_alias (brand, model) → make_slug, model_slug, how`, built from `stats_by_model` (78k rows, cheap).
  - `registry.catalog_model (make_slug, model_slug, make_name, model_name, n, year_min, year_max, top_raw_brand,
top_raw_model, kind_group, indexable)`.
  - `registry.catalog_make`.
- Script `scripts/src/catalog-build.ts` (`pnpm db:refresh-catalog`), added to `db:refresh-derived`.
- Manual overrides in a committed `scripts/src/catalog-overrides.csv`, same idea as `generations-titles.csv`.

### Step 2: Rollup per make/model/year

- `registry.catalog_year_stats (make_slug, model_slug, make_year, n, fuel_mix jsonb, body_mix, color_top, region_top,
capacity_p50, power_p50, imported_share, first_reg_by_year jsonb, owners_p50)`.
- It is filled by one SQL pass that joins `current_registration` to `catalog_alias`, run from the same script. The API only
  ever reads by primary key.
- `indexable` = at least `CATALOG_MIN_CARS` (start at 200) for a year page, or at least 1,000 for a model page.

### Step 3: API

- `apps/api/src/catalog/` with these endpoints:
  - `GET /api/catalog/makes`
  - `GET /api/catalog/:make` (models)
  - `GET /api/catalog/:make/:model` (years + model totals)
  - `GET /api/catalog/:make/:model/:year` (stats + `top_raw_brand/model` used as section inputs)
- Contract goes in its own file `packages/shared/src/catalog.ts`, not `schemas.ts`. Inputs are Zod-validated, and `@Throttle`
  is applied since these are enumerable lookups.

### Step 4: Web

- Routes `/cars`, `/cars/:make`, `/cars/:make/:model` and `/cars/:make/:model/:year`, declared in `App.tsx` before `/:query`.
- New `components/catalog/ModelYearCard.tsx`:
  - Header with logo, name, year, `GenerationChip`, `VdbChips` and `EstimatedValueChip`.
  - A new "In Ukraine" section with the registry stats from step 2.
  - The existing `LazySection`s, fed with `top_raw_brand/model` and the dominant kind, fuel and capacity.
- Extract the LazySection list out of `ResultCard` into a shared `ModelSections` component so the plate card and the catalog
  page cannot drift apart.
- Cross-links:
  - Plate and VIN cards → "All 2015 BMW X5 in Ukraine".
  - `/stats` model boards → model pages.
  - Model page → year chips and sibling models.

### Step 5: SEO plumbing

- `spa.controller.ts` `metaFor`: add a `/cars/...` branch. It writes a per-page title and description (counts, years) in
  ua/ru/en, a canonical URL, and `noindex` when `!indexable`.
- Add JSON-LD `Car`/`ProductModel` and hreflang alternates for `?lang=`.
- **Server-injected body, no build-step prerender.** The SPA shell is already rewritten per request (`meta.ts`), but the body is
  an empty `#root`, so a crawler must run JS to see the stats. For `/cars/...` also inject a small semantic block into `#root`:
  `<h1>`, a one-paragraph summary, a stats table (fuel, body, top regions, imports by year) and plain `<a>` links to year pages,
  sibling models and the make page (best crawl discovery). React replaces it on load without flicker; it must match what the
  user sees (no cloaking). Static prerender of all pages is rejected: the data changes with the monthly ingest, not with a
  deploy, and deploys are path-filtered.
- **Cache:** `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800` on `/cars/*` and `/api/catalog/*`, a
  Cloudflare cache rule, and a data-version in the cache key so the monthly ingest invalidates it. Optional in-memory LRU
  (24 h) for the rendered shell of hot pages.
- **Optional, after the MVP is indexed:** render the block once in `db:refresh-catalog` and store it (`catalog_model.seo_html`
  - JSON-LD), so a request is one primary-key read plus a string replace (about 0.5 day). Top ~300 models, make pages and
    `/cars` can be held in memory at API start.
- `sitemap.ts`: switch to a sitemap index with chunked `/sitemap-cars-N.xml`, indexable pages only.
- `STATIC_PAGES` gets `/cars` only. The dynamic pages get their text from the catalog table.

### Step 6: Docs

- `features-reference.md` gets a "Model catalog" section.
- Write-up in `plan-done.md`; seed CSV via `export:catalog:csv` for the overrides output, if needed.

## Rollout order

1. Steps 1-2, then check the folding quality with SQL. For example, the top 300 models should look like a real model list
   and not trims.
2. API and web for model-year pages.
3. Make and model index pages.
4. Sitemap: submit gradually and watch Search Console indexing before raising the page count.

## Verification

- `pnpm test` covers `catalogKey.test.ts`, with BMW, Mercedes, Sprinter, ВАЗ / ЗАЗ / Lanos, Cee'd and Mazda cases.
- `pnpm db:refresh-catalog`, then `SELECT` the top models per make and spot-check for leftover trims.
- `pnpm dev`, then open `/cars/bmw/x5/2015`. Sections load, there are no plate fields, and the network shows only catalog
  plus the existing section calls.
- `pnpm build` with `WEB_DIST_DIR`, then on `:3000/cars/bmw/x5/2015` check the meta, canonical and noindex for a
  below-threshold page. Check that `/sitemap.xml` lists the chunks.
- `pnpm lint && pnpm type-check`.
