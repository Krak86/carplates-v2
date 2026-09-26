# carplates-v2

Ukrainian vehicle lookup by **plate number** or **VIN**. Rebuild of
[carsua.app](https://carsua.app).

- Plate data: the state open-data registry ([data.gov.ua](https://data.gov.ua/dataset/06779371-308f-42d7-895e-5a39833375f0)) → Postgres
- VIN data: [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/vehicles/decodevin) (proxied)
- Crash-test safety ratings, five sources: [NHTSA](https://api.nhtsa.gov/SafetyRatings) (proxied,
  US-spec) · [Euro NCAP](https://www.euroncap.com) (scraped, EU-spec) ·
  [JNCAP](https://www.nasva.go.jp/mamoru/en/) (scraped, JDM-domestic) · [C-NCAP](https://www.c-ncap.org.cn)
  (scraped, China-market) · [KNCAP](https://www.kncap.org) (scraped, Korea-market)

pnpm monorepo · Node 24 · React 19 + Vite 8 · NestJS 11 + Fastify · Drizzle + Postgres 18.

## Quick start

```bash
pnpm install
pnpm db:up            # postgres:18.6 in Docker
pnpm db:migrate
```

Then load data one of two ways — pick one, both work against the same schema:

### Option A — test data (seconds)

```bash
pnpm db:seed          # ~1000 deterministic synthetic rows
pnpm dev               # web http://localhost:5173 · api http://localhost:3000
```

Search a seeded plate (`ВЕ7116АА` or its Latin spelling `BE7116AA`), a
multi-registration plate (`КА0001АА`), or a real 17-char VIN.

### Option B — real data (hours, ~20 GB)

```bash
pnpm ingest:full       # all 13 years from data.gov.ua + 2026 plate recovery + backfill
pnpm ingest:euroncap:csv   # real Euro NCAP crash-test ratings, from a committed CSV — seconds, no scraping
pnpm ingest:jncap:csv      # real JNCAP (Japan) ratings, from a committed CSV — seconds, no scraping
pnpm ingest:cncap:csv      # real C-NCAP (China) ratings, from a committed CSV — seconds, no fetching
pnpm ingest:kncap:csv      # real KNCAP (Korea) ratings, from a committed CSV — seconds, no fetching
pnpm dev
```

`ingest:full` chains three steps — see [scripts/src/ingest-full.ts](scripts/src/ingest-full.ts)
and [PLAN.md](PLAN.md)'s "2026 plate removal" section for what each does and why:

1. `pnpm ingest` — every CKAN year (2013-2026), largest datasets take minutes each
2. Downloads and ingests an archived pre-redaction 2026 snapshot (government order
   №67/ОД stripped plates from the live 2026 export mid-year — this restores them
   for the months it covers). Best-effort: skipped with a warning if that source
   is temporarily unreachable, the run isn't failed by it.
3. `pnpm ingest -- --backfill-plates` — reconstructs plates for the rest of the
   2026 rows by cross-referencing VIN + registration date across the full history

For a faster real-data taste without the full run, ingest a single year, optionally capped:

```bash
pnpm ingest -- --year 2024 --limit 100000
```

## Database objects

`pnpm db:migrate` creates everything — `registry.registrations` (full history),
`registry.euroncap_ratings`/`jncap_ratings`/`cncap_ratings`/`kncap_ratings`
(one plain table per scraped crash-test source — NHTSA has none, it's
proxied live instead), `registry.ingested_resources` (idempotency
bookkeeping), the static `registry.plate_regions` lookup (populated by the
migration itself, no separate step), and every materialized view
(`current_registration` + ten `stats_by_*` rollups — all created `WITH NO
DATA`, i.e. empty until refreshed). **You don't need a separate refresh
step for a clean setup**: `db:seed`, `ingest`/`ingest:full`, and each
`ingest:*:csv` command refresh everything they touch as the last step of
their own run — the Quick start commands above are the complete recipe.

A standalone refresh is only needed when you add data to an **already-seeded**
DB outside those commands:

- **Added a new `stats_by_*` materialized view** (a new
  `packages/db/migrations/NNNN_*.sql`, same shape as
  `0002_stats_rollups.sql`/`0004_stats_by_brand.sql`, + a line in
  `refreshStats()` in `packages/db/src/client.ts`) — `pnpm db:migrate` creates
  it empty; re-running the hours-long `ingest:full` just to populate it would
  be wasteful, so run `pnpm db:refresh-stats` instead. It rebuilds
  `current_registration` and every `stats_by_*` view from whatever's already
  in `registrations`, touching no source data — seconds, not hours.
- **Updated crash-test rating data** (`pnpm ingest:euroncap`/`ingest:jncap`/
  `ingest:cncap`/`ingest:kncap` picked up new/changed assessments) — each
  `registry.*_ratings` table is a plain table, written directly by that
  scraper's own upsert, so nothing needs refreshing; just re-run the matching
  `pnpm export:*:csv` afterward so the committed
  `scripts/seed-data/*-ratings.csv.gz` snapshot stays current for the next
  zero-scrape setup (see the `ingest:*:csv` commands above).

## Optional features (API keys)

Everything above (plate/VIN search) works with zero external keys. Two
features are optional add-ons, each gated on its own key in `apps/api/.env` —
absent, the app runs fine and that one feature just answers "unavailable":

| Feature                          | Env var                        | Get a free key at                                     |
| -------------------------------- | ------------------------------ | ----------------------------------------------------- |
| Find a plate by photo/camera     | `PLATE_RECOGNIZER_CLOUD_TOKEN` | [platerecognizer.com](https://platerecognizer.com)    |
| "What it might look like" photos | `PIXABAY_API_KEY`              | [pixabay.com/api/docs](https://pixabay.com/api/docs/) |

Add whichever you want to `apps/api/.env` (see `apps/api/.env.example`), then
restart `pnpm dev` — both are read once at process start, so editing `.env`
alone while the dev server is already running has no effect.

## Workspace

| Package           |                                                                            |
| ----------------- | -------------------------------------------------------------------------- |
| `packages/shared` | plate normalization, regions, Zod schemas                                  |
| `packages/db`     | Drizzle schema + client + SQL migrator                                     |
| `apps/api`        | NestJS + Fastify — plate/VIN/safety-ratings endpoints, Swagger, SPA host + meta injection |
| `apps/web`        | Vite + React + React Router                                                |
| `scripts`         | `seed.ts`, `ingest.ts`, `ingest-full.ts`, `refresh-stats.ts`, `euroncap.ts`/`jncap.ts`/`cncap.ts`/`kncap.ts` (crash-test rating scrapers) |

See [CLAUDE.md](CLAUDE.md) for conventions and [PLAN.md](PLAN.md) for the roadmap.

## Scripts

`pnpm dev · build · lint · type-check · test · format` ·
`pnpm db:up · db:down · db:reset · db:migrate · db:seed · db:refresh-stats · ingest · ingest:full` ·
`pnpm ingest:euroncap · ingest:euroncap:csv · export:euroncap:csv` ·
`pnpm ingest:jncap · ingest:jncap:csv · export:jncap:csv` ·
`pnpm ingest:cncap · ingest:cncap:csv · export:cncap:csv` ·
`pnpm ingest:kncap · ingest:kncap:csv · export:kncap:csv`

## License

MIT
