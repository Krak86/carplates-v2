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
pnpm ingest -- --year 2026 --limit 100000   # real data slice from CKAN
pnpm ingest:full    # full real dataset: every CKAN year + 2026 plate recovery + backfill
```

First-time local setup, test data (seconds): `pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`.
First-time local setup, real data (hours, ~20 GB): `pnpm install && pnpm db:up && pnpm db:migrate && pnpm ingest:full && pnpm dev`.

## Layout

| Path               | What                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/` | plate normalization (`normalizePlate` etc.), regions, Zod schemas + inferred types. **Single source of truth — never re-implement plate logic elsewhere.** |
| `packages/db/`     | Drizzle schema (`registry` PG schema), pooled client, SQL migrator, `drizzle.config.ts` (generate/studio only)                                             |
| `apps/api/`        | NestJS + Fastify. Feature modules under `src/<feature>/`. Serves the built web app + injects per-plate `<meta>` tags on deep links.                        |
| `apps/web/`        | Vite + React 19 + React Router 8 (declarative). `@/` → `src/`.                                                                                             |
| `scripts/`         | `seed.ts`, `ingest.ts`, `ingest-full.ts` (+ `transform.ts` pure helpers, `backfill.ts`). Run with `tsx`.                                                   |
| `infra/`           | `docker-compose.yml` (local Postgres only)                                                                                                                 |

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
- **NestJS**: feature modules, Zod-validated inputs, no logic in controllers.
  Controllers return values and never take `@Res()` — except the SPA catch-all.
- **Telemetry** stays off locally. `.env.example` in each app documents the vars;
  real `.env*` files are gitignored and `deny`-listed for Claude.
- Tests: Vitest, `import { describe, it, expect } from 'vitest'`, colocated
  `*.test.ts(x)` next to source.

## Rules

@CLAUDE_RULES.md
