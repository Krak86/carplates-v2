import { defineConfig } from 'drizzle-kit'

// Used only by `drizzle-kit generate` (schema-diff SQL) and `drizzle-kit studio`.
// Migrations are applied by `src/migrate.ts` (see its header for why).
const url = process.env.DATABASE_URL ?? 'postgres://carplates:carplates@localhost:5432/carplates'

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  schemaFilter: ['registry'],
  verbose: true,
  strict: true
})
