# Checklists (moved out of CLAUDE.md to keep every session's context small)

Read the matching item before the change; CLAUDE.md only points here.

## Edge cache

A new cacheable `/api/*` endpoint: `common/cache.ts` headers (`ROLLUP_CACHE`, `STATS_CACHE`, `LOSSES_CACHE`, …) + a Cloudflare Cache Rule (+ `PUBLIC_API_PATH_PREFIXES` if public). Details: `docs/features-reference.md` "Edge cache", `docs/deploy.md`.

## Lazy sections

Below-the-fold sections are `LazySection`s; a new shareable one must list its id in `sections` (and `lib/share-section.ts`). Shared pure helpers of lazy chunks go in `vite.config.ts` `HELPER_GROUPS`.

## Deploy

- Blue/green ⇒ backward-compatible migrations.
- New env var ⇒ `env.ts` + `deploy-api.yml` + `docs/deploy.md`.
- New ingest job ⇒ `scripts/src/jobs.ts` + `run-ingest.sh` + `infra/vps/ingest.cron` + a `/data-status` row (`datasets.ts`, `data-status.service.ts`).

## New public route

`ROUTE_TITLE_KEYS` (`useDocumentTitle.ts`), a `STATIC_PAGES` entry (ua/ru/en) in `apps/api/src/spa/spa-text.ts` (else `noindex`, no sitemap), `max-w-6xl` page width. Add `@Throttle` (`common/throttle.ts`) to any enumerable lookup.

## Docs after a feature

Write-up → `plan-done.md`, one-line ✅ → `PLAN.md`, conventions → `features-reference.md`, user-facing → `shared/src/releases.ts`
(only `new` mailed; new day ⇒ bump `web/src/routes/releases/latest.ts`, then rebuild shared); new feature/source → `AboutRoute.tsx`
(`FEATURES`/`SOURCES` + `about.brief|feature|source.*`, ua/ru/en).

**App version**: on any change to the web app (`apps/web`, user-visible `shared`/`api` changes), set `version` on that day's
`releases.ts` entry to `v2.<git rev-list --count stage>` (+1 if the commit isn't made yet), overwriting the earlier value for that day.
The footer version itself is computed at Vite start (restart `pnpm dev` to refresh it).
