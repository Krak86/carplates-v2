# CLAUDE.md

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate number or VIN. pnpm monorepo replacing the 2019 GitHub-Pages SPA. Data: state
open-data portal (`data.gov.ua`) in Postgres; VIN decoding proxies NHTSA. **Phase 1: local dev stack only** (no CI, no VPS). The v1 app
is the sibling `../carplates/` (do not modify; reference for ports).

Docs map (**grep headings, never read whole** — several are 100–300 KB): `PLAN.md` active/planned · `docs/plan-done.md` finished
write-ups · `README.md` features, setup, script list · `docs/features-reference.md` conventions per feature (VehiclesDB, RDW, value,
rankings, posts, racer, Accounts, VIN page, offline/PWA, link previews, plate regions, generations) — **read the matching section before
touching those areas** · `docs/commands-reference.md` every `ingest:*` / `export:*` / ALPR command · `DATASETS_PLAN.md`,
`GAME_PLAN.md`, `FEATURES_PLAN.md`, `SCHEDULE.md`, `docs/vps-http2-http3.md`.

## Commands

`pnpm dev` (web :5173 + api :3000) · `preview:prod` (PORT=3100 if dev runs) · `build|lint|type-check|test|format` · `db:up|down|reset|
migrate|seed|refresh-stats|refresh-derived` · `ingest`, `ingest:all`, `ingest:<x>[:csv]`, `export:<x>:csv` (see commands-reference).
Setup: `pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`. UK MOT is manual (`ingest:mot -- --dir`).

## Layout

`packages/shared` (plate normalization `normalizePlate`, regions, Zod schemas — **single source of truth, never re-implement plate
logic**) · `packages/db` (Drizzle schema `registry`, SQL migrator) · `apps/api` (NestJS + Fastify, `src/<feature>/`, serves SPA +
per-plate `<meta>`) · `apps/web` (Vite + React 19 + React Router, `@/` → `src/`) · `scripts/` (ingest/export CLIs via `tsx`,
`seed-data/` = committed gzipped CSVs) · `infra/` · `services/alpr/`.

Pins (reasons in PLAN.md "Version pins"): pnpm 12, Node 24, TypeScript 5.9 (not 7), NestJS 11 (not 12), Drizzle 0.45.2, Vitest 4,
ESLint 10, Vite 8, Tailwind v4 (`@theme` in `src/styles/global.css`), i18next ua/ru/en, `nestjs-zod`. Real `.env*` are gitignored.

## Conventions

- **ESM.** Relative imports in `api`/`db`/`scripts` carry `.js`; `apps/web` uses `@/`.
- **`@carplates/shared` is consumed from `dist/`**: after editing it run `pnpm --filter @carplates/shared build` (unit tests use `src`).
- **Plate normalization** runs at every layer (DB key = query key). Exception: `registrations.plate` is nullable (2026 plate removal);
  such rows are keyed on `vin` (`plate.service.ts`, `vin.service.ts`).
- **Plate → region**: `regions.ts` mirrors `registry.plate_regions` — change both in a new migration, plus `regions.statute.test.ts`.
- **Ingest mapping is header-name-driven** (`scripts/src/transform.ts`). Ingest batches `INSERT … ON CONFLICT DO NOTHING`.
  Schema change = new `packages/db/migrations/NNNN_*.sql`.
- **Never erase a real-data DB without asking.** Before `db:seed` or any `TRUNCATE`/`DROP`/bulk `DELETE` on `registry.registrations`
  or `registry.ingested_resources`, run `SELECT count(*) FROM registry.registrations` — thousands = synthetic, millions = real → ask.
- **Offline / PWA**: service worker is production-only. Editing `schemas.ts` discards saved offline data; contracts in their own file
  (`vdb.ts`, `rdw.ts`, `account.ts`, `fx.ts`) don't — new fields there are `.nullable().optional()`. A new offline-capable `/api/*`
  query goes into `lib/offline-cache.ts`.
- **NestJS**: Zod-validated inputs, no logic in controllers, never `@Res()` (except SPA catch-all). Link previews (`apps/api/src/spa/`)
  come from the API, never Vite.
- **i18n is per-language lazy chunks** (non-ua also loads ua). Tests rendering text `await i18nReady`; never `import '@/i18n'`.
- **Below-the-fold sections are `LazySection`s**; a new shareable one must list its id in `sections`. Shared pure helpers of lazy
  chunks go in `vite.config.ts` `HELPER_GROUPS`.
- Accounts: separate `app` schema, not re-ingestable; `account.ts`, not `schemas.ts`; admins by SQL only; online-only UI.
- Tests: Vitest, colocated `*.test.ts(x)`.

## Workflow

- After each big update give a suggested commit message (subject + bullet per change, covering everything uncommitted: check
  `git status` / `git diff --stat`; split if logical). Never run `git commit` / `git push` unless asked.
- Run `pnpm format` first (`scripts/src/fixtures` is in `.prettierignore` — never reformat it).
- Keep docs current: finished work → write-up in `docs/plan-done.md`, one-line ✅ in `PLAN.md`, conventions in `docs/features-reference.md`.

@CLAUDE_RULES.md
