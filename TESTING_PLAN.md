# TESTING_PLAN.md - UI, integration and e2e tests

Researched 2026-11-04. **Nothing is built yet.** Each step below is one session: start it with
*"do TESTING_PLAN.md step N"* and tick its box when done.

## Context

- ~300 Vitest files today: web 117 (jsdom + Testing Library), api 70, shared 60, scripts 53, db 0.
- Two api tests boot a real Nest/Fastify app (`apps/api/src/spa/spa.controller.test.ts`, `shares/shares.controller.test.ts`) but stub the DB.
- **No browser tests and no tests against a real Postgres.**
- `.github/workflows/ci.yml` (type-check, lint, test, audit) gates `deploy-web.yml` and `deploy-api.yml` through `workflow_call`.
- `infra/vps/deploy-api.sh` only waits for the Docker `healthz` before the blue/green switch.
- GitHub runners cannot reach prod (Cloudflare Bot Fight Mode returns 403), so no post-deploy e2e against prod.
- The last browser check was manual (`docs/deploy.md`, "Browser smoke test", 2026-10-28).

**Gaps these tests close** (jsdom cannot see them): CSP + Zod `jitless` (`@/lib/zod-config`, `vendor-zod` chunks), lazy i18n chunks,
`LazySection`, the service worker and offline cache, SPA `<meta>` injection. On the DB side: plate keys, `ON CONFLICT` ingest,
migrations, nullable-plate rows keyed on VIN.

## 2026 practice (summary)

- Testing trophy: most value from integration tests on real boundaries, a thin e2e layer for critical journeys, unit tests for pure logic.
- Playwright is the e2e default (retries + single worker in CI, traces, `toHaveScreenshot`, `@axe-core/playwright`).
- Vitest Browser Mode (stable since Vitest 4, Playwright provider) for components that jsdom fakes badly. Keep jsdom for the bulk.
- Real Postgres (Testcontainers or a CI `services: postgres`) beats mocks. Image is cached after the first pull.
- Later: a few visual snapshots, synthetic prod monitoring, AI-assisted authoring via Playwright MCP / codegen.

**Is integration worth it?** Yes, for the DB layer (cheap, no browser, catches what mocks hide). E2E: main features only, about 10 specs.

Sources: [Vitest Browser Mode vs Playwright](https://epicweb.dev/vitest-browser-mode-vs-playwright), [Vitest vs Playwright](https://www.browserstack.com/guide/vitest-vs-playwright), [Vitest Browser Mode guide](https://www.frugaltesting.com/blog/vitest-browser-mode-testing-real-browsers), [Testcontainers + Postgres + Node](https://qaskills.sh/blog/testcontainers-postgresql-node-complete-guide), [Node.js Testcontainers](https://flaviocopes.com/nodejs-testcontainers/)

## Rules for every step

- **Never touch a real-data DB.** Use a dedicated DB `carplates_test`. Setup aborts unless the DB name is `carplates_test` or
  `SELECT count(*) FROM registry.registrations` is below 100k (CLAUDE.md "Never erase a real-data DB").
- Synthetic seed only (`scripts` `seed`). Plate inputs go through `normalizePlate` from `@carplates/shared`, never re-implemented.
- Pin exact tool versions (PLAN.md "Version pins"), no `latest`. Run `pnpm format` first.
- No Python on this machine; pnpm forwards a literal `--`.
- Leave external integrations unconfigured (empty env = "not configured" in `env.ts`); stub the rest with `page.route()`.

## Steps

- [ ] **1. Test DB plumbing**
  - Goal: a Vitest project that runs against real Postgres, kept out of the default `pnpm test` so local runs need no Docker.
  - New: `apps/api/vitest.int.config.ts` (include `src/**/*.int.test.ts`), `apps/api/src/test/int-setup.ts` (connect `DATABASE_URL`,
    run `packages/db` migrate, load the synthetic seed, real-data guard from the Rules above).
  - Edit: root `vitest.config.ts` (exclude `*.int.test.ts`), root + `apps/api` `package.json` (`test:int`).
  - Local DB: `pnpm db:up` (`infra/docker-compose.yml`), create `carplates_test`.
  - Done when: `pnpm db:up && pnpm test:int` runs an empty/placeholder suite green, `pnpm test` is unchanged, the guard aborts on a big DB.

- [ ] **2. DB integration specs**
  - Goal: real-SQL coverage of the core lookups.
  - Pattern: `Test.createTestingModule` + Fastify `inject`, as in `spa.controller.test.ts`, but with the real DB module and explicit `@Inject(...)` tokens.
  - Cases: plate search (normalized key, Cyrillic/Latin input), VIN search, nullable-plate rows keyed on `vin`
    (`plate.service.ts`, `vin.service.ts`), one ingest `ON CONFLICT DO NOTHING` round trip, migrations apply idempotently, one stats rollup.
  - Done when: `pnpm test:int` green; breaking a migration or the plate key makes it fail.

- [ ] **3. CI `integration` job**
  - Goal: DB integration blocks deploy.
  - Edit `.github/workflows/ci.yml`: new job `integration` (needs `check`), `services: postgres` with the same major as
    `infra/docker-compose.prod.yml`, env `DATABASE_URL` for `carplates_test`, run `pnpm test:int`. `deploy-*.yml` already reuse `ci.yml`.
  - Done when: a PR shows the job green, adds under about 2 min, and deploy workflows still wait for it.

- [ ] **4. Playwright scaffold**
  - Goal: a runnable e2e project with zero specs beyond one trivial load.
  - New workspace package `e2e/` (`package.json`, `playwright.config.ts`, `tests/`, `fixtures/`), add to `pnpm-workspace.yaml`.
  - Config: `@playwright/test` pinned, Chromium + one mobile project (Pixel), `retries: 2` in CI, `trace: 'on-first-retry'`, HTML report.
    `webServer` = the prod build served by the api (`pnpm preview:prod`) on the test DB with the synthetic seed.
  - Root script `pnpm e2e`. Check `docs/commands-reference.md` for `preview:prod` env needs.
  - Done when: `pnpm build && pnpm e2e` passes one "home returns 200 and renders" spec locally.

- [ ] **5. Smoke specs 1-5**
  1. Home loads with no console errors and **no CSP violations** (guards jitless/zod chunks).
  2. Plate search renders the result card; lazy sections load.
  3. VIN search renders a result.
  4. Deep link `/<plate>`: server-rendered `<title>` and `og:` meta present (SPA catch-all).
  5. Language switch ua -> en -> ru loads the i18n chunks and changes visible text.
  - Done when: all green locally; removing `@/lib/zod-config` from the top of `main.tsx` makes spec 1 fail (revert after).

- [ ] **6. Smoke specs 6-10 + e2e in CI**
  6. Dark theme toggle persists after reload.
  7. One static page per type (`/about`, `/stats`, `/showroom`) renders and is not `noindex`.
  8. PWA: service worker registers; after one lookup, offline still shows the cached result (`lib/offline-cache.ts`).
  9. `@axe-core/playwright` on home and the result page: no serious/critical issues.
  10. 404 route.
  - CI: extend the `integration` job with `pnpm build`, `playwright install --with-deps chromium` (cached by version), `pnpm e2e`,
    upload the report/trace as an artifact on failure, skip e2e on docs-only changes (paths filter or `git diff`).
  - Skip: login, contact/Turnstile, ALPR upload, admin (third-party dependent, low return).
  - Done when: PR CI is green in about 4-6 min total and a deliberately failing spec uploads its trace.

- [ ] **7. Optional extras + docs**
  - Pre-switch smoke in `infra/vps/deploy-api.sh`: curl one plate API and one SPA meta URL on the new colour before stopping the old one.
  - Vitest Browser Mode for a few components jsdom fakes badly (Timeline, share dialog, charts).
  - 2-3 visual snapshots of stable pages.
  - Synthetic prod monitoring (UptimeRobot keyword check or Checkly), since runner-side checks are blocked by Cloudflare.
  - Docs (CLAUDE.md rules): "Testing" section in `docs/features-reference.md`, `docs/commands-reference.md`, write-up in `docs/plan-done.md`,
    one-line ✅ in `PLAN.md`.
