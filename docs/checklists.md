# Checklists (moved out of CLAUDE.md to keep every session's context small)

Read the matching item before the change; CLAUDE.md only points here.

## Edge cache

A new cacheable `/api/*` endpoint: `common/cache.ts` headers (`ROLLUP_CACHE`, `STATS_CACHE`, `LOSSES_CACHE`, …) + a Cloudflare Cache Rule (+ `PUBLIC_API_PATH_PREFIXES` if public). Details: `docs/features-reference.md` "Edge cache", `docs/deploy.md`. All layers (browser to Postgres) in one table: `docs/features-reference.md` "Cache layers".

## Lazy sections

Below-the-fold sections are `LazySection`s; a new shareable one must list its id in `sections` (and `lib/share-section.ts`). Shared pure helpers of lazy chunks go in `vite.config.ts` `HELPER_GROUPS`.

## Deploy

- Blue/green ⇒ backward-compatible migrations.
- Prod compose images need an exact tag, never `latest` / a floating major (`${X_TAG:?…}` + the key in the `lib.sh` seed loop; rollback = "Deploy" with `image_tag`, `docs/deploy.md` "Rollback"; deploy order and path lists: `deploy.yml`, `docs/deploy.md` "Deploy order"). Long-running services also get `stop_grace_period`.
- New stateful service (like `redis`): exact image tag, internal network only (no `ports`), password via a CI-written `env/<svc>.env` (secret in `deploy-api.yml` + `docs/deploy.md`), healthcheck, `mem_limit`, `cap_drop: [ALL]`, `stop_grace_period`, json-file logs, data under `/opt/carsua/<svc>data` (created in `lib.sh`), started in `deploy-api.sh`'s "stateful services" line, a PLAN.md "Version pins" mention. The api must keep working when it is down (fail open).
- New VPS image (a new `carsua-*` service) ⇒ call `prune_images` from its deploy script (`lib.sh`), otherwise old sha-tagged images fill the disk.
- New env var ⇒ `env.ts` + `deploy-api.yml` + `docs/deploy.md`.
- New VPS deploy step ⇒ a script in `infra/vps/` that sources `/opt/carsua/compose/lib.sh` (`set_env`, `wait_healthy`); rsync `lib.sh` first and add the script to the workflow `paths`. Shared CI bits: `.github/actions/` (`ssh-setup`, `build-image`, `cf-purge`), `infra/ci/lib.sh` (`emit`, `push_env`).
- New ingest job ⇒ `scripts/src/jobs.ts` + `run-ingest.sh` + `infra/vps/ingest.cron` + a `/data-status` row (`datasets.ts`, `data-status.service.ts`).

## New public route

`ROUTE_TITLE_KEYS` (`useDocumentTitle.ts`), a `STATIC_PAGES` entry (ua/ru/en) in `apps/api/src/spa/spa-text.ts` (else `noindex`, no sitemap), `max-w-6xl` page width. Add `@Throttle` (`common/throttle.ts`) to any enumerable lookup.

## Docs after a feature

Write-up → `plan-done.md`, one-line ✅ → `PLAN.md`, conventions → `features-reference.md`, user-facing → the newest month file `shared/src/releases/<yyyy-mm>.ts`
(only `new` mailed; new day ⇒ rebuild shared (`LATEST_RELEASE_DATE` is read from the newest month file by `web/latest-release-date.ts`, nothing to bump; restart the dev server); **new month ⇒** a new month file, plus `RELEASE_MONTHS` in `releases/core.ts`, the barrel `releases.ts` and the loader map in `web/src/routes/releases/months.ts`); new feature/source → `AboutRoute.tsx`
(`FEATURES`/`SOURCES` + `about.brief|feature|source.*`, ua/ru/en).

**App version**: on any change to the web app (`apps/web`, user-visible `shared`/`api` changes), set `version` on that day's
release entry (month file) to `v2.<git rev-list --count stage>` (+1 if the commit isn't made yet), overwriting the earlier value for that day.
The footer version itself is computed at Vite start (restart `pnpm dev` to refresh it).
