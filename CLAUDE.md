# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate number or VIN. A pnpm
monorepo replacing the 2019 GitHub-Pages SPA (which read a now-gone Azure Cosmos
DB). Data comes from the state open-data portal (`data.gov.ua`), loaded into
Postgres; VIN decoding proxies the free NHTSA API.

**Phase 1 (current): plate + VIN search, local dev stack only.** No CI, no VPS.
Phases 2-5 (RIA similar-cars, Platesmania, image recognition, VPS/deploy,
accounts) are in `PLAN.md` (active/planned work only; finished Phase 1/1.5 write-ups live in `docs/plan-done.md` — grep headings, never read it whole).

The **v1 app is the sibling folder `../carplates/`** (do not modify it) — the
reference for Phase 2/3 ports: RIA brand→id matrices
(`src/js/data/DataCarsRia.ts` etc.), Platesmania and image-recognition proxies
(`azure/*.js`), and the original homoglyph/plate logic (`src/js/utils/`).

## Commands

```bash
pnpm dev            # web (:5173) + api (:3000) in parallel
pnpm build          # packages first, then apps (topological)
pnpm lint           # eslint, cached
pnpm lint:types     # opt-in type-checked lint (no-floating-promises); slow
pnpm type-check     # tsc --noEmit per package
pnpm test           # vitest across all packages
pnpm format         # prettier --write

pnpm db:up          # start postgres:18.6 (docker compose)
pnpm db:down        # stop it   (db:reset also drops the volume)
pnpm db:migrate     # apply packages/db/migrations/*.sql
pnpm db:seed        # ~1000 deterministic synthetic rows
pnpm db:refresh-stats   # rebuild current_registration + stats_by_* from existing rows, no re-ingest
pnpm ingest -- --year 2026 --limit 100000   # real data slice from CKAN
pnpm ingest:full    # full real dataset: every CKAN year + 2026 plate recovery + backfill
pnpm ingest:euroncap   # scrape/refresh Euro NCAP ratings (no public API — see PLAN.md)
pnpm ingest:euroncap:csv   # load real Euro NCAP ratings from the committed CSV — seconds, no scraping
pnpm export:euroncap:csv   # re-dump the DB table to that CSV — run after every real re-scrape
pnpm ingest:jncap      # scrape/refresh JNCAP (Japan, NASVA) ratings (no public API — see PLAN.md)
pnpm ingest:jncap:csv  # load real JNCAP ratings from the committed CSV — seconds, no scraping
pnpm export:jncap:csv  # re-dump the DB table to that CSV — run after every real re-scrape
pnpm ingest:cncap      # ingest C-NCAP (China, CATARC) ratings via its own JSON API — see PLAN.md
pnpm ingest:cncap:csv  # load real C-NCAP ratings from the committed CSV — seconds, no fetching
pnpm export:cncap:csv  # re-dump the DB table to that CSV — run after every real re-ingest
pnpm ingest:kncap      # ingest KNCAP (Korea, MOLIT/KoROAD) ratings via its own JSON API — see PLAN.md
pnpm ingest:kncap:csv  # load real KNCAP ratings from the committed CSV — seconds, no fetching
pnpm export:kncap:csv  # re-dump the DB table to that CSV — run after every real re-ingest
pnpm ingest:iihs       # scrape/refresh IIHS (US, insurance-industry-funded) ratings — see PLAN.md
pnpm ingest:iihs:csv   # load real IIHS ratings from the committed CSV — seconds, no scraping
pnpm export:iihs:csv   # re-dump the DB table to that CSV — run after every real re-scrape
pnpm ingest:fuel      # fuel/CO2 reference data: EPA (fueleconomy.gov zip) + EEA (DiscoData SQL API, 2010+, grouped
                       # server-side) -> registry.fuel_economy; --only epa|eea, --dry-run, --refresh. See PLAN.md
pnpm ingest:fuel:csv  # load the committed fuel CSV (4 MB gz) — seconds, no downloads
pnpm export:fuel:csv  # re-dump the table to that CSV — run after every real re-ingest
pnpm ingest:infocar   # crawl infocar.ua's brand/model/version catalog (both trees, ~25 min cold, 1 req/s, robots-aware,
                       # HTML cached in scripts/.data/infocar/) -> registry.infocar_versions; --brand kia, --limit N,
                       # --dry-run, --refresh. Links + facts only. See PLAN.md "Car reviews"
pnpm ingest:infocar:csv  # load the committed infocar CSV (85 KB gz) — seconds, no crawling
pnpm export:infocar:csv  # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:infocar:videos  # crawl infocar.ua's /video/ listings per brand (1 req/s, ~10 s/page, a few hours cold, robots-aware,
                       # HTML cached in scripts/.data/infocar/) -> registry.car_videos (YouTube links + facts only);
                       # --brand toyota, --limit N, --dry-run, --refresh. See PLAN.md "Car reviews"
pnpm ingest:infocar:videos:csv  # load the committed videos CSV (185 KB gz) — seconds, no crawling
pnpm export:infocar:videos:csv  # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:edrive    # e-drive.com.ua owner posts per make/model/generation (its own JSON API, 1 req/s, ≥1 call per
                       # generation: hours cold) -> registry.owner_posts; --brand kia --model ceed, --limit N, --max-pages N,
                       # --dry-run. Links + facts only
pnpm ingest:edrive:csv   # load the committed e-drive posts CSV — seconds, no crawling
pnpm export:edrive:csv   # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:sketchfab  # Sketchfab Data API search per infocar-catalog make/model (anonymous, 1 req/s, ~25 min cold, JSON
                       # cached in scripts/.data/sketchfab/) -> registry.car_models_3d (embeddable 3D car models, facts + links
                       # only; shown as the "🧊 3D view" chip/modal on result cards); --brand kia --model ceed, --limit N,
                       # --dry-run, --refresh. Needs ingest:infocar(:csv) first
pnpm ingest:sketchfab:csv   # load the committed Sketchfab CSV — seconds, no searching
pnpm export:sketchfab:csv   # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:carshow360  # carshow360.net 360° galleries from its gallery sitemap (1-2 requests, no page crawl) -> registry.car_models_360
                       # (shown as the "🔄 360° view" chip/modal on result cards, every generation/trim as a chip); --add-url <gallery url>,
                       # --enrich (slow title fetch, 5 s apart, backs off), --retry-failed (ONLY ids in scripts/.data/carshow360/failed.json,
                       # where every 5xx/52x/timeout is logged), --dry-run
pnpm ingest:carshow360:csv   # load the committed carshow360 CSV (24 KB gz) — seconds, no fetching
pnpm export:carshow360:csv   # re-dump the table to that CSV — run after every real re-ingest
pnpm ingest:topgear   # TopGear UK editorial reviews (topgear.com/car-reviews/<make>/<model>, sitemap -> ~1,040 pages, 1 req/s, ~20-25 min cold,
                       # robots-aware, HTML cached in scripts/.data/topgear/) -> registry.topgear_reviews; --brand kia (TopGear make
                       # slug), --limit N, --dry-run, --refresh. Score + link + meta blurb only. See PLAN.md "Step 2c"
pnpm ingest:topgear:csv   # load the committed TopGear CSV (71 KB gz) — seconds, no crawling
pnpm export:topgear:csv   # re-dump the table to that CSV — run after every real re-crawl
pnpm db:refresh-fuel-stats   # rebuild registry.stats_fuel (the /fuel page rollup) from the registry + fuel_economy;
                             # run after any registry ingest or ingest:fuel (ingest:all does it last)
pnpm ingest:ratings:csv   # db:migrate, then all five *:csv rating loads + the fuel, infocar, infocar-videos, e-drive, sketchfab, carshow360 and topgear CSVs concurrently — each writes
                          # its own table only, doesn't touch registrations
pnpm ingest:all        # db:migrate, then ingest:full + ingest:ratings:csv concurrently — each writes a
                       # disjoint table (registrations/current_registration/stats_by_* vs. one ratings/fuel_economy
                       # table apiece) — then db:refresh-fuel-stats, which needs both finished

pnpm alpr:build     # build the self-hosted ALPR (own-model plate recognition) Docker image
pnpm alpr:up        # run it on :8088 (sets ALPR_LOCAL_URL=http://localhost:8088 in apps/api/.env to use it)
pnpm alpr:down      # stop it
node services/alpr/eval.mjs   # run services/alpr/eval/images/* through the running container → eval/results.json
                              # (gitignored photos; rebuild with alpr:build after editing services/alpr/app.py)
```

First-time local setup, test data (seconds): `pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`.
First-time local setup, real data (hours, ~20 GB): `pnpm install && pnpm db:up && pnpm db:migrate && pnpm ingest:full && pnpm ingest:euroncap:csv && pnpm ingest:jncap:csv && pnpm ingest:cncap:csv && pnpm ingest:kncap:csv && pnpm ingest:iihs:csv && pnpm dev`.
Equivalently, `pnpm install && pnpm db:up && pnpm ingest:all && pnpm dev` runs the six ingests concurrently — same
end state, since each one writes a disjoint table; only shrinks wall-clock once `scripts/.data/*.zip` is already
cached (a fresh clone is still bottlenecked on the ~20 GB CKAN download either way).

## Layout

| Path               | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/` | plate normalization (`normalizePlate` etc.), regions, Zod schemas + inferred types. **Single source of truth — never re-implement plate logic elsewhere.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/db/`     | Drizzle schema (`registry` PG schema), pooled client, SQL migrator, `drizzle.config.ts` (generate/studio only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `apps/api/`        | NestJS + Fastify. Feature modules under `src/<feature>/`. Serves the built web app + injects per-plate `<meta>` tags on deep links.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `apps/web/`        | Vite + React 19 + React Router 8 (declarative). `@/` → `src/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `scripts/`         | `seed.ts`, `ingest.ts`, `ingest-full.ts` (+ `transform.ts` pure helpers, `backfill.ts`), `euroncap.ts`/`jncap.ts`/`cncap.ts`/`kncap.ts`/`iihs.ts` (scrape/fetch + CSV export/import; `cncap-names.ts`/`kncap-names.ts` are the curated Chinese/Korean→registry-spelling translation tables `cncap.ts`/`kncap.ts` depend on — `iihs.ts` needs no such table, its source data is already English), `carshow360.ts` (+ `carshow360-parse.ts`: CarShow360 360° gallery catalog from its sitemap, links only; slow `--enrich` pass logs every 5xx/52x to `.data/carshow360/failed.json` for `--retry-failed`), `infocar.ts` (+ `infocar-parse.ts`/`infocar-robots.ts`: robots-aware crawl of infocar.ua's brand/model/version catalog, links only), `topgear.ts` (+ `topgear-parse.ts`/`topgear-fetch.ts`: TopGear UK review crawl, score + link + blurb only; reuses `infocar-robots.ts`), `refresh-stats.ts`. `seed-data/` holds the committed, gzipped Euro NCAP/JNCAP/C-NCAP/KNCAP/IIHS CSVs. Run with `tsx`. |
| `infra/`           | `docker-compose.yml` (local Postgres only), `docker-compose.alpr.yml` (own-model ALPR, opt-in)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `services/alpr/`   | Self-hosted ALPR (license plate recognition) container — FastAPI + `fast-alpr` (ONNX, CPU-only, MIT-licensed). Own model, no token, no per-lookup cost — see `PLAN.md`'s "Own ALPR model" section.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Stack

pnpm 12 · Node 24 LTS · TypeScript 5.9 (7.x blocked — typescript-eslint peer) ·
Vitest 4 · ESLint 10 (flat config)

- **web**: Vite 8 · React 19 · React Router 8 · TanStack Query 5 · Zustand 5 ·
  Tailwind v4 (CSS-first, `@theme` in `src/styles/global.css`) · i18next (ua/ru/en) ·
  PostHog + Sentry (dynamic-imported, inert unless `VITE_ENABLE_TELEMETRY=true`) ·
  `vite-plugin-pwa` (installable + offline; TanStack Query cache persisted to IndexedDB)
- **api**: NestJS 11 (not 12 — nestjs-zod peer) on `@nestjs/platform-fastify` ·
  Drizzle ORM 0.45.2 (pinned) · `nestjs-zod` (one Zod schema → validation pipe +
  OpenAPI at `/api/docs`) · `@sentry/nestjs` (inert unless `ENABLE_TELEMETRY=true`)
- **db**: `postgres:18.6`. Full-history `registry.registrations` +
  materialized `registry.current_registration` (latest per plate, what the API reads).

## Conventions

- **ESM everywhere.** Relative imports in `api`/`db`/`scripts` carry `.js`
  extensions (nodenext). `apps/web` uses the `@/` alias — no `../` there.
- **Plate normalization**: `normalizePlate` from `@carplates/shared` runs on
  every plate at every layer (web input, API param, ingest row). It produces the
  DB key and the query key — they must match. **Exception:** `registrations.plate`
  is nullable since the 2026 plate-removal (ГСЦ МВС order №67/ОД, see `docs/plan-done.md`)
  — such rows are keyed on `vin` instead, and the API follows the VIN, not the
  plate, to reach them (`plate.service.ts`, `vin.service.ts`).
- **Plate → region**: `regionName` (`packages/shared/src/regions.ts`) = letter prefix (`REGIONS`) or, for digits-first
  legacy plates, `LEGACY_REGIONS`. `DІ`/`ЕD` plates (`plateSeries`) are online-service series with no region by design.
  `registry.plate_regions` (stats rollups) mirrors both tables — change them together, in a new migration.
- **Ingest column mapping is header-name-driven, not positional** — see
  `scripts/src/transform.ts`. The source layout has changed column set, column
  order, and date format almost every year; a positional parser silently maps
  the wrong field the moment two years disagree on order.
- **DB writes**: Drizzle in `apps/api`; `scripts/ingest.ts` batches plain
  `INSERT … ON CONFLICT DO NOTHING`, and `scripts/backfill.ts` runs raw SQL for
  the set-based plate reconstruction (see `docs/plan-done.md`). Schema changes = a new
  `packages/db/migrations/NNNN_*.sql` file (the migrator applies them in order,
  once each).
- **Never erase a real-data-seeded DB without asking first.** `pnpm db:seed`
  (`TRUNCATE registry.registrations`) is meant for the ~1000-row synthetic
  local dataset — running it against a DB already holding a real ingest
  (`pnpm ingest:full`, hours, ~20 GB) destroys that data and forces a
  multi-hour re-ingest to recover (this happened once, 2026-09-23 — see
  docs/plan-done.md's Phase 1.5 "Registry statistics" entry). Before running `db:seed`,
  or any `TRUNCATE`/`DROP`/bulk `DELETE` against `registry.registrations` or
  `registry.ingested_resources`, check what's currently loaded first
  (`SELECT count(*) FROM registry.registrations`, or check
  `registry.ingested_resources` for real CKAN resource ids) — a few thousand
  rows is the synthetic seed set, millions is a real ingest. If it looks like
  real data, **ask the user before erasing it**, and only proceed on explicit
  approval. The data is technically always re-ingestable (`pnpm ingest:full`
  reuses cached ZIPs in `scripts/.data/` and is deterministic — see docs/plan-done.md),
  but that's an hours-long recovery, not a reason to treat erasing it
  casually.
- **Offline / PWA** (`apps/web`, see docs/plan-done.md Phase 1.5): the service worker only
  exists in production builds. Changing a Zod schema in `packages/shared` discards
  every user's saved offline data — intended, but keep it in mind. A new
  `/api/*` query that should work offline must be added to the persisted-cache
  rules in `lib/offline-cache.ts` (size-capped); heavy online-only endpoints
  (`/api/stats`) stay out. Runtime caches are prefixed `carplates-rt-`. SPA
  cache headers: hashed assets immutable, `index.html`/`sw.js`/manifest `no-cache`
  (`spa.controller.ts`). `@vite-pwa/assets-generator` must stay on v2 (sharp).
- **NestJS**: feature modules, Zod-validated inputs, no logic in controllers.
  Controllers return values and never take `@Res()` — except the SPA catch-all.
- **Link previews** (`apps/api/src/spa/`): meta tags + `/og/*.png` are produced by the **API**, only on first
  load/deep link — Vite (`:5173`, `vite preview`) never shows them. To test: `pnpm build`, set
  `WEB_DIST_DIR=../web/dist` in `apps/api/.env`, restart the API, open `localhost:3000/<plate>` (Incognito, SW
  caches `index.html`). Plate/VIN pages are `noindex`; `?lang=` selects the preview language. Details in
  docs/plan-done.md "Link previews".
- **Telemetry** stays off locally. `.env.example` in each app documents the vars;
  real `.env*` files are gitignored and `deny`-listed for Claude.
- Tests: Vitest, `import { describe, it, expect } from 'vitest'`, colocated
  `*.test.ts(x)` next to source.

## Workflow

- **After each big update** (a feature, a bug fix, a batch of related
  changes), provide a suggested commit message — don't run `git commit` or
  `git push` yourself unless explicitly asked to.
- **The message covers everything uncommitted, not just the latest update.**
  Check `git status`/`git diff --stat` and, when several updates have piled up
  since the last commit, give one message summarizing all of them (a subject line
  plus a bullet per change) — or a separate message per logical change if they
  should be split into several commits. Never describe only the most recent edit
  while earlier uncommitted work is left out.

## Rules

@CLAUDE_RULES.md
