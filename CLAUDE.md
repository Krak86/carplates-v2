# CLAUDE.md

## What this is

`carsua.app` v2 — Ukrainian vehicle lookup by plate number or VIN. pnpm monorepo replacing the 2019 GitHub-Pages SPA. Data: state
open-data portal (`data.gov.ua`) in Postgres; VIN decoding proxies NHTSA. **Phase 1: local dev stack only** (no CI, no VPS). The v1 app
is the sibling `../carplates/` (do not modify).

Docs (**grep headings, never read whole** — several are 100–400 KB): `PLAN.md` active/planned + version pins · `docs/plan-done.md`
finished write-ups · `README.md` setup/env/scripts · `docs/features-reference.md` per-feature conventions (**grep `^## ` and read the matching
section before touching a feature**) · `docs/commands-reference.md` `ingest:*`/`export:*`/ALPR · `docs/{legal-and-monetization,logins,security-checklist}.md`.
Other docs in `docs/` and the root `*_PLAN.md`/`SCHEDULE.md` only on request.

## Layout

`packages/shared` (plate normalization `normalizePlate`, regions, Zod schemas — **single source of truth, never re-implement plate
logic**) · `packages/db` (Drizzle schema `registry`, SQL migrator) · `apps/api` (NestJS + Fastify, `src/<feature>/`, serves SPA +
per-plate `<meta>`) · `apps/web` (Vite + React 19 + React Router, `@/` → `src/`) · `scripts/` (ingest/export CLIs via `tsx`,
`seed-data/` = committed gzipped CSVs) · `infra/` · `services/alpr/`.

Pins (why: PLAN.md): pnpm 12, Node 24, TypeScript 5.9 (not 7), NestJS 11 (not 12), Drizzle 0.45.x (not 1.0 RC), jsdom ~30.0 (30.1 breaks `.rejects.toThrow`), Tailwind v4.

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
- **Deploy** (`docs/deploy.md`): path-filtered workflows on `main`; blue/green api ⇒ migrations backward compatible; new env var ⇒ `env.ts` + `deploy-api.yml` + deploy.md.
- **New public route** → add it to `ROUTE_TITLE_KEYS` (`useDocumentTitle.ts`; also stops the header/scroll buttons reading it as a plate) and a `STATIC_PAGES` entry (ua/ru/en) in `apps/api/src/spa/spa-text.ts`, else it is `noindex` and not in the
  sitemap. `/api/*` is globally rate-limited (`common/throttle.ts`); add a `@Throttle` for any enumerable lookup.

## Workflow

- After each big update give a suggested commit message (subject + bullet per change, covering everything uncommitted: check
  `git status` / `git diff --stat`; split if logical). Never run `git commit` / `git push` unless asked.
- **Seed CSVs mirror scraped tables.** After changing `registry.wiki_image` (pre-warm, `wikiAliases.ts` + re-scrape, row deletes) re-run
  `pnpm export:wiki-images:csv`; same for every other `export:*:csv` dataset (a new setup loads the CSV instead of re-scraping).
- Run `pnpm format` first (never reformat `scripts/src/fixtures`). Tests: Vitest, colocated `*.test.ts(x)`.
- Keep docs current: write-up → `docs/plan-done.md`, one-line ✅ → `PLAN.md`, conventions → `docs/features-reference.md`, user-facing entry → `releases.ts`;
  a new feature or data source also goes on the About page (`about.feature.*` / `SOURCES` + `about.source.*`, ua/ru/en).

@CLAUDE_RULES.md
