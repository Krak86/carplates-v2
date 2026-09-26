# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate number or VIN. A pnpm
monorepo replacing the 2019 GitHub-Pages SPA (which read a now-gone Azure Cosmos
DB). Data comes from the state open-data portal (`data.gov.ua`), loaded into
Postgres; VIN decoding proxies the free NHTSA API.

**Phase 1 (current): plate + VIN search, local dev stack only.** No CI, no VPS.
Phases 2-5 (RIA similar-cars, Platesmania, image recognition, VPS/deploy,
accounts) are in `PLAN.md`.

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
```

First-time local setup, test data (seconds): `pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`.
First-time local setup, real data (hours, ~20 GB): `pnpm install && pnpm db:up && pnpm db:migrate && pnpm ingest:full && pnpm ingest:euroncap:csv && pnpm ingest:jncap:csv && pnpm ingest:cncap:csv && pnpm ingest:kncap:csv && pnpm dev`.

## Layout

| Path               | What                                                                                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/` | plate normalization (`normalizePlate` etc.), regions, Zod schemas + inferred types. **Single source of truth — never re-implement plate logic elsewhere.**                                                                                          |
| `packages/db/`     | Drizzle schema (`registry` PG schema), pooled client, SQL migrator, `drizzle.config.ts` (generate/studio only)                                                                                                                                      |
| `apps/api/`        | NestJS + Fastify. Feature modules under `src/<feature>/`. Serves the built web app + injects per-plate `<meta>` tags on deep links.                                                                                                                 |
| `apps/web/`        | Vite + React 19 + React Router 8 (declarative). `@/` → `src/`.                                                                                                                                                                                      |
| `scripts/`         | `seed.ts`, `ingest.ts`, `ingest-full.ts` (+ `transform.ts` pure helpers, `backfill.ts`), `euroncap.ts`/`jncap.ts`/`cncap.ts`/`kncap.ts` (scrape/fetch + CSV export/import; `cncap-names.ts`/`kncap-names.ts` are the curated Chinese/Korean→registry-spelling translation tables `cncap.ts`/`kncap.ts` depend on), `refresh-stats.ts`. `seed-data/` holds the committed, gzipped Euro NCAP/JNCAP/C-NCAP/KNCAP CSVs. Run with `tsx`. |
| `infra/`           | `docker-compose.yml` (local Postgres only)                                                                                                                                                                                                          |

## Stack

pnpm 12 · Node 24 LTS · TypeScript 5.9 (7.x blocked — typescript-eslint peer) ·
Vitest 4 · ESLint 10 (flat config)

- **web**: Vite 8 · React 19 · React Router 8 · TanStack Query 5 · Zustand 5 ·
  Tailwind v4 (CSS-first, `@theme` in `src/styles/global.css`) · i18next (ua/ru/en) ·
  PostHog + Sentry (dynamic-imported, inert unless `VITE_ENABLE_TELEMETRY=true`)
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
  is nullable since the 2026 plate-removal (ГСЦ МВС order №67/ОД, see `PLAN.md`)
  — such rows are keyed on `vin` instead, and the API follows the VIN, not the
  plate, to reach them (`plate.service.ts`, `vin.service.ts`).
- **Ingest column mapping is header-name-driven, not positional** — see
  `scripts/src/transform.ts`. The source layout has changed column set, column
  order, and date format almost every year; a positional parser silently maps
  the wrong field the moment two years disagree on order.
- **DB writes**: Drizzle in `apps/api`; `scripts/ingest.ts` batches plain
  `INSERT … ON CONFLICT DO NOTHING`, and `scripts/backfill.ts` runs raw SQL for
  the set-based plate reconstruction (see `PLAN.md`). Schema changes = a new
  `packages/db/migrations/NNNN_*.sql` file (the migrator applies them in order,
  once each).
- **Never erase a real-data-seeded DB without asking first.** `pnpm db:seed`
  (`TRUNCATE registry.registrations`) is meant for the ~1000-row synthetic
  local dataset — running it against a DB already holding a real ingest
  (`pnpm ingest:full`, hours, ~20 GB) destroys that data and forces a
  multi-hour re-ingest to recover (this happened once, 2026-09-23 — see
  PLAN.md's Phase 1.5 "Registry statistics" entry). Before running `db:seed`,
  or any `TRUNCATE`/`DROP`/bulk `DELETE` against `registry.registrations` or
  `registry.ingested_resources`, check what's currently loaded first
  (`SELECT count(*) FROM registry.registrations`, or check
  `registry.ingested_resources` for real CKAN resource ids) — a few thousand
  rows is the synthetic seed set, millions is a real ingest. If it looks like
  real data, **ask the user before erasing it**, and only proceed on explicit
  approval. The data is technically always re-ingestable (`pnpm ingest:full`
  reuses cached ZIPs in `scripts/.data/` and is deterministic — see PLAN.md),
  but that's an hours-long recovery, not a reason to treat erasing it
  casually.
- **NestJS**: feature modules, Zod-validated inputs, no logic in controllers.
  Controllers return values and never take `@Res()` — except the SPA catch-all.
- **Telemetry** stays off locally. `.env.example` in each app documents the vars;
  real `.env*` files are gitignored and `deny`-listed for Claude.
- Tests: Vitest, `import { describe, it, expect } from 'vitest'`, colocated
  `*.test.ts(x)` next to source.

## Rules

@CLAUDE_RULES.md
