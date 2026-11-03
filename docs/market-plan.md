# Market offers in the "Cars in stock" section (CarAPIS) - plan

Status: **steps 1-9 done (2026-11-03), step 10 = commit message; see PLAN.md for the post-deploy boxes**. Older note: steps 1-4 done (API side) - see "Progress and facts learned" below. Earlier status: planned (research and API tests done 2026-11-03). Goal: a block of real for-sale cards for the
car's make + model at the top of the existing `StockSection` (`?section=stock`), fed by the CarAPIS catalog API, with the
importer's new/used photo rows moved below under a "From the official brand site" label.

## What the API tests showed (dev key, free tier, 2026-11-03, ~13 requests)

- Base `https://api.carapis.com/apix/api`, header `X-API-Key: car_...`. Free = **100 requests/day**, HTTP 429 over it, **no rate-limit header** (we count ourselves, UTC day).
- `GET /vehicles/?brand=<slug>&model=<slug>&page_size=50&available_only=true` = **1 request** for up to 50 cards (~185-210 KB, ~1 s). Filters: `country` (ISO2), `source`, `min_year`/`max_year`, `min_price`/`max_price`, `status`, ... Unknown params return 400.
- **List rows have:** `id`, `source_code`, brand/model slugs and names, `trim`, `year`, `price_usd`, `price_original` + currency, `mileage`, `fuel_type`, `transmission`, `body_type`, `color`, `seller_type`, `region`, `source_location` (ISO2, country name, flag), `has_accident` (often null), `is_available`, `first_seen_at`, `last_seen_at`, `thumb`, `photos`, `photos_count`.
- **Only the detail call** (`/vehicles/{id}/`, 1 request) has `listing_url`, `listing_id`, `description`, engine cc, owners count, full photos.
- **`vin` and `vehicle_no` (plate) are empty** on every sample (Otomoto + Auto.ria). `search=<VIN>` finds nothing. VIN/plate matching is **not** possible; do not build on it.
- `country=UA` returns only `auto_ria_ua` (Kia Ceed: 143 rows, Skoda Octavia: 1,797). No other Ukrainian source exists in the 57 (no OLX.ua / RST). `/sources/` marks each source `live` or `on_demand` (Copart, IAAI, Mobile.de, AutoScout24 are `on_demand` = not in the free catalogue). Free-tier EU sources seen: Otomoto, Kleinanzeigen, Subito, Leboncoin, Autotrader UK, Blocket, Marktplaats, Autovit, ss.lv, finn.no, dba.dk.
- Model names differ from ours (`/models/?brand=kia&search=ce` lists `ced`, `cd-ceed`, ...). Map via `brandSlug` / `modelKey` from the catalog first; a slug lookup costs extra requests, so cache it.

## Step 1 probe results (2026-11-03, 3 requests)

- **Trucks and buses exist in the free catalogue:** `body_type=truck` = 14,027 rows, `body_type=bus` = 1,773 (so the `vehicle_kind` -> `body_type` mapping is worth building). Truck rows come mostly from `tweedehands_be`, `ememain_be`, `autobell` (KR) and `kleinanzeigen`; bus rows from `willhaben` (AT), `kleinanzeigen`, `otomoto`. Not checked: UA truck/bus rows (no `country=UA` combination tried).
- **`/sources/` = 57 sources, row keys `code,name,region,country,availability,last_parsed_at`** (the field is `availability`, values `live` / `on_demand`). **No US source exists at all** (no Copart, IAAI, Manheim); the only North American ones are `autotrader_ca` and `kijiji_ca` (Canada). So the fallback is DE / PL / FR / IT / BE / NL ..., never US.
- **`on_demand` now = `beforward`, `ss_lv`** (everything else, incl. `autoscout24`, `auto_ria_ua`, `otomoto`, `leboncoin`, `kleinanzeigen`, `subito`, `marktplaats`, `autotrader`, `autovit`, is `live`; the earlier note that AutoScout24 is `on_demand` is outdated: it is `live`).
- `MARKET_COUNTRY_ORDER` (step 2): `DE, PL, FR, IT, BE, NL, AT, CZ, SK, RO, LT/LV (none live except ss_lv on_demand), GB, CA, ...`, explicit constant; unknown countries last.

## Terms and legal (read before building)

- CarAPIS Terms (updated 2026-10-16): **allowed** = integrate into own systems, display listings on our own site/app to our own users, cache photos to serve them. **Forbidden** = resell / redistribute raw or near-raw data or expose it as our own feed/API/dataset, build a competing catalogue, remove watermarks/attribution, exceed or test rate limits, share the key. Compliance with copyright / database / data-protection law is on us (cl. 5).
- So: no raw passthrough endpoint, **never write CarAPIS data to `scripts/seed-data/` or any export**, `@Throttle` the endpoint, show attribution + source link on every card.
- **AUTO.RIA exception (decision pending, see "Open decisions"):** `legal-and-monetization.md` says "AUTO.RIA: link-out only, never read its data". Ukrainian cards would be Auto.ria rows delivered by CarAPIS. If kept, record it there as a deliberate exception: label "Auto.ria, via CarAPIS", takedown contact, env kill switch `MARKET_UA_ENABLED`, optional email to `verified_cars@auto.ria.com`.

## Iframe research (can we embed RIA / RST / OLX pages?) - 2026-11-03

Header check with a browser User-Agent (JS frame-busting cannot be seen from headers):

| Site                       | Response                                       | Framing headers                             |
| -------------------------- | ---------------------------------------------- | ------------------------------------------- |
| auto.ria.com (search page) | 200                                            | none (no `X-Frame-Options`, no CSP)         |
| rst.ua                     | 200 with browser UA (403 for curl without one) | none                                        |
| autoscout24.com            | 200                                            | none                                        |
| olx.ua                     | 200                                            | `X-Frame-Options: SAMEORIGIN` = **blocked** |
| otomoto.pl                 | 200                                            | `X-Frame-Options: SAMEORIGIN` = **blocked** |

- Technically RIA / RST / AutoScout24 are not blocked by headers, but: our own CSP (`infra/Caddyfile`, Report-Only now) has a `frame-src` allow-list, so each host would have to be added (and enforced CSP would then block others); they may use JS frame-busting or bot checks (untested); third-party cookies/ads/consent walls inside a frame, mobile layout and no attribution for us; and **framing a site whose terms forbid republishing is the riskier cousin of link-out**, not a safe middle. Recommendation: **do not iframe**. Keep link-out (`riaSearchUrl`, `rstSearchUrl`, OLX) and API cards. If wanted later, ask RIA / RST for written permission first and test frame-busting in a real browser.

## Design

### API: `apps/api/src/market/` (new feature; every constructor dep has `@Inject(Token)`)

1. `GET /api/market/:make/:model` (Zod params, `@Throttle`, **not** in `PUBLIC_API_PATH_PREFIXES` / the Cloudflare cache rule; the budget forbids edge caching) returns `{ kind: 'ua' | 'eu', items: MarketCard[], fetchedAt, budget: { used, limit } | null }`. `MarketCard` = id, source code + display name, country iso2, year, priceUsd, priceOriginal + currency, mileage, fuel, transmission, body, region, thumb, lastSeenAt, hasAccident.
2. **Two-step flow:** request 1 `country=UA` (`auto_ria_ua` only) with `page_size=50`; if fewer than ~6 rows, request 2 without `country` (EU/US, non-UA rows) and return `kind: 'eu'`. Common models cost 1 request, rare ones 2. Year is **not** part of the key; the web may filter by year client-side.
3. **Cache** under `brand+model`, TTL ~3 days for results, ~1 day for empty, never for 429/5xx. In-memory map (bounded, like `RiaService`) **plus a DB table** (migration `NNNN_market_cache.sql`, backward-compatible, `payload jsonb`, `fetched_at`) so a blue/green deploy does not burn the daily quota. Slug map cached too.
   - **Stale-while-revalidate (2026-11-03):** normal TTL ~3 days; when the remaining budget is low (< ~15 requests) serve a stale entry for up to **14 days** instead of hiding the section, and refresh it when the budget recovers (next UTC day). The card always prints `last seen`, so a stale card is honest.
4. **Detail + redirect (2026-11-03).** One detail request (`/vehicles/{id}/`, 1 unit) feeds both:
   - `GET /api/market/vehicle/:id` for the modal: `description` (label it a summary, it reads as machine-written), `photos` (~20), `engine_cc`, `drive_type`, `seat_count`, `owner_count`, `warranty_type`, `inspection_passed`, `has_accident`, `has_recall`, `is_undervalued` / `valuation_score` (optional "below market" chip), `availability_checked_at`, `last_seen_at`, `is_available`, `listing_url`, `listing_id`.
   - `GET /api/market/go/:id` = a **redirect endpoint**: a cache hit costs nothing, a miss costs 1 detail request, then `302` to `listing_url`. The card/modal link is a plain `<a href="/api/market/go/:id" target="_blank" rel="noopener noreferrer nofollow">`, so no popup-blocker problem (no fetch-then-`window.open`). **Guards:** resolve only ids that appeared in a list response we cached (else it is an open proxy for our 100 requests/day); `@Throttle`; never cache a failure; over budget = answer `204` and the web falls back to the source search link.
   - Detail cache TTL ~7 days per id in the same DB table (the described fields barely change). If `is_available` is false show "may be sold". The detail budget has its own reserve (list calls stop at 85/100, details may use the rest).
5. **Budget** (`market-budget.ts`): counter per UTC day in the same table or a tiny `market_budget` row. List calls allowed below 85/100, detail calls below 100. Over budget = `204`/empty and the web hides the block; `budget` is exposed (used/limit) because CarAPIS gives no header. Never cached 429.
6. Env: `CARAPIS_API_KEY` (optional; unset = feature off), `MARKET_UA_ENABLED` (default on if the legal decision is yes), in `env.ts` + `deploy-api.yml` + `docs/deploy.md`. The key lives in `.env` only, never in the repo or chat.
7. Contract in its own file `packages/shared/src/market.ts` (`marketResponseSchema`, new fields `.nullable().optional()`), then `pnpm --filter @carplates/shared build`.

### Web: restructure `StockSection.tsx` (one section, two blocks)

1. **Top block "Cars for sale" (new):** `MarketBlock` = a hook `use-market-actions.ts` + sub-components; `marketQuery` via `queryOptions()`, key `brand+model` (shared by plate card, catalog page and any `?section=stock`). Fetch only once the section is open (existing `open` state). Online-only (not in `offline-cache.ts`).
2. Header row (since 2026-11-03: the price chip cycles USD / EUR / UAH, and an "Open large view" button opens the full-list modal; "Show more" opens it too, see `features-reference.md` "Large view"): tags/chips for the dataset (`UA` or `Europe`, "via CarAPIS", "prices are asking prices, USD"), a `?` (`SectionInfo`, new section id `market`) explaining the source, freshness (`last seen`), what the flag/country means and why Ukraine may be empty; **requests-left counter** ("CarAPIS requests today: 37 / 100") when `budget` is present (small muted line; also on `/data-status`).
3. Cards: photo, year, price (USD + original), mileage, fuel, region + flag, source badge, `last seen` date. Tap opens a modal (detail request) with description, photos, the detail fields above and "Open at source" = the `/api/market/go/:id` link, plus attribution ("Data from CarAPIS").
   - **No-photo fallback chain (2026-11-03):** (1) the card's own `thumb`; (2) if it is missing or fails to load (`onError`, like `StockSection`'s `failedUrls`), **one shared model photo** for the whole block from `useCarHeroImageActions({ brand, model, year })` (stored copy first, Wikimedia as the server fallback, with the author/licence credit as in `WikiHeroImage`), marked with an "Illustrative photo" badge so it is never read as the car's own; (3) if there is no wiki photo either, a **temporary text card** in the style of the news cards without an image ([NewsCard.tsx](../apps/web/src/components/NewsCard.tsx)): `VehicleKindPlaceholder` / `VehicleKindIcon`, `BrandLogo` where it exists, year + model line. No extra CarAPIS request for any of these (the wiki image is one request shared by every card in the block and cached by TanStack Query under the same key as the hero). Above/below the cards keep the existing `riaSearchUrl` / `rstSearchUrl` / OLX link row ("Used KIA CEE'D 2012 on: AUTO.RIA RST OLX"): it already costs nothing.
4. **Existing importer rows move below** with a label "From the official KIA site" (`newCarsSection.officialLabel`, ua/ru/en) and the same `?` text noting they link to the importer. Empty market block = the section looks as today.
5. `?section=stock` share link keeps working; no new `LazySection` id unless the block is split out (then list it in `sections`). Cards are `LazySection`-safe (the whole section is already lazy). A new model-level section goes in **both** `ResultCard` and `ModelSections` per the catalog docs (here: the section already exists in both; check the catalog page mounts `StockSection` with brand/model).
6. i18n ua/ru/en (never `import '@/i18n'`; tests `await i18nReady`), UI text uses "-" not "—". Default export, one component per file, props type `Props`, derive during render, no sync `setState` in effects.

### Data-status

- A row in `routes/data-status/datasets.ts` (`CarAPIS listings`, cadence = on demand). The always-visible counter lives on the **admin Server tab** (see Decisions, item 4); the public line in the section is switchable with `MARKET_SHOW_BUDGET`.

### Future-proofing (other marketplaces / solutions)

- Put CarAPIS behind a small `MarketProvider` interface (`search(make, model, opts) -> MarketCard[]`, `detail(id) -> MarketDetail`, `budget()`), registered in `MarketModule`; the service merges providers in priority order and caches per provider. A new API (another aggregator, a dealer feed, cars.ua if permission arrives - see PLAN.md "cars.ua listing status") = one new provider file + a source badge, no web change. Keep per-provider terms notes in this file.

## Steps (each ends green: `pnpm format`, lint, typecheck, Vitest)

1. [x] (done 2026-11-03) **Record legal + probe:** the decisions above are made; update `legal-and-monetization.md` (AUTO.RIA bullet: deliberate exception, "data from CarAPIS" label, kill switch, email planned after the owner has seen it live). Spend ~3 requests: `body_type=truck`, `body_type=bus`, and `/sources/` (which US sources are `live`); note the result in this file.
2. [x] (done: shared `market.ts`, env, deploy-api.yml, deploy.md, README) **Shared contract + env:** `packages/shared/src/market.ts` (+ tests), `env.ts` (`CARAPIS_API_KEY`, `MARKET_UA_ENABLED`), `deploy-api.yml`, `docs/deploy.md`; build shared.
3. [x] (done: migration `0094_market_cache.sql`) **DB:** migration for cache + budget; no data erased.
4. [x] (done: `apps/api/src/market/`, 29 tests) **API provider + service:** `CarapisProvider` (fetch, Zod-validate upstream, timeout, no key = off), `MarketService` (two-step flow, slug map, TTLs + stale-while-revalidate, budget), controller (no logic; list, detail and `go/:id` redirect with the cached-id allow-list), module registered in `app.module.ts`. Vitest: slug mapping, UA->EU fallback threshold, TTLs and SWR, budget cutoff, 429 not cached, RIA kill switch, `go/:id` rejects an unknown id and redirects a known one without a second upstream call.
5. [x] **Web data layer:** `marketQuery`, `use-market-actions.ts`, helpers/types (`market/helpers.ts`, `types.ts`), tests.
6. [x] **Web UI:** `MarketBlock` + card + modal, restructure `StockSection` (market on top, importer rows labelled below), `SectionInfo` text, i18n ua/ru/en, counter line.
7. [x] **Data-status and admin:** dataset row on `/data-status`; admin Server-tab "Market" tile (used/limit, cache hits, UA vs EU fallbacks) from `GET /api/admin/server`.
8. [x] (4 real requests) **Manual check** with the real key on a plate page, a catalog page and `?section=stock`; look at the requests used; test the empty-UA fallback on a rare model, the over-budget path and the no-key path.
9. [x] **Docs after finishing:** `plan-done.md` write-up, one-line check in `PLAN.md`, `features-reference.md` section ("Market offers"), `shared/src/releases.ts` entry (new day => bump `web/src/routes/releases/latest.ts`), **`AboutRoute.tsx`**: `FEATURES` + `SOURCES` (CarAPIS, Auto.ria via CarAPIS, marketplaces) with `about.brief|feature|source.*` ua/ru/en, README env, post-deploy boxes in PLAN.md ("set `CARAPIS_API_KEY` on the VPS", "check requests used after a day").
10. Suggest a commit message (never commit unless asked).

## Decisions (2026-11-03)

1. **Auto.ria rows via CarAPIS: show.** Every card carries the label "Дані з CarAPIS" (ua) / "Data from CarAPIS" with the source name ("Auto.ria") - we do not scrape anything ourselves. Keep `MARKET_UA_ENABLED` as a kill switch and record the exception in `legal-and-monetization.md`. The owner will see it working in the app first, **then** email Auto.ria (draft below); if they object, flip the switch. No reply is expected, and the app does not depend on it.
2. **Vehicle types = what our app handles**: car, truck, bus (motorcycle only if CarAPIS has it). No ships, boats or other kinds. Map the registry `vehicle_kind` to the CarAPIS `body_type` filter (`car` -> sedan|hatchback|wagon|suv|coupe|convertible|crossover|minivan|van, `truck` -> truck|pickup, `bus` -> bus); cache key becomes `kind+brand+model`. **Untested:** whether the free catalogue holds trucks/buses at all - spend 2 requests on `body_type=truck` / `bus` before building the mapping; if empty, the block simply hides for those kinds.
3. **EU/US fallback order** follows where Ukraine's imports come from. Customs data for H1 2026 (all passenger cars, over 70% used; UNN, 2026-07-28): **USA 73.2k (43%), Germany 17.3k (10%), Poland 14.6k (9%)** = 62%; the other 50+ countries are not broken out in what I found (France, Lithuania, Czechia, Italy, Canada, Japan, China are plausible next ones: check the State Customs Service / Ukravtoprom release). Practical catch: **the US auction sources (Copart, IAAI, Manheim) are `on_demand`, not in the free catalogue**, so on the free tier the fallback order is effectively DE (Kleinanzeigen, AutoScout24) > PL (Otomoto) > FR (Leboncoin) > others, and US only if a US source appears in `/sources/` as `live`. Implement as a `MARKET_COUNTRY_ORDER` constant (shared, explicit, not derived) used to sort/pick cards; re-check `/sources/` at build time.
4. **Counter in both places:** a muted "requests left today" line in the section (hideable through an env flag, `MARKET_SHOW_BUDGET`, default on) **and** a tile on the admin dashboard that is always shown to the admin: new "Market" block on the admin **Server** tab ([AdminServerTab.tsx](../apps/web/src/routes/admin/AdminServerTab.tsx)), fed by `GET /api/admin/server` (`UsageAdminController`, `AdminGuard`; extend `adminServerResponseSchema` with `market: { used, limit, cacheHits, ua, eu }.nullable().optional()`). `/data-status` keeps the dataset row.

## Draft email to Auto.ria (send only after the feature is live and you have seen it work)

To: `verified_cars@auto.ria.com` (contact from `legal-and-monetization.md`; also try their general support). Subject: **Питання щодо відображення оголошень AUTO.RIA на carsua.app**

> Доброго дня!
>
> Мене звати Руслан Коркін, я розробник безкоштовного українського сервісу пошуку інформації про авто за номером або VIN - carsua.app. Сервіс некомерційний і не містить реклами, що замінює оголошення.
>
> У розділі «Авто в наявності» ми показуємо кілька актуальних оголошень за маркою та моделлю авто. Дані про оголошення (фото, ціна, рік, пробіг, регіон) ми отримуємо не самостійно, а через сторонній агрегатор CarAPIS (carapis.com), який, за його умовами, дозволяє відображати їх на власному сайті. Біля кожної картки ми вказуємо джерело («AUTO.RIA, дані з CarAPIS») і даємо пряме посилання на оголошення на auto.ria.com. Ми нічого не копіюємо з вашого сайту самостійно, не парсимо його, не зберігаємо контакти та персональні дані продавців і кешуємо відповідь не довше кількох днів.
>
> Чи не заперечуєте ви проти такого відображення? Якщо так, ми одразу приберемо оголошення AUTO.RIA з цього розділу й залишимо лише посилання на ваш сайт. Буду вдячний за будь-яку відповідь, а також за інформацію, чи є офіційний спосіб отримувати такі дані (API, партнерська програма).
>
> Дякую за увагу!
> Руслан Коркін
> carsua.app, rukrak86@gmail.com

## Progress and facts learned (2026-11-03, after step 4)

Done and green (format, lint 0 errors, typecheck, shared 566 / api 468 tests). Real CarAPIS calls used so far today: about 19 of 100 (probes and shape checks); none from the app yet.

- **Files:** `packages/shared/src/market.ts` (contract, `MARKET_COUNTRY_ORDER`, `MARKET_BODY_FILTER`, `marketIdSchema`, `sortMarketCards`), `packages/db/migrations/0094_market_cache.sql` (+ `marketCache`, `marketListing`, `marketBudget` in `schema.ts` / `index.ts`), `apps/api/src/market/` (`carapis-parse.ts`, `carapis.provider.ts`, `market-provider.ts` = ports + tokens, `market.repository.ts`, `market.service.ts`, `market.controller.ts`, `market.module.ts`), `MARKET_THROTTLE` in `common/throttle.ts`, `MarketModule` in `app.module.ts`.
- **Corrections to the design above (the code is the truth):** listing ids are **UUIDs**, not numbers; `thumb` is an object (`thumb_url` / `url`), `price_original` a decimal string; `/models/?brand=&search=` answers a bare array of `{slug,name,brand_slug}`; there is **no US source** and `autoscout24` is `live`.
- **Route:** `GET /api/market/:make/:model?kind=passenger|truck|bus` takes the **raw registry / VIN-decoded names** (the API maps them with `brandSlug` / `modelKey`, so the web needs no catalog lookup). Others: `GET /api/market/vehicle/:id` (modal, no `listingUrl`), `GET /api/market/go/:id` (302; 204 when the link is unknown or over budget; 404 for an id never seen in a cached list).
- **Response:** `{ kind: 'ua' | 'eu' | 'none', items, fetchedAt, stale, budget }`. `kind: 'eu'` = fewer than 6 Ukrainian cars, so Ukrainian cards (if any) come first, then Europe in `MARKET_COUNTRY_ORDER`; every card has `country`, so the web shows the flag per card. `none` = hide the block. `budget` is null when `MARKET_SHOW_BUDGET` is off.
- **Filters:** truck / bus send the single probed `body_type` value; passenger sends none (comma lists untested). The Europe step keeps only `MARKET_COUNTRY_ORDER` countries (a model with only KR / LY rows hides).
- **Budget:** counted per UTC day in `app.market_budget`; lists stop at 85, details may use up to 100; a 429 fills the counter for the day; `MarketService.stats()` returns `{used, limit, cacheHits, ua, eu} | null` for the admin tile (step 7).
- **Open checks for later steps:** (a) photo hosts: the CSP `img-src` in `infra/Caddyfile` may need the CarAPIS CDN host (read a real card in step 8, then allow it); (b) DI wiring and the Postgres store have only run against fakes, the first real request is in step 8; (c) `@Redirect()` plus `HttpException(204)` for `go/:id` is untested in a browser; (d) the admin tile needs `UsageAdminController` (`apps/api/src/usage/`) to inject `MarketService` (`MarketModule` already exports it).
- **Post-deploy boxes still to add to PLAN.md (step 9):** set the `CARAPIS_API_KEY` GitHub secret (and optional vars `MARKET_UA_ENABLED`, `MARKET_SHOW_BUDGET`), check requests used after a day, the owner emails Auto.ria after seeing it live.

## Message to continue in a new session

> Read `docs/market-plan.md` in full (all decisions are made; steps 1-4 are done, see "Progress and facts learned": the code in `apps/api/src/market/` and `packages/shared/src/market.ts` is the truth where the design text differs), then `docs/features-reference.md` (grep `^## ` for the "Stock news and info popups", "Model catalog" and "Data freshness" sections) and skim `apps/web/src/components/StockSection.tsx` with its tests. Continue at **step 5** (web data layer: `marketQuery` via `queryOptions()`, `use-market-actions.ts`, `market/helpers.ts` + `types.ts`, tests), tell me when each step is done before moving on, then 6 (UI), 7 (data-status row + admin Server tab tile), 8 (manual check), 9 (docs, About `FEATURES` / `SOURCES`, release note). Do not contact Auto.ria. Rules: `CLAUDE.md` / `CLAUDE_RULES.md`, UI text uses "-" not "—", `pnpm format` first, Vitest colocated, `await i18nReady` in text tests. The CarAPIS key is already in `apps/api/.env` (that file is read-protected: load it with `node --env-file=apps/api/.env script.mjs` and never print it). Free tier is 100 requests/day (about 19 used today): develop against fixtures and the cache, make at most a handful of real calls, none before step 8. Never write CarAPIS data to seed CSVs or expose a raw feed. Do not commit or push (the steps 1-4 changes may still be uncommitted: check `git status`).
