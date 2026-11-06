# CLAUDE.md

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate or VIN (pnpm monorepo, Postgres, NHTSA). v1 is `../carplates/` (do not modify).

Docs are huge: **grep `^## ` headings, never read whole**. `PLAN.md` backlog + pins · `docs/plan-done.md` · `README.md` setup/env ·
`docs/features-reference.md` (**read the matching section before touching a feature**) · `docs/commands-reference.md` · other `docs/*.md` on request.

## Layout

`packages/shared` (`normalizePlate`, regions, Zod schemas — **single source of truth, never re-implement plate logic**) · `packages/db` ·
`apps/api` (`src/<feature>/`; serves the SPA + per-plate `<meta>`) · `apps/web` · `scripts/` (ingest/export CLIs, `seed-data/` gzipped CSVs) · `infra/` · `services/alpr/`.

Version pins (PLAN.md "Version pins"): never bump to `latest`.

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
- **Offline / PWA**: editing `schemas.ts` discards saved offline data; contracts in their own file (`vdb.ts`, `rdw.ts`, `account.ts`, `fx.ts`)
  don't — new fields there are `.nullable().optional()`. A new offline-capable `/api/*` query goes into `lib/offline-cache.ts`.
- **NestJS**: Zod-validated inputs, no logic in controllers, never `@Res()` (except SPA catch-all). Link previews
  come from the API, never Vite.
- **i18n is per-language lazy chunks** (non-ua also loads ua). Tests rendering text `await i18nReady`; never `import '@/i18n'`.
- **Zod `jitless`**: `@/lib/zod-config` stays the first import of `main.tsx`; `vendor-zod` / `zod-config` stay separate chunks (else CSP `eval`).
- **Checklists** (`docs/checklists.md`, read the item before the change): edge cache for a new `/api/*` endpoint, `LazySection`s / `HELPER_GROUPS`, deploy (migrations, env var, ingest job), new public route (title, `STATIC_PAGES`, `@Throttle`).

## Workflow

- **Open to-dos / "what is left after deploy":** `grep -n "\[ \]" PLAN.md` (`⏳` = blocked). A feature needing a VPS step or prod check adds its boxes under "After deploy".
- After a big update suggest a commit message (subject + bullet per change). Never `git commit` / `git push` unless asked.
- Seed CSVs mirror scraped tables: after changing one, re-run its `pnpm export:*:csv`.
- `pnpm format` first (not `scripts/src/fixtures`). Tests: Vitest, colocated `*.test.ts(x)`.
- Docs after a feature (plan-done, PLAN, features-reference, releases, About): `docs/checklists.md` "Docs after a feature".

@CLAUDE_RULES.md
