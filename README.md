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
pnpm db:seed          # ~1000 synthetic rows
pnpm dev              # web http://localhost:5173 · api http://localhost:3000
```

Search a seeded plate (`ВЕ7116АА` or its Latin spelling `BE7116AA`), a
multi-registration plate (`КА0001АА`), or a real 17-char VIN.

For real data instead of the seed:

```bash
pnpm ingest -- --year 2026 --limit 100000
```

## Workspace

| Package           |                                                                            |
| ----------------- | -------------------------------------------------------------------------- |
| `packages/shared` | plate normalization, regions, Zod schemas                                  |
| `packages/db`     | Drizzle schema + client + SQL migrator                                     |
| `apps/api`        | NestJS + Fastify — plate/VIN endpoints, Swagger, SPA host + meta injection |
| `apps/web`        | Vite + React + React Router                                                |
| `scripts`         | `seed.ts`, `ingest.ts`                                                     |

See [CLAUDE.md](CLAUDE.md) for conventions and [PLAN.md](PLAN.md) for the roadmap.

## Scripts

`pnpm dev · build · lint · type-check · test · format` ·
`pnpm db:up · db:down · db:reset · db:migrate · db:seed · ingest`

## License

MIT
