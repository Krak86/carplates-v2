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
- Result-card hero photo: served from our stored Wikimedia cache first (`/api/wiki/image`, year-aware Commons search; live Commons/Wikipedia lead image only as a fallback, then a per-kind placeholder); a "DB" / "Wiki live" label shows the source and an "Update photo" button re-fetches it (`?refresh=true`); the Wikipedia article text loads only when its section is opened
- Background layers on every page (button in the header, online only, session-only): car photos (default), a Google Maps
  view (the plate's region capital on a result page, else Ukraine), or a live YouTube stream — NASA ISS "Earth from space",
  street/traffic cams or a city view (low quality on purpose, selectable; disabled on data-saver/≤3G). Advanced search shows an OpenStreetMap view of the chosen region
- Auto news: recent Ukrainian/Russian/English auto-news headlines (infocar, eauto, autoua, novyny.live, Car and Driver, Motor1, Carscoops…) (links out, no article text) polled from RSS feeds listed in `scripts/news-sources.json` (`pnpm ingest:news`, `registry.news_items`) — a self-scrolling strip on the homepage, a 📰 News section on result cards (make+model, then make news; Ukrainian UI shows Ukrainian-language items only) and a desktop-only side panel that fades in on scroll; a `/news` archive page lists everything paged (10 per page) with outlet filter chips, date sort and title search, state kept in the URL
- Side widgets (desktop ≥ 1400 px, online, appear after the first scroll on a plate result): recent auto-news on the right; on the left recent [Bluesky](https://bsky.app) posts about the car (keyword search, links out) above the share price of the listed company behind the make ([Yahoo Finance](https://finance.yahoo.com) chart data, 1D/1M/1Y, proxied and cached by the API). The Social section also searches [Stack Exchange](https://mechanics.stackexchange.com) (Motor Vehicle Maintenance & Repair) and [Lemmy](https://lemmy.world) straight from the browser (keyless, links out); on screens ≥ 1760 px they appear as a second widget column beside Bluesky and the news
- Accounts (optional): **Sign in with Google** (button in the header; own session cookie, no third-party auth service), a **Features** page (extras opt-ins; hidden until a feature is built, nothing is charged), account deletion, an **admin** page (accounts + the features they asked for, and a **Statistics** tab with anonymous lookup/sign-in counts and PostHog analytics), **favorites/history sync** across devices (local IndexedDB stays the source of truth; capped at 100 / 200), and a **/settings** page (default layer, saved streams, background presets, up to 10 favorite labels) that follows the account. Admins are made directly in the DB. Everything account-related is online-only and is not precached by the PWA
- **Free test drive** (desktop only, online only): a promo banner beside the result card (a small 🎮 button on narrower desktops) opens a pseudo-3D racer in a modal — drive your car along a hilly road with traffic. The engine is ported from [javascript-racer](https://github.com/jakesgordon/javascript-racer) (MIT, Jake Gordon); the cars are renders of CC-BY/CC0 3D models (credited on the About page), the backdrops are the owner's photos, and the scenery and sound are generated in code (the original's OutRun sprites and licensed music are not used). Car colour (starts as the registry colour) and body type (starts from the vehicle kind) are set from the car; scenery, backdrop, lanes, traffic and resolution start random on each opening; everything changes live; sound is off by default; the plate is printed on the car and a billboard; the settings are shareable as a link (`?section=race&tab=…`). A km counter shows the distance driven in the session. The game is also a standalone page, **Test drive** (`/race`, in the sidebar): no plate needed — a random famous car, with an example per car type (sedan, hatchback, SUV, …) to pick. The game is a lazy chunk (~10 KB gzip) fetched only after a confirmation and kept out of the PWA precache
- **Estimated value** chip on the result card (`~ € X–Y`): Dutch new price (RDW) × a depreciation curve, plus a Ukrainian import-customs breakdown (duty, excise, VAT) in EUR/USD/UAH at [NBU](https://bank.gov.ua) rates (`GET /api/fx`). An estimate, never a market price; computed per request, no ingest of its own
- **Weight rankings**: heaviest / lightest models per vehicle group (passenger, truck, bus, motorcycle, trailer) on `/stats` and the homepage, and 🏋️ / 🪶 chips on the result card (`registry.stats_weight`, `pnpm db:refresh-weight-stats`)
- **Spec rankings**: highest / lowest passenger-car models by power, engine, height, length and fuel tank on `/stats` (`registry.stats_spec`, `pnpm db:refresh-spec-stats`)
- **Car generations** (Wikidata CC0 + Wikipedia): a chip like "XV40 · 2006–2011" on the card and the VIN page (`registry.model_generations`, `pnpm ingest:generations`), and a **Generation specs** section from Wikipedia (engines with power, drive and gearbox, gap dimensions where RDW has no row; `registry.model_spec_wiki`, `pnpm ingest:wikispecs`)
- Every /stats, /fuel and /safety section has a ❓ explanation with its sources; the collapse-all button shows on plate / VIN pages only
- **Copy all info / export** (clipboard, txt, md, csv, docx, pdf): the lookup plus RDW specs, VehiclesDB, the reviews catalog, the value breakdown with charts, and NBU rates
- Skeleton placeholders while the stats pages and homepage stats load; the About page lists every data source with its icon
- Cross-market and EU data (separate, removable blocks): [VehiclesDB](https://github.com/vehiclesdb/vehiclesdb) chips (CC BY 4.0; where the model is also sold, popularity, "also known as") and a collapsible **Specs** block from [RDW](https://opendata.rdw.nl) (CC0, "EU (NL) data": power, mass, dimensions, consumption, NL list price, fuel/colour mix as min/median/max), also shown on the VIN page as "typical for this model"; VIN decode fields are translated to UA/RU with the English original beside them
- Light/dark theme, AR plate scan (shareable `?section=ar` link), click the plate/VIN to copy it, plate and VIN photo search (VIN: on-device barcode, else self-hosted OCR; found VINs are outlined on the photo and listed as chips), VIN decode with an offline VIN-prefix fallback for cars NHTSA does not know (labelled "≈" fields), link previews for shared plate/VIN URLs
- Installable PWA with offline mode: recent results, history and favorites stay available without a connection; `/install` explains it
- Company news (Yahoo Finance) next to the share price, and passwordless email / Google / Telegram sign-in with a `/profile` page
- **Size & parking** section and a size-class chip (`?section=size&tab=schema|parking|garage|norms`): dimensions merged from RDW / Wikipedia / VIN, a to-scale drawing, parking-place and garage fit checks against the Ukrainian norms (ДБН, ПДР)
- **Wanted (stolen) check** by plate or VIN from the National Police open data (`pnpm ingest:wanted`, `registry.wanted_vehicles`, `GET /api/wanted`); a red chip shows only when something is listed. Live data, not part of the seed CSVs
- **What's new** page (`/releases`): day-by-day change log in ua/ru/en, linked from the sidebar and the PWA update bar ("Update & see what's new"); a header bell shows a dot for unseen updates and a dropdown of the latest ones
- Result-card sections link to each other (row "jump" arrows, Specs group links, "?" explainers on header chips); the About page lists the features and every data source

pnpm monorepo · Node 24 · React 19 + Vite 8 · NestJS 11 + Fastify · Drizzle + Postgres 18.

## Quick start

Prerequisites: **Node 24** (`>=24 <25`), **pnpm 12**, **Docker** (Postgres 18.6; the optional ALPR container and Mailpit also run in it).
Real-data setup needs ~20 GB of free disk and, for the few commands that download ZIPs by hand (UK MOT), [7-Zip](https://www.7-zip.org).
No Python is needed on the host (the ALPR service has its own image).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # optional: only needed for the API keys in "Environment reference" below
cp apps/web/.env.example apps/web/.env      # optional: Maps embed key, telemetry, Disqus
pnpm db:up            # postgres:18.6 in Docker (dev credentials carplates:carplates, port 5432)
pnpm db:migrate
```

Everything works with an empty `.env`: plate/VIN search, stats, sign-in by email code (printed in the API log) and every
seeded dataset need no key. Keys only switch on the extras listed under "Environment reference".

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
pnpm ingest:all        # RECOMMENDED: db:migrate + ingest:full + every committed seed CSV (below) + derived rollups
pnpm dev
```

`ingest:all` runs `ingest:full` (the registry, hours) and `ingest:ratings:csv` (all seed CSVs in `scripts/seed-data/`, minutes,
no scraping) concurrently, then `db:refresh-derived`. The seed CSVs fill: Euro NCAP / JNCAP / C-NCAP / KNCAP / IIHS ratings,
EPA + EEA fuel economy, infocar / ITC / Mezha / e-drive / TopGear / press reviews, infocar + Honda + YouTube videos, Sketchfab 3D
models, CarShow360 galleries, Winner Imports stock, Wikimedia hero photos, VehiclesDB, RDW specs + recalls, Transport Canada
recalls (+ NLLB recall translations), Open EV Data, UK MOT common faults, Wikidata generations + brand origin, Wikipedia
spec tables, VIN WMI prefixes, model plants, auto news + brand YouTube posts, stolen-car history (stolen.in.ua) and the DTP
road-safety tables. Per-command details: [docs/commands-reference.md](docs/commands-reference.md).

Not seeded on purpose (live feeds, run on a schedule on the VPS, see [SCHEDULE.md](SCHEDULE.md)): `ingest:wanted` (National Police
wanted vehicles), `ingest:wanted-plates` (Garpun), `ingest:auctions` (SETAM), `ingest:prozorro`, `ingest:news`, `ingest:social`,
`ingest:dtp:patrol`, `ingest:rdw-recalls`, `ingest:ca-recalls`. Run any of them once by hand to fill its card locally.
Also not seeded: `registry.missed_lookups` (user telemetry), `stats_*` (rebuilt by `db:refresh-derived`) and `app.*` (accounts).

Manual alternative (the five rating loads only, no other seed data):

```bash
pnpm ingest:full && pnpm ingest:euroncap:csv && pnpm ingest:jncap:csv && pnpm ingest:cncap:csv && pnpm ingest:kncap:csv && pnpm ingest:iihs:csv
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
`user_features`, `user_saved_entries`, `user_settings`, `usage_events`, `shared_photos` for the private photo links; migrations `0034`–`0038`, `0088`–`0091`), separate from the derived, re-ingestable `registry` — `db:seed` and the ingests never touch it.
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

| Feature                          | Env var                                                                              | Get a free key at                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Find a plate by photo/camera     | `PLATE_RECOGNIZER_CLOUD_TOKEN`                                                       | [platerecognizer.com](https://platerecognizer.com)                                            |
| "What it might look like" photos | `PIXABAY_API_KEY`                                                                    | [pixabay.com/api/docs](https://pixabay.com/api/docs/)                                         |
| Sign in with Google              | `GOOGLE_CLIENT_ID`                                                                   | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)                 |
| Sign in with Telegram            | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME`                                       | [@BotFather](https://t.me/BotFather) (`/newbot`, then `/setdomain`, https only)               |
| Email sign-in (code + link)      | `MAIL_TRANSPORT` (+ `RESEND_API_KEY` or `SMTP_URL`), `MAIL_FROM`, `AUTH_SECRET`      | [resend.com](https://resend.com) (3k mails/month free) · Brevo, Postmark, SES via SMTP        |
| Bot check on "send code"         | `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`                                        | [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) (free) |
| Own-model plate recognition      | `ALPR_LOCAL_URL` (+ `ALPR_API_KEY`)                                                  | no account: `pnpm alpr:build && pnpm alpr:up` (see "Self-hosted ALPR" below)                  |
| Shared photo links               | `SHARES_R2_ENDPOINT` + `SHARES_R2_ACCESS_KEY_ID` + `SHARES_R2_SECRET_ACCESS_KEY`     | Cloudflare R2 private bucket (needs `ALPR_LOCAL_URL` too, for the face blur); docs/deploy.md  |
| Admin live analytics             | `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`                                    | [posthog.com](https://posthog.com) → personal API key, scope `query:read`                     |
| Error reporting (API / web)      | `ENABLE_TELEMETRY=true` + `SENTRY_DSN` / `VITE_ENABLE_TELEMETRY` + `VITE_SENTRY_DSN` | [sentry.io](https://sentry.io)                                                                |
| AUTO.RIA fallback for old plates | `RIA_CHECK_ENABLED=true`                                                             | no key (unofficial endpoint, 5 calls / 90 s per IP, so off by default)                        |
| Contact form inbox               | `CONTACT_TO` (or `MAIL_REPLY_TO`)                                                    | any mailbox; neither set = the form is disabled                                               |

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

Production-only API settings: `PUBLIC_SITE_URL` (real origin — used by link previews, `/sitemap.xml` and `/robots.txt`) and
`TRUST_PROXY=true` (only behind Caddy/Cloudflare, so per-IP rate limits see the client IP). Deploy checklist: `PLAN.md` "Deploy-time
security checklist".

### Environment reference

Every variable the app reads. API: validated in [apps/api/src/env.ts](apps/api/src/env.ts) (a bad value stops the boot).
In production the same names are GitHub Environment `production` secrets / variables, written to the VPS by `deploy-api.yml` (list and
setup order: [docs/deploy.md](docs/deploy.md) "Secrets and variables"). **Bold** = required in production.

| Variable                                                                                           | Default                                           | Meaning                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                                         | `development`                                     | `production` turns on the boot checks below                                                                                                                                                         |
| `PORT`                                                                                             | `3000`                                            | API port                                                                                                                                                                                            |
| **`DATABASE_URL`**                                                                                 | dev Postgres                                      | Production refuses the dev credentials; CI builds it from `POSTGRES_PASSWORD`. Scripts read it too                                                                                                  |
| `WEB_DIST_DIR`                                                                                     | unset                                             | Built web app the API serves (unset in dev: Vite serves it). `/web/current` on the VPS                                                                                                              |
| **`PUBLIC_SITE_URL`**                                                                              | `http://localhost:3000`                           | Public https origin: link previews, sitemap, robots, magic links. Not localhost in production                                                                                                       |
| `NHTSA_BASE_URL`, `NHTSA_SAFETY_RATINGS_BASE_URL`                                                  | NHTSA vPIC / `api.nhtsa.gov`                      | VIN decode and 5-star ratings (keyless, proxied)                                                                                                                                                    |
| `PLATE_RECOGNIZER_CLOUD_TOKEN`, `PLATE_RECOGNIZER_CLOUD_ENABLED`, `…_URL`, `…_MONTHLY_BUDGET`      | off, 2000 / month                                 | Paid cloud OCR fallback: needs the token **and** `ENABLED=true`                                                                                                                                     |
| `ALPR_LOCAL_URL`, `ALPR_API_KEY`                                                                   | unset                                             | Self-hosted ALPR container. Same `ALPR_API_KEY` on both sides (sent as `x-alpr-key`); unset key = ALPR open                                                                                         |
| `SHARES_R2_ENDPOINT`, `SHARES_R2_BUCKET`, `SHARES_R2_ACCESS_KEY_ID`, `SHARES_R2_SECRET_ACCESS_KEY` | bucket `carsua-shares`                            | Private R2 bucket for shared photo links; all three + `ALPR_LOCAL_URL` or `POST /api/shares` answers 503                                                                                            |
| `RIA_CHECK_ENABLED`, `RIA_CHECK_BASE_URL`                                                          | `false`, `https://auto.ria.com`                   | AUTO.RIA "check a car" fallback for plates missing from the registry                                                                                                                                |
| `PIXABAY_API_KEY`, `PIXABAY_BASE_URL`                                                              | unset                                             | "What it might look like" photos; unset = 503                                                                                                                                                       |
| `CARAPIS_API_KEY`, `CARAPIS_BASE_URL`, `MARKET_UA_ENABLED`, `MARKET_SHOW_BUDGET`                   | unset, `https://api.carapis.com/apix/api`, on, on | "Cars for sale" listings (CarAPIS, 100 requests/day free); no key = block off                                                                                                                       |
| `WIKI_IMAGE_SOURCE`                                                                                | `commons`                                         | Hero image strategy: `commons` (year-aware) or `wiki` (article lead image)                                                                                                                          |
| `GOOGLE_CLIENT_ID`                                                                                 | unset                                             | Google sign-in (public, not a secret)                                                                                                                                                               |
| `TELEGRAM_BOT_TOKEN` (secret), `TELEGRAM_BOT_USERNAME`                                             | unset                                             | Telegram sign-in; BotFather `/setdomain` (https only)                                                                                                                                               |
| **`AUTH_SECRET`**                                                                                  | dev-only fallback                                 | ≥ 32 chars, keys the HMAC of email codes (`openssl rand -base64 48`)                                                                                                                                |
| **`MAIL_TRANSPORT`**                                                                               | `log`                                             | `log` (dev), `smtp` or `resend`; production refuses `log`                                                                                                                                           |
| `RESEND_API_KEY`, `SMTP_URL`                                                                       | unset, `smtp://localhost:1025`                    | Resend key (required for `resend`) / Mailpit or any SMTP provider                                                                                                                                   |
| `MAIL_FROM`, `MAIL_REPLY_TO`, `MAIL_FROM_NEWS`                                                     | `carsua.app <no-reply@localhost>`                 | Sender, reply-to mailbox, and the digest sender (its domain must be verified in Resend)                                                                                                             |
| `CONTACT_TO`                                                                                       | falls back to `MAIL_REPLY_TO`                     | Private inbox for the `/contact` form                                                                                                                                                               |
| `DIGEST_ENABLED`                                                                                   | `false`                                           | Monthly "what's new" mail on the 1st to opted-in users. Never turn on against dev/stage data                                                                                                        |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                                       | unset                                             | Cloudflare Turnstile on "send code"; no secret = check skipped                                                                                                                                      |
| `ACCOUNT_DELETION_GRACE_DAYS`, `SESSION_TTL_DAYS`                                                  | `14`, `30`                                        | Restore window of a deleted account; sliding session lifetime. Not passed by CI (defaults apply in production)                                                                                      |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_API_HOST`                               | unset, unset, `https://eu.posthog.com`            | Admin Statistics tab (HogQL). Our project is on the **US** cloud: production sets `https://us.posthog.com` via the `POSTHOG_API_HOST` repository variable (CI passes it); the code default stays EU |
| `SENTRY_ORG_SLUG`                                                                                  | unset                                             | Only builds the Sentry dashboard link on the admin Statistics tab                                                                                                                                   |
| `ENABLE_TELEMETRY`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`                                      | off, unset, `0.1`                                 | Sentry is inert unless the flag **and** the DSN are set                                                                                                                                             |
| `TRUST_PROXY`                                                                                      | `false`                                           | `true` only behind Caddy/Cloudflare (per-IP limits read `X-Forwarded-For`)                                                                                                                          |
| `THROTTLE_DISABLED`, `ENABLE_SWAGGER`                                                              | `false`                                           | Load tests only (ignored in production); Swagger at `/api/docs` is on in dev, off in production unless enabled                                                                                      |
| `GIT_SHA`                                                                                          | unset                                             | Set per deploy by CI                                                                                                                                                                                |

Web build (`apps/web/.env`, read by Vite at dev/build start; **public**, bundled into the JS): `VITE_API_BASE` (leave empty: same origin),
`VITE_GOOGLE_MAPS_EMBED_KEY` (restrict to your referrer in Google Cloud), `VITE_DISQUS_SHORT_NAME`, `VITE_ENABLE_TELEMETRY`,
`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_SENTRY_DSN`, `VITE_GIT_SHA` (set by CI).

Scripts only (shell or `apps/api/.env`; none are needed for `pnpm ingest:all`): `GOOGLE_API_KEY` (YouTube Data API v3 for `ingest:youtube-videos`),
`SKETCHFAB_TOKEN` (optional, raises the Sketchfab rate limit), `CLOUDFLARE_TUNNEL_TOKEN` (`pnpm tunnel --hostname`), `SHRINK_MAX` / `SHRINK_Q`
(ALPR `eval.mjs --shrink`), `HC_PING_<JOB>` (healthchecks.io ping URLs for the VPS cron jobs, in `/opt/carsua/env/ingest.env`).

CI-only GitHub secrets (never read by the app): `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `POSTGRES_PASSWORD`,
`CF_ORIGIN_CERT`, `CF_ORIGIN_KEY`, `CF_API_TOKEN`, `CF_ZONE_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`,
`BACKUP_BUCKET`, `HC_PING_BACKUP` and the `HC_PING_*` list in docs/deploy.md.

### Self-hosted ALPR (optional)

`pnpm alpr:build && pnpm alpr:up` runs `services/alpr` (FastAPI + `fast-alpr` ONNX, CPU-only; plate reading, VIN OCR via RapidOCR,
face blur `/anonymize` with a committed YuNet model) on `:8088`. Set `ALPR_LOCAL_URL=http://localhost:8088` in `apps/api/.env`
(and the same `ALPR_API_KEY` in the container env if you use one). Without it the local recognize route answers 503.

### Production setup from scratch

Server, Cloudflare, R2 backups, GitHub Environment, first deploy, DB restore, cron jobs and shared-photo bucket: [docs/deploy.md](docs/deploy.md)
(follow "Where to get what" then "First-time setup (in this order)"). Roles and sign-in set-up: [docs/logins.md](docs/logins.md).

## Offline / PWA

The app is an installable PWA (`vite-plugin-pwa`). The service worker is only
generated by a production build — test it with `pnpm build` and then serve the
built web app through the API, not with `pnpm dev` — `pnpm preview:prod` builds and does exactly that (port 3000, stop `pnpm dev` first). Saved results live in
IndexedDB (200 plates / 200 VINs, 30 days; favorites never expire) and are
marked out of date via `GET /api/stats/version` after a re-ingest.

## Testing through a Cloudflare tunnel

`pnpm tunnel` does it all: `db:up` + `db:migrate`, `pnpm build`, a `cloudflared` quick tunnel, the API serving the built SPA with
`PUBLIC_SITE_URL` set to the tunnel URL (and `TRUST_PROXY=true`), smoke checks through the public URL, then prints the manual steps
for _that_ URL. Needs [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
(`winget install --id Cloudflare.cloudflared`) and a free port 3000 (stop `pnpm dev`). Flags: `--skip-build`, `--no-db`, `--port`,
`--hostname dev.example.com` (named tunnel with a stable URL; needs `CLOUDFLARE_TUNNEL_TOKEN`).

Manual afterwards (a quick-tunnel URL changes every run): add the URL to the Google OAuth client's **Authorized JavaScript origins**
(Cloud Console → Credentials), BotFather `/setdomain` → the tunnel host (one domain per bot — restore the real one after), and the
host to the Turnstile widget's hostnames.

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
`pnpm db:up · db:down · db:reset · db:migrate · db:seed · db:refresh-stats · db:refresh-weight-stats · db:refresh-spec-stats · db:refresh-origin-stats · ingest · ingest:full` ·
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
`pnpm --filter scripts build:kind-images` (re-encode `apps/web/assets-src/kind/*.jpg` → `public/kind/*.{avif,webp}`) ·
`pnpm --filter scripts build:logo-images` (re-encode gitignored originals `apps/web/assets-src/kind/logos/*.png` → `public/logos/*.webp`, max 700px; WebP only — AVIF fringes under `mix-blend-multiply`)

## License

MIT

### Email sign-in locally

All sign-in methods (email, Google, Telegram), linking, sudo mode and admin promotion: [docs/logins.md](docs/logins.md).

Email sign-in works out of the box: with the default `MAIL_TRANSPORT=log` the code and magic link are printed in the API log.
The optional monthly "what's new" mail (opt-in on `/profile`) is off unless `DIGEST_ENABLED=true`; preview it at `/api/dev/emails/digest` and send yourself a test from the admin Users tab. `MAIL_FROM_NEWS` sets a separate sender.
To see real HTML mails run `docker compose -f infra/docker-compose.yml up -d mailpit`, set `MAIL_TRANSPORT=smtp` and open
<http://localhost:8025>. Template previews (dev only): <http://localhost:3000/api/dev/emails>. For the magic link to open the
Vite app set `PUBLIC_SITE_URL=http://localhost:5173`. Production refuses to boot without `AUTH_SECRET` (≥ 32 chars), a real
`PUBLIC_SITE_URL` and `MAIL_TRANSPORT=smtp|resend`; send from a subdomain (`mail.carsua.app`) with SPF + DKIM from the provider and a DMARC record.
The `/contact` form mails `CONTACT_TO` (a private inbox, never shown on the site) through the same transport; it falls back to `MAIL_REPLY_TO`, and with neither set the form is disabled. Anonymous senders confirm their address with an emailed code, so locally read it from the API log or Mailpit. Locally set it with `MAIL_TRANSPORT=smtp` (Mailpit) or `log` (prints to the API log).
