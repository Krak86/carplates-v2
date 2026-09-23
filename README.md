# carplates-v2

Ukrainian vehicle lookup by **plate number** or **VIN**. Rebuild of
[carsua.app](https://carsua.app).

- Plate data: the state open-data registry ([data.gov.ua](https://data.gov.ua/dataset/06779371-308f-42d7-895e-5a39833375f0)) → Postgres
- VIN data: [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/vehicles/decodevin) (proxied)

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

## Optional features (API keys)

Everything above (plate/VIN search) works with zero external keys. Two
features are optional add-ons, each gated on its own key in `apps/api/.env` —
absent, the app runs fine and that one feature just answers "unavailable":

| Feature                          | Env var                       | Get a free key at                                                         |
| --------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| Find a plate by photo/camera      | `PLATE_RECOGNIZER_CLOUD_TOKEN` | [platerecognizer.com](https://platerecognizer.com)                        |
| "What it might look like" photos  | `PIXABAY_API_KEY`              | [pixabay.com/api/docs](https://pixabay.com/api/docs/)                     |

Add whichever you want to `apps/api/.env` (see `apps/api/.env.example`), then
restart `pnpm dev` — both are read once at process start, so editing `.env`
alone while the dev server is already running has no effect.

## Workspace

| Package           |                                                                            |
| ----------------- | -------------------------------------------------------------------------- |
| `packages/shared` | plate normalization, regions, Zod schemas                                  |
| `packages/db`     | Drizzle schema + client + SQL migrator                                     |
| `apps/api`        | NestJS + Fastify — plate/VIN endpoints, Swagger, SPA host + meta injection |
| `apps/web`        | Vite + React + React Router                                                |
| `scripts`         | `seed.ts`, `ingest.ts`, `ingest-full.ts`                                    |

See [CLAUDE.md](CLAUDE.md) for conventions and [PLAN.md](PLAN.md) for the roadmap.

## Scripts

`pnpm dev · build · lint · type-check · test · format` ·
`pnpm db:up · db:down · db:reset · db:migrate · db:seed · ingest · ingest:full`

## License

MIT
