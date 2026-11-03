# 3DTuning links ("Customize in 3D") - research and plan

Researched 2026-11-03. Status: **not started**, research only.

## Findings

- **Embedding is not possible.** Pages send `X-Frame-Options: deny`; no public widget, embed or partner API found. A `/b2b` page exists in their sitemap (unread, sales channel). Link out only; never copy their images or the 3D configurator.
- `https://www.3dtuning.com/robots.txt`: empty `Disallow:`, `Sitemap: https://www.3dtuning.com/sitemap.xml`.
- The sitemap (about 4.9 MB, single line, use Node not grep/sed) lists the car pages. Some pages (e.g. `/en-US/cars`) return a 500 / 571-byte error page to non-browser clients; the sitemap is enough, no scraping needed.
- **2,463 car pages**, 133 makes, 1,518 make+model pairs (top: ford 170, bmw 153, mercedes 140, chevrolet 126, toyota 121, volkswagen 108, audi 100).
- URL shape: `/{locale}/tuning/{make}/{model}/{body}-{generation}.{startYear}`, 8 path segments when split on `/`.
  Examples: `/en-US/tuning/bmw/3.series/sedan-e90.2005`, `/en-US/tuning/volkswagen/golf.7/3.door.hatchback-mk7.2013`, `/en-US/tuning/toyota/tacoma.crew.cab/4.door.pickup.truck.2024`.
- Locales: it-IT es-ES en-US ru-RU ko-KO ja-JP zh-CN de-DE fr-FR pt-PT. **No uk-UA**: use `ru-RU` or `en-US` for ua users.
- The sitemap also has about 5,000 user build pages (`/en-US/<username>/...`). Ignore them.
- Slugs are lowercase with dots (`3.series`, `golf.7`, `5.series.m5`, `3.series.(facelift)`); the year is the generation start year.

## Plan

- [ ] `scripts/src/ingest-3dtuning.ts`: fetch the sitemap, keep `/en-US/tuning/` pages with 8 segments, parse make / model / body / generation / startYear, write the seed CSV `scripts/seed-data/` + `pnpm export:*:csv` per convention. Re-run occasionally.
- [ ] Migration `packages/db/migrations/NNNN_tuning_links.sql` (backward compatible): `registry.tuning_links` (make_slug, model_slug, generation, start_year, path). Contract in its own file, no `schemas.ts` change.
- [ ] **Measure the match rate first**: run our real make/model/year set against the CSV and report hit rate and top misses before building UI.
- [ ] Matching (shared pure helper, one place): normalize make and model (lowercase, dots/spaces to one separator, alias table such as `mercedes-benz` -> `mercedes`), match make+model, choose the generation with the largest `start_year <= car year`. No model match: make-level link only if it exists, else no link (never a wrong link).
- [ ] API: lookup in `apps/api/src/<feature>/` (Zod inputs, `@Inject`, no logic in controllers), edge-cache headers + Cloudflare Cache Rule per CLAUDE.md.
- [ ] Web: small "Customize in 3D" link card as a `LazySection` (id in `sections`), opens in a new tab with `rel="noopener noreferrer"`, ua/ru/en strings (no em dash in UI text), offline cache entry if offline-capable.
- [ ] Docs on build: `plan-done.md`, `features-reference.md`, `releases.ts`, `AboutRoute.tsx` `SOURCES`/`FEATURES`.
- [ ] Optional: ask 3dtuning via their `/b2b` page about an affiliate or partner link.
