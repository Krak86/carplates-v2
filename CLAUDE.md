# CLAUDE.md

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate or VIN. pnpm monorepo; data from `data.gov.ua` in Postgres, VIN decoding via NHTSA.
The v1 app is the sibling `../carplates/` (do not modify).

Docs (**grep `^## ` headings, never read whole**, 100–400 KB): `PLAN.md` backlog + pins · `docs/plan-done.md` write-ups · `README.md` setup/env ·
`docs/features-reference.md` per-feature conventions (**read the matching section before touching a feature**) · `docs/commands-reference.md` ·
`docs/{legal-and-monetization,logins,security-checklist}.md`. Others only on request.

## Layout

`packages/shared` (`normalizePlate`, regions, Zod schemas — **single source of truth, never re-implement plate logic**) · `packages/db`
(Drizzle `registry`, SQL migrator) · `apps/api` (NestJS + Fastify, `src/<feature>/`, serves SPA + per-plate `<meta>`) · `apps/web`
(Vite + React 19 + React Router) · `scripts/` (ingest/export CLIs, `seed-data/` gzipped CSVs) · `infra/` · `services/alpr/`.

Pins (why: PLAN.md "Version pins"): Node 24, TypeScript 5.9, NestJS 11, Drizzle 0.45.x, jsdom ~30.0, Tailwind v4 - never bump to `latest`.

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
- **Zod `jitless`**: `@/lib/zod-config` stays the first import of `main.tsx`; `vendor-zod` / `zod-config` stay separate chunks (else CSP `eval`).
- **Edge cache**: a new cacheable `/api/*` endpoint sends `common/cache.ts` headers, joins the Cloudflare Cache Rule and (if public) `PUBLIC_API_PATH_PREFIXES`; read `docs/features-reference.md` "Agent discovery, edge cache, Zod and CSP".
- **Below-the-fold sections are `LazySection`s**; a new shareable one must list its id in `sections`. Shared pure helpers of lazy
  chunks go in `vite.config.ts` `HELPER_GROUPS`.
- Accounts: separate `app` schema, not re-ingestable; `account.ts`, not `schemas.ts`; admins by SQL only; online-only UI.
- **Deploy** (`docs/deploy.md`): blue/green api ⇒ migrations backward compatible; new env var ⇒ `env.ts` + `deploy-api.yml` + deploy.md.
- **New public route** → `ROUTE_TITLE_KEYS` (`useDocumentTitle.ts`), a `STATIC_PAGES` entry (ua/ru/en) in `apps/api/src/spa/spa-text.ts` (else `noindex`, no sitemap),
  `max-w-6xl` page width. Add `@Throttle` (`common/throttle.ts`) to any enumerable lookup.

## Workflow

- After each big update give a suggested commit message (subject + bullet per change, covering everything uncommitted: check
  `git status` / `git diff --stat`; split if logical). Never run `git commit` / `git push` unless asked.
- **Seed CSVs mirror scraped tables.** After changing `registry.wiki_image` (pre-warm, `wikiAliases.ts` + re-scrape, row deletes) re-run
  `pnpm export:wiki-images:csv`; same for every other `export:*:csv` dataset (a new setup loads the CSV instead of re-scraping).
- Run `pnpm format` first (never reformat `scripts/src/fixtures`). Tests: Vitest, colocated `*.test.ts(x)`.
- Keep docs current: write-up → `docs/plan-done.md`, one-line ✅ → `PLAN.md`, conventions → `docs/features-reference.md`, user-facing entry → `packages/shared/src/releases.ts`
  (only `new` items are mailed; new day ⇒ bump `releases/latest.ts`); new feature / data source → About (`about.feature.*`, `SOURCES` + `about.source.*`, ua/ru/en).

@CLAUDE_RULES.md
