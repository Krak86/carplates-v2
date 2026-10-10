# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate number or VIN. A pnpm monorepo replacing the 2019 GitHub-Pages SPA. Data comes
from the state open-data portal (`data.gov.ua`), loaded into Postgres; VIN decoding proxies the free NHTSA API.

**Phase 1 (current): local dev stack only.** No CI, no VPS. Accounts (Phase 5 stage A) are built. Docs map (read on demand, **grep
headings, never read whole**):

- `PLAN.md` — active/planned work. `docs/plan-done.md` — finished write-ups. `README.md` — features, setup, script list.
- `docs/features-reference.md` — conventions for VehiclesDB, RDW specs, estimated value, weight rankings, community posts, the racer
  game, Accounts, VIN page, offline/PWA, link previews, plate regions. **Read the matching section before touching those areas.**
- `docs/commands-reference.md` — every `ingest:*` / `export:*` / ALPR command with flags.
- `DATASETS_PLAN.md` (external datasets), `GAME_PLAN.md`, `FEATURES_PLAN.md`, `SCHEDULE.md` (post-deploy jobs),
  `docs/vps-http2-http3.md` (reverse proxy; `pnpm preview:prod` = production-like run).

The **v1 app is the sibling folder `../carplates/`** (do not modify it) — the reference for Phase 2/3 ports.

## Commands

```bash
pnpm dev            # web (:5173) + api (:3000)
pnpm preview:prod   # build, Nest serves the SPA (port 3000; PORT=3100 if dev is running)
pnpm build | lint | type-check | test | format   # lint:types = slow type-checked lint
pnpm db:up | db:down | db:reset | db:migrate | db:seed   # postgres:18.6 in docker; seed = ~1000 synthetic rows
pnpm db:refresh-stats      # rebuild current_registration + stats_by_* from existing rows
pnpm db:refresh-derived    # fuel/safety/vdb/weight rollups; run after ingest:ratings:csv / ingest:vehiclesdb
pnpm ingest -- --year 2026 --limit 100000   # real data slice;  ingest:full = everything (hours, ~20 GB)
pnpm ingest:all     # ingest:full + all CSV seeds, then derived rollups;  ingest:ratings:csv = committed seeds only (seconds)
```

UK MOT is the odd one out (manual ~6 GB ZIP download): `ingest:mot -- --dir <folder>`, or `ingest:mot:csv` for the committed seed.
Each source has `ingest:<x>`, `ingest:<x>:csv` (committed seed) and `export:<x>:csv` (re-dump after a real re-ingest); no-CSV sources
(news, social, winner360) are re-run on demand. Names and flags: `docs/commands-reference.md`.

First-time setup: `pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev` (real data: `ingest:all` instead of `db:seed`).

## Layout

`packages/shared` (plate normalization `normalizePlate`, regions, Zod schemas — **single source of truth, never re-implement plate
logic elsewhere**) · `packages/db` (Drizzle schema `registry`, SQL migrator) · `apps/api` (NestJS + Fastify, `src/<feature>/`, serves the
built SPA + per-plate `<meta>`) · `apps/web` (Vite + React 19 + React Router 8, `@/` → `src/`) · `scripts/` (ingest/export CLIs run with
`tsx`, `seed-data/` = committed gzipped CSVs) · `infra/` (docker compose) · `services/alpr/` (self-hosted ALPR container).

## Stack pins (reasons in PLAN.md "Version pins")

pnpm 12 · Node 24 · TypeScript 5.9 (not 7) · NestJS 11 (not 12) · Drizzle 0.45.2 (pinned) · Vitest 4 · ESLint 10 · Vite 8 · Tailwind v4
(CSS-first, `@theme` in `src/styles/global.css`) · i18next ua/ru/en · `nestjs-zod` (one Zod schema → validation + OpenAPI `/api/docs`) ·
PostHog/Sentry inert unless telemetry env is on (`.env.example` in each app; real `.env*` are gitignored and `deny`-listed).

## Conventions

- **ESM everywhere.** Relative imports in `api`/`db`/`scripts` carry `.js` extensions (nodenext). `apps/web` uses `@/`.
- **`@carplates/shared` is consumed from its built `dist/`**: after editing `packages/shared/src` run
  `pnpm --filter @carplates/shared build`, or the running API/web keep the old behaviour (unit tests run against `src`, so they won't show it).
- **Plate normalization** runs on every plate at every layer (web input, API param, ingest row); it produces the DB key and the query
  key — they must match. **Exception:** `registrations.plate` is nullable since the 2026 plate removal (order №67/ОД, `docs/plan-done.md`);
  such rows are keyed on `vin` and the API follows the VIN (`plate.service.ts`, `vin.service.ts`).
- **Plate → region**: `regions.ts` is mirrored by `registry.plate_regions` — change both in a new migration, and edit
  `regions.statute.test.ts` too.
- **Ingest column mapping is header-name-driven, not positional** (`scripts/src/transform.ts`); the source layout changes yearly.
- **DB writes**: Drizzle in `apps/api`; ingest batches `INSERT … ON CONFLICT DO NOTHING`; `backfill.ts` uses raw SQL. Schema change = a
  new `packages/db/migrations/NNNN_*.sql` (applied in order, once each).
- **Never erase a real-data-seeded DB without asking.** `pnpm db:seed` TRUNCATEs `registry.registrations`.
  Before `db:seed` or any `TRUNCATE`/`DROP`/bulk `DELETE` on `registry.registrations` or `registry.ingested_resources`, run
  `SELECT count(*) FROM registry.registrations` — thousands = synthetic, millions = real; if real, **ask the user** first.
- **Offline / PWA**: the service worker exists only in production builds. Editing `schemas.ts` discards users' saved offline data;
  contracts in their own file (`vdb.ts`, `rdw.ts`, `account.ts`, `fx.ts`) don't, so new fields there are `.nullable().optional()` and read
  defensively. A new `/api/*` query that should work offline goes into `lib/offline-cache.ts`.
- **NestJS**: feature modules, Zod-validated inputs, no logic in controllers; controllers return values and never take `@Res()` (except
  the SPA catch-all). Link previews (`apps/api/src/spa/`) are produced by the API, never by Vite.
- **i18n is loaded per language** (`apps/web/src/i18n`): separate lazy chunks, non-ua also loads ua (fallback). `main.tsx` awaits
  `i18nReady`; switch via async `setLang`. Tests that render translated text `await i18nReady` — never `import '@/i18n'` for its side effect.
- **Below-the-fold result sections are `LazySection`s.** A new shareable section must list its id in `sections`, or its share link will
  not open it. Pure helpers shared by lazy chunks are grouped in `vite.config.ts` (`HELPER_GROUPS`).
- Accounts: separate `app` schema, **not** re-ingestable; `account.ts`, not `schemas.ts`; admins by SQL only; account UI online-only.
- Tests: Vitest, `import { describe, it, expect } from 'vitest'`, colocated `*.test.ts(x)`.

## Workflow

- After each big update, give a suggested commit message — don't run `git commit` / `git push` unless explicitly asked.
- Run `pnpm format` first (`scripts/src/fixtures` is in `.prettierignore` — never reformat it).
- The message covers everything uncommitted: check `git status` / `git diff --stat`; one message (subject + bullet per change) or one per
  logical change if they should be split.
- Keep docs current: finished work → write-up in `docs/plan-done.md`, one-line ✅ in `PLAN.md`, conventions in `docs/features-reference.md`.

## Rules

@CLAUDE_RULES.md
