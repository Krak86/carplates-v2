# carplates-v2

Ukrainian vehicle lookup by **plate number** or **VIN**. Rebuild of
[carsua.app](https://carsua.app).

- Plate data: the state open-data registry ([data.gov.ua](https://data.gov.ua/dataset/06779371-308f-42d7-895e-5a39833375f0)) → Postgres
- VIN data: [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/vehicles/decodevin) (proxied), presented as an Overview
  (VIN anatomy, equipment map with airbags/drive/seats, engine and origin cards, grouped details) or Raw data
- Crash-test safety ratings, six sources: [NHTSA](https://api.nhtsa.gov/SafetyRatings) (proxied,
  US-spec) · [Euro NCAP](https://www.euroncap.com) (scraped, EU-spec) ·
  [JNCAP](https://www.nasva.go.jp/mamoru/en/) (scraped, JDM-domestic) · [C-NCAP](https://www.c-ncap.org.cn)
  (scraped, China-market) · [KNCAP](https://www.kncap.org) (scraped, Korea-market) ·
  [IIHS](https://www.iihs.org) (scraped, US, insurance-industry-funded)
- Fuel economy / CO2 reference data: [EPA](https://www.fueleconomy.gov) (US) + [EEA](https://www.eea.europa.eu) (EU, WLTP/NEDC)
  → `registry.fuel_economy`, shown as a badge on the result card and on `/fuel`; `/safety` ranks all crash-test sources
- Reviews & test drives: links to [infocar.ua](https://www.infocar.ua) test drives and owner reviews matched to the
  car's make/model/year (from a crawled catalog, `registry.infocar_versions`; owner reviews also get a year-filtered
  link), [ITC.ua](https://itc.ua/ua/tag/test-drayv-ua/) and [Mezha](https://mezha.ua/tag/test-drayv/) tech-press test drives of the car's model (every language edition: UA/RU, UA/EN; `registry.press_reviews`), [e-drive.com.ua](https://e-drive.com.ua) owner posts for the car's generation, [TopGear](https://www.topgear.com/car-reviews)
  UK editorial reviews (score out of 10 + blurb, English; `registry.topgear_reviews`) and a DRIVE2 search link — links
  only, nothing copied. infocar videos play from YouTube on demand, followed by the latest uploads of the make's (and its parent group's) official YouTube channel (`pnpm ingest:social`, `registry.social_posts`; titles, thumbnails and links only); community 3D models ([Sketchfab](https://sketchfab.com))
  open in a "3D view" modal, and [CarShow360](https://carshow360.net) 360° exterior/interior galleries (every generation/trim of the make/model, links only) in a "360° view" modal
- Result-card hero photo: served from our stored Wikimedia cache first (`/api/wiki/image`, year-aware Commons search; live Commons/Wikipedia lead image only as a fallback, then a per-kind placeholder); the Wikipedia article text loads only when its section is opened
- Background layers on every page (button in the header, online only, session-only): car photos (default), a Google Maps
  view (the plate's region capital on a result page, else Ukraine), or a live YouTube stream — NASA ISS "Earth from space",
  street/traffic cams or a city view (low quality on purpose, selectable; disabled on data-saver/≤3G). Advanced search shows an OpenStreetMap view of the chosen region
- Auto news: recent Ukrainian/Russian/English auto-news headlines (infocar, eauto, autoua, novyny.live, Car and Driver, Motor1, Carscoops…) (links out, no article text) polled from RSS feeds listed in `scripts/news-sources.json` (`pnpm ingest:news`, `registry.news_items`) — a self-scrolling strip on the homepage, a 📰 News section on result cards (make+model, then make news; Ukrainian UI shows Ukrainian-language items only) and a desktop-only side panel that fades in on scroll; a `/news` archive page lists everything paged (10 per page) with outlet filter chips, date sort and title search, state kept in the URL
- Side widgets (desktop ≥ 1400 px, online, appear after the first scroll on a plate result): recent auto-news on the right; on the left recent [Bluesky](https://bsky.app) posts about the car (keyword search, links out) above the share price of the listed company behind the make ([Yahoo Finance](https://finance.yahoo.com) chart data, 1D/1M/1Y, proxied and cached by the API)
- Accounts (optional): **Sign in with Google** (button in the header; own session cookie, no third-party auth service), a **Features** page (extras opt-ins; hidden until a feature is built, nothing is charged), account deletion, an **admin** page (accounts + the features they asked for, and a **Statistics** tab with anonymous lookup/sign-in counts and PostHog analytics), **favorites/history sync** across devices (local IndexedDB stays the source of truth; capped at 100 / 200), and a **/settings** page (default layer, saved streams, background presets, up to 10 favorite labels) that follows the account. Admins are made directly in the DB. Everything account-related is online-only and is not precached by the PWA
- **Free test drive** (desktop only, online only): a promo banner beside the result card (a small 🎮 button on narrower desktops) opens a pseudo-3D racer in a modal — drive your car along a hilly road with traffic. The engine is ported from [javascript-racer](https://github.com/jakesgordon/javascript-racer) (MIT, Jake Gordon); the cars are renders of CC-BY/CC0 3D models (credited on the About page), the backdrops are the owner's photos, and the scenery and sound are generated in code (the original's OutRun sprites and licensed music are not used). Car colour (starts as the registry colour) and body type (starts from the vehicle kind) are set from the car; scenery, backdrop, lanes, traffic and resolution start random on each opening; everything changes live; sound is off by default; the plate is printed on the car and a billboard; the settings are shareable as a link (`?section=race&tab=…`). A km counter shows the distance driven in the session. The game is also a standalone page, **Test drive** (`/race`, in the sidebar): no plate needed — a random famous car, with an example per car type (sedan, hatchback, SUV, …) to pick. The game is a lazy chunk (~10 KB gzip) fetched only after a confirmation and kept out of the PWA precache
- Skeleton placeholders while the stats pages and homepage stats load; the About page lists every data source with its icon
- Cross-market and EU data (separate, removable blocks): [VehiclesDB](https://github.com/vehiclesdb/vehiclesdb) chips (CC BY 4.0; where the model is also sold, popularity, "also known as") and a collapsible **Specs** block from [RDW](https://opendata.rdw.nl) (CC0, "EU (NL) data": power, mass, dimensions, consumption, NL list price, fuel/colour mix as min/median/max), also shown on the VIN page as "typical for this model"; VIN decode fields are translated to UA/RU with the English original beside them
- Light/dark theme, AR plate scan (shareable `?section=ar` link), click the plate/VIN to copy it, plate and VIN photo search (VIN: on-device barcode, else self-hosted OCR; found VINs are outlined on the photo and listed as chips), VIN decode with an offline VIN-prefix fallback for cars NHTSA does not know (labelled "≈" fields), link previews for shared plate/VIN URLs
- Installable PWA with offline mode: recent results, history and favorites stay available without a connection

pnpm monorepo · Node 24 · React 19 + Vite 8 · NestJS 11 + Fastify · Drizzle + Postgres 18.

## Quick start

```bash
pnpm install
pnpm db:up            # postgres:18.6 in Docker
pnpm db:migrate
```

Then load data one of two ways — pick one, both work against the same schema:

### Option A — test data (seconds)

```bash
pnpm db:seed          # ~1000 deterministic synthetic rows
pnpm dev               # web http://localhost:5173 · api http://localhost:3000
```

Search a seeded plate (`ВЕ7116АА` or its Latin spelling `BE7116AA`), a
multi-registration plate (`КА0001АА`), or a real 17-char VIN.

### Option B — real data (hours, ~20 GB)

```bash
pnpm ingest:full       # all 13 years from data.gov.ua + 2026 plate recovery + backfill
pnpm ingest:euroncap:csv   # real Euro NCAP crash-test ratings, from a committed CSV — seconds, no scraping
pnpm ingest:jncap:csv      # real JNCAP (Japan) ratings, from a committed CSV — seconds, no scraping
pnpm ingest:cncap:csv      # real C-NCAP (China) ratings, from a committed CSV — seconds, no fetching
pnpm ingest:kncap:csv      # real KNCAP (Korea) ratings, from a committed CSV — seconds, no fetching
pnpm ingest:iihs:csv       # real IIHS (US) ratings, from a committed CSV — seconds, no scraping
pnpm dev
```

`ingest:full` chains three steps — see [scripts/src/ingest-full.ts](scripts/src/ingest-full.ts)
and [docs/plan-done.md](docs/plan-done.md)'s "2026 plate removal" section for what each does and why:

1. `pnpm ingest` — every CKAN year (2013-2026), largest datasets take minutes each
2. Downloads and ingests an archived pre-redaction 2026 snapshot (government order
   №67/ОД stripped plates from the live 2026 export from May 2026 — plates are present for 2013 – 29 April 2026; this restores them
   for the months it covers). Best-effort: skipped with a warning if that source
   is temporarily unreachable, the run isn't failed by it.
3. `pnpm ingest -- --backfill-plates` — reconstructs plates for the rest of the
   2026 rows by cross-referencing VIN + registration date across the full history

For a faster real-data taste without the full run, ingest a single year, optionally capped:

```bash
pnpm ingest -- --year 2024 --limit 100000
```

## Database objects

`pnpm db:migrate` creates everything — `registry.registrations` (full history),
`registry.euroncap_ratings`/`jncap_ratings`/`cncap_ratings`/`kncap_ratings`/`iihs_ratings`
(one plain table per scraped crash-test source — NHTSA has none, it's
proxied live instead), `registry.ingested_resources` (idempotency
bookkeeping), the static `registry.plate_regions` lookup (populated by the
migration itself, no separate step), and every materialized view
(`current_registration` + ten `stats_by_*` rollups — all created `WITH NO
DATA`, i.e. empty until refreshed). **You don't need a separate refresh
step for a clean setup**: `db:seed`, `ingest`/`ingest:full`, and each
`ingest:*:csv` command refresh everything they touch as the last step of
their own run — the Quick start commands above are the complete recipe.

User-writable account data lives in its own **`app` schema** (`users`, `auth_identities`, `sessions`,
`user_features`, `user_saved_entries`, `user_settings`, `usage_events`; migrations `0034`–`0038`), separate from the derived, re-ingestable `registry` — `db:seed` and the ingests never touch it.
To make someone an admin (they must have signed in once):
`UPDATE app.users SET role = 'admin' WHERE email = 'you@gmail.com';`

A standalone refresh is only needed when you add data to an **already-seeded**
DB outside those commands:

- **Added a new `stats_by_*` materialized view** (a new
  `packages/db/migrations/NNNN_*.sql`, same shape as
  `0002_stats_rollups.sql`/`0004_stats_by_brand.sql`, + a line in
  `refreshStats()` in `packages/db/src/client.ts`) — `pnpm db:migrate` creates
  it empty; re-running the hours-long `ingest:full` just to populate it would
  be wasteful, so run `pnpm db:refresh-stats` instead. It rebuilds
  `current_registration` and every `stats_by_*` view from whatever's already
  in `registrations`, touching no source data — seconds, not hours.
- **Updated crash-test rating data** (`pnpm ingest:euroncap`/`ingest:jncap`/
  `ingest:cncap`/`ingest:kncap`/`ingest:iihs` picked up new/changed assessments) — each
  `registry.*_ratings` table is a plain table, written directly by that
  scraper's own upsert, so nothing needs refreshing; just re-run the matching
  `pnpm export:*:csv` afterward so the committed
  `scripts/seed-data/*-ratings.csv.gz` snapshot stays current for the next
  zero-scrape setup (see the `ingest:*:csv` commands above).

## Optional features (API keys)

Everything above (plate/VIN search) works with zero external keys. These
features are optional add-ons, each gated on its own key in `apps/api/.env` —
absent, the app runs fine and that one feature just answers "unavailable":

| Feature                          | Env var                        | Get a free key at                                                             |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| Find a plate by photo/camera     | `PLATE_RECOGNIZER_CLOUD_TOKEN` | [platerecognizer.com](https://platerecognizer.com)                            |
| "What it might look like" photos | `PIXABAY_API_KEY`              | [pixabay.com/api/docs](https://pixabay.com/api/docs/)                         |
| Sign in with Google              | `GOOGLE_CLIENT_ID`             | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |

Add whichever you want to `apps/api/.env` (see `apps/api/.env.example`), then
restart `pnpm dev` — both are read once at process start, so editing `.env`
alone while the dev server is already running has no effect.

Google sign-in needs an OAuth client of type **Web application** (no client secret is used): add
`http://localhost:5173` and `http://localhost:3000` as Authorized JavaScript origins (redirect URIs stay empty / unused),
put the client id in `GOOGLE_CLIENT_ID`, and — while the consent screen is in Testing — add your Google account as a
test user. Without the id the sign-in popover just says it is not configured.

One more optional add-on lives in the web app: `VITE_GOOGLE_MAPS_EMBED_KEY` in
`apps/web/.env` (see `apps/web/.env.example`) switches the "Nearby services" map
from a keyless Google Maps embed to the official Embed API. Vite reads it at
build/dev start, so restart `pnpm dev` after changing it.

## Offline / PWA

The app is an installable PWA (`vite-plugin-pwa`). The service worker is only
generated by a production build — test it with `pnpm build` and then serve the
built web app through the API, not with `pnpm dev` — `pnpm preview:prod` builds and does exactly that (port 3000, stop `pnpm dev` first). Saved results live in
IndexedDB (200 plates / 200 VINs, 30 days; favorites never expire) and are
marked out of date via `GET /api/stats/version` after a re-ingest.

## Workspace

| Package           |                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | plate normalization, regions, Zod schemas                                                                                                                                                                                                                                                                                                                                                                                   |
| `packages/db`     | Drizzle schema + client + SQL migrator                                                                                                                                                                                                                                                                                                                                                                                      |
| `apps/api`        | NestJS + Fastify — plate/VIN/safety-ratings endpoints, auth + paid-feature opt-ins, Swagger, SPA host + meta injection                                                                                                                                                                                                                                                                                                      |
| `apps/web`        | Vite + React + React Router                                                                                                                                                                                                                                                                                                                                                                                                 |
| `scripts`         | `seed.ts`, `ingest.ts`, `ingest-full.ts`, `refresh-stats.ts`, `euroncap.ts`/`jncap.ts`/`cncap.ts`/`kncap.ts`/`iihs.ts` (crash-test rating scrapers), `infocar.ts`/`edrive.ts`/`press.ts`/`topgear.ts`/`sketchfab.ts`/`carshow360.ts` (review, owner-post, 3D-model and 360°-gallery catalogs — links + facts only), `news.ts`/`social.ts` (RSS auto-news and brand YouTube-channel feeds — links + facts only, no CSV seed) |

See [CLAUDE.md](CLAUDE.md) for conventions and [PLAN.md](PLAN.md) for the roadmap.

## Scripts

`pnpm dev · preview:prod · build · lint · type-check · test · format` ·
`pnpm db:up · db:down · db:reset · db:migrate · db:seed · db:refresh-stats · ingest · ingest:full` ·
`pnpm ingest:euroncap · ingest:euroncap:csv · export:euroncap:csv` ·
`pnpm ingest:jncap · ingest:jncap:csv · export:jncap:csv` ·
`pnpm ingest:cncap · ingest:cncap:csv · export:cncap:csv` ·
`pnpm ingest:kncap · ingest:kncap:csv · export:kncap:csv` ·
`pnpm ingest:iihs · ingest:iihs:csv · export:iihs:csv` ·
`pnpm ingest:fuel · ingest:fuel:csv · export:fuel:csv · db:refresh-fuel-stats` ·
`pnpm ingest:infocar · ingest:infocar:csv · export:infocar:csv` (+ `:videos` variants) ·
`pnpm ingest:edrive · ingest:edrive:csv · export:edrive:csv` ·
`pnpm ingest:press · ingest:press:csv · export:press:csv` (~10 min cold, 1 req/s) ·
`pnpm ingest:topgear · ingest:topgear:csv · export:topgear:csv` (~20–25 min cold, 1 req/s) ·
`pnpm ingest:news` (RSS auto-news; feeds in `scripts/news-sources.json`; `--source`, `--dry-run`, `--list`; no CSV seed — schedule it) ·
`pnpm ingest:social` (brand + parent-group YouTube channel uploads from public RSS feeds, no key; `--channel`, `--dry-run`, `--list`; no CSV seed — schedule it, see [SCHEDULE.md](SCHEDULE.md)) ·
`pnpm ingest:sketchfab · ingest:sketchfab:csv · export:sketchfab:csv` ·
`pnpm ingest:carshow360 · ingest:carshow360:csv · export:carshow360:csv` (sitemap only; `--enrich`, `--retry-failed`) ·
`pnpm ingest:vehiclesdb · ingest:vehiclesdb:csv · export:vehiclesdb:csv · db:refresh-vdb-stats · db:refresh-derived` (VehiclesDB cross-market catalog, CC BY 4.0; `db:refresh-derived` rebuilds the fuel/safety/markets rollups) ·
`pnpm ingest:ratings:csv · ingest:all` ·
`pnpm --filter scripts build:kind-images` (re-encode `apps/web/assets-src/kind/*.jpg` → `public/kind/*.{avif,webp}`)

## License

MIT
