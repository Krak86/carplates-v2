# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate number or VIN. A pnpm monorepo replacing the 2019 GitHub-Pages SPA. Data comes
from the state open-data portal (`data.gov.ua`), loaded into Postgres; VIN decoding proxies the free NHTSA API.

**Phase 1 (current): plate + VIN search, local dev stack only.** No CI, no VPS. Accounts (Phase 5 stage A) are built. Docs map:

- `PLAN.md` — active/planned work (Phases 2-5). `docs/plan-done.md` — finished write-ups; **grep headings, never read whole**.
- `DATASETS_PLAN.md` — external-dataset enrichment. `SCHEDULE.md` — post-deploy plan for recurring ingest jobs.
- `docs/vps-http2-http3.md` — reverse proxy (Caddy/nginx) for h2/h3, compression, cache headers; `pnpm preview:prod` production-like run.
- `docs/commands-reference.md` — every `ingest:*` / `export:*` / ALPR command with flags (grep the one you need).
- `docs/features-reference.md` — detailed conventions for VehiclesDB, RDW specs, the racer game and Accounts. **Read the matching section before
  touching those areas.**

The **v1 app is the sibling folder `../carplates/`** (do not modify it) — the reference for Phase 2/3 ports (RIA matrices, Platesmania and
image-recognition proxies, original plate logic).

## Commands

```bash
pnpm dev            # web (:5173) + api (:3000) in parallel
pnpm preview:prod   # build, then Nest serves the built SPA (production-like; port 3000, PORT=3100 if dev is running)
pnpm build          # packages first, then apps (topological)
pnpm lint           # eslint, cached
pnpm lint:types     # opt-in type-checked lint (no-floating-promises); slow
pnpm type-check     # tsc --noEmit per package
pnpm test           # vitest across all packages
pnpm format         # prettier --write

pnpm db:up / db:down / db:reset   # postgres:18.6 (docker compose); reset also drops the volume
pnpm db:migrate     # apply packages/db/migrations/*.sql
pnpm db:seed        # ~1000 synthetic rows (TRUNCATEs registrations — see "Never erase" below)
pnpm db:refresh-stats     # rebuild current_registration + stats_by_* from existing rows
pnpm db:refresh-derived   # rebuild fuel/safety/vdb rollups; run after ingest:ratings:csv / ingest:vehiclesdb
pnpm ingest -- --year 2026 --limit 100000   # real data slice from CKAN
pnpm ingest:full    # full real dataset (hours, ~20 GB)
pnpm ingest:all     # ingest:full + all CSV seeds concurrently, then derived rollups
pnpm ingest:ratings:csv   # all committed CSV seeds (ratings, fuel, infocar, …) — seconds
```

Every other source has `ingest:<x>` (scrape/fetch), `ingest:<x>:csv` (load committed seed, seconds) and `export:<x>:csv` (re-dump after a
real re-ingest). Sources: euroncap, jncap, cncap, kncap, iihs, fuel, infocar, infocar:videos, edrive, sketchfab, carshow360, topgear,
press, wiki-images, youtube-videos, vehiclesdb, rdw. No-CSV (re-run on demand): news, social, winner360. Flags/details:
`docs/commands-reference.md`. ALPR: `pnpm alpr:build|up|down`.

First-time setup, test data (seconds): `pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`.
Real data: `pnpm install && pnpm db:up && pnpm ingest:all && pnpm dev` (see `docs/commands-reference.md`).

## Layout

- `packages/shared/` — plate normalization (`normalizePlate` etc.), regions, Zod schemas + types. **Single source of truth — never
  re-implement plate logic elsewhere.**
- `packages/db/` — Drizzle schema (`registry` PG schema), pooled client, SQL migrator, `drizzle.config.ts` (generate/studio only).
- `apps/api/` — NestJS + Fastify. Feature modules under `src/<feature>/`. Serves the built web app + injects per-plate `<meta>` tags.
- `apps/web/` — Vite + React 19 + React Router 8 (declarative). `@/` → `src/`.
- `scripts/` — `seed.ts`, `ingest*.ts` (+ `transform.ts` pure helpers, `backfill.ts`), one script per external source with its parser
  (`<source>.ts` / `<source>-parse.ts`), `refresh-stats.ts`, `derived-refresh.ts`. `seed-data/` = committed gzipped CSVs. Run with `tsx`.
- `infra/` — `docker-compose.yml` (local Postgres), `docker-compose.alpr.yml` (own-model ALPR, opt-in).
- `services/alpr/` — self-hosted plate/VIN recognition container (FastAPI + `fast-alpr`).

## Stack

pnpm 12 · Node 24 LTS · TypeScript 5.9 (7.x blocked — typescript-eslint peer) · Vitest 4 · ESLint 10 (flat config)

- **web**: Vite 8 · React 19 · React Router 8 · TanStack Query 5 · Zustand 5 · Tailwind v4 (CSS-first, `@theme` in
  `src/styles/global.css`) · i18next (ua/ru/en) · PostHog + Sentry (dynamic-imported, inert unless `VITE_ENABLE_TELEMETRY=true`) ·
  `vite-plugin-pwa` (installable + offline; TanStack Query cache persisted to IndexedDB)
- **api**: NestJS 11 (not 12 — nestjs-zod peer) on `@nestjs/platform-fastify` · Drizzle ORM 0.45.2 (pinned) · `nestjs-zod` (one Zod
  schema → validation pipe + OpenAPI at `/api/docs`) · `@sentry/nestjs` (inert unless `ENABLE_TELEMETRY=true`)
- **db**: `postgres:18.6`. Full-history `registry.registrations` + materialized `registry.current_registration` (latest per plate,
  what the API reads).

## Conventions

- **ESM everywhere.** Relative imports in `api`/`db`/`scripts` carry `.js` extensions (nodenext). `apps/web` uses the `@/` alias.
- **`@carplates/shared` is consumed from its built `dist/`**: after editing `packages/shared/src`, run
  `pnpm --filter @carplates/shared build`, or the running API/web keep the old behaviour (`tsx watch` does not rebuild it, and unit
  tests run against `src`, so they won't reveal a stale `dist`).
- **Plate normalization**: `normalizePlate` runs on every plate at every layer (web input, API param, ingest row). It produces the DB
  key and the query key — they must match. **Exception:** `registrations.plate` is nullable since the 2026 plate-removal (ГСЦ МВС
  order №67/ОД, see `docs/plan-done.md`) — such rows are keyed on `vin`, and the API follows the VIN to reach them
  (`plate.service.ts`, `vin.service.ts`).
- **Plate → region**: `regions.ts` (`REGIONS` / `LEGACY_REGIONS`) is mirrored by `registry.plate_regions` — change both together in a
  new migration, and edit `regions.statute.test.ts` with them. Details: `docs/features-reference.md` "Plate regions".
- **Ingest column mapping is header-name-driven, not positional** (`scripts/src/transform.ts`). The source layout changes column set,
  order and date format almost every year.
- **DB writes**: Drizzle in `apps/api`; `scripts/ingest.ts` batches plain `INSERT … ON CONFLICT DO NOTHING`, `scripts/backfill.ts` runs
  raw SQL for set-based plate reconstruction. Schema changes = a new `packages/db/migrations/NNNN_*.sql` (applied in order, once each).
- **Never erase a real-data-seeded DB without asking first.** `pnpm db:seed` (`TRUNCATE registry.registrations`) is for the ~1000-row
  synthetic dataset; on a real ingest it destroys hours of work (happened once, 2026-09-23). Before `db:seed` or any
  `TRUNCATE`/`DROP`/bulk `DELETE` on `registry.registrations` or `registry.ingested_resources`, check
  `SELECT count(*) FROM registry.registrations` — a few thousand = synthetic, millions = real. If real, **ask the user** and proceed
  only on explicit approval.
- **Offline / PWA** (`apps/web`): the service worker exists only in production builds. Editing `schemas.ts` discards users' saved offline
  data; contracts in their own file (`vdb.ts`, `rdw.ts`, `account.ts`) don't, so new fields there are `.nullable().optional()` and read
  defensively. A new `/api/*` query that should work offline goes into `lib/offline-cache.ts`. Details: `docs/features-reference.md`.
- **NestJS**: feature modules, Zod-validated inputs, no logic in controllers. Controllers return values and never take `@Res()` —
  except the SPA catch-all.
- **Link previews** (`apps/api/src/spa/`) are produced by the API, never by Vite (`:5173`); how to test: `docs/features-reference.md`.
- **Feature areas with their own detail docs** (read `docs/features-reference.md` first): VehiclesDB cross-market data, RDW specs, the estimated-value chip (C4: depreciation curve, UA customs, NBU `/api/fx`), the VIN
  page, the test-drive racer game, and Accounts (separate `app` schema, **not** re-ingestable; `account.ts`, not `schemas.ts`; admins by SQL
  only; account UI online-only).
- **i18n is loaded per language** (`apps/web/src/i18n`): `ua.json`/`ru.json`/`en.json` are separate lazy chunks (non-ua also loads ua, the fallback). `main.tsx` awaits `i18nReady`; switching goes through the async `setLang` (`langLoading` drives the sidebar spinner). Tests that render translated text `await i18nReady` — never `import '@/i18n'` for its side effect.
- **Result-card sections below the fold are `LazySection`s** (mounted near the viewport or by a `?section=` share link). A new shareable section must list its id in `sections`, or its share link will not open it. Pure helpers shared by lazy chunks are grouped per area in `vite.config.ts` (`HELPER_GROUPS`).
- **Telemetry** stays off locally. `.env.example` in each app documents the vars; real `.env*` files are gitignored and `deny`-listed.
- Tests: Vitest, `import { describe, it, expect } from 'vitest'`, colocated `*.test.ts(x)` next to source.

## Workflow

- **After each big update** (feature, bug fix, batch of related changes), provide a suggested commit message — don't run `git commit`
  or `git push` unless explicitly asked.
- **Run `pnpm format` before suggesting a commit message** so Prettier drift never piles up in unrelated files (test fixtures under
  `scripts/src/fixtures` are in `.prettierignore` — never reformat them).
- **The message covers everything uncommitted, not just the latest update.** Check `git status`/`git diff --stat`; give one message
  (subject line plus a bullet per change) or a separate message per logical change if they should be split.

## Rules

@CLAUDE_RULES.md
