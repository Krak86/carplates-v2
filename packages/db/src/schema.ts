import { sql } from 'drizzle-orm'
import { bigserial, boolean, date, index, integer, pgSchema, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

/**
 * All derived, read-only registry data lives in the `registry` schema so the
 * future `app` schema (accounts, favorites — Phase 5) can be added without
 * moving anything.
 */
export const registry = pgSchema('registry')

/** One vehicle-registration action from the data.gov.ua open dataset. */
export const registrations = registry.table(
  'registrations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /**
     * Normalized (Cyrillic, no spaces/slashes) — the query key. Nullable since
     * the 2026 ГСЦ МВС order №67/ОД (2026-06-29) stopped publishing plates; such
     * rows carry `vin` instead (`ck_reg_identity` requires one or the other).
     */
    plate: text('plate'),
    person: text('person'),
    regAddrKoatuu: text('reg_addr_koatuu'),
    operCode: integer('oper_code'),
    operName: text('oper_name'),
    dReg: date('d_reg'),
    depCode: text('dep_code'),
    dep: text('dep'),
    brand: text('brand'),
    model: text('model'),
    vin: text('vin'),
    makeYear: integer('make_year'),
    color: text('color'),
    kind: text('kind'),
    body: text('body'),
    purpose: text('purpose'),
    fuel: text('fuel'),
    capacity: integer('capacity'),
    /** Engine power in kW — added in the 2026 layout; the only engine figure a pure EV has. */
    powerKwt: integer('power_kwt'),
    ownWeight: integer('own_weight'),
    totalWeight: integer('total_weight'),
    /** true when `plate` was reconstructed (VIN/event match), not published as-is. */
    plateInferred: boolean('plate_inferred').notNull().default(false),
    /** CKAN resource id this row was ingested from */
    sourceResourceId: text('source_resource_id')
  },
  t => [
    index('ix_reg_plate').on(t.plate, t.dReg.desc()),
    index('ix_reg_vin')
      .on(t.vin)
      .where(sql`${t.vin} is not null`),
    // The real constraints (partial + NULLS NOT DISTINCT, PG15+) are created in
    // migrations/0001_plateless_and_power.sql — drizzle 0.45's builder can't
    // express WHERE-qualified unique indexes or that modifier together.
    uniqueIndex('ux_reg_dedupe').on(t.plate, t.dReg, t.operCode, t.vin),
    uniqueIndex('ux_reg_dedupe_vin').on(t.vin, t.dReg, t.operCode)
  ]
)
export type RegistrationRow = typeof registrations.$inferSelect
export type RegistrationInsert = typeof registrations.$inferInsert

/**
 * Latest known registration per plate — DISTINCT ON (plate) ORDER BY plate, d_reg DESC.
 * Managed by SQL migration (the DISTINCT ON is not expressible in the query
 * builder); declared `.existing()` here purely for typed reads.
 */
export const currentRegistration = registry
  .materializedView('current_registration', {
    plate: text('plate').notNull(),
    person: text('person'),
    regAddrKoatuu: text('reg_addr_koatuu'),
    operCode: integer('oper_code'),
    operName: text('oper_name'),
    dReg: date('d_reg'),
    depCode: text('dep_code'),
    dep: text('dep'),
    brand: text('brand'),
    model: text('model'),
    vin: text('vin'),
    makeYear: integer('make_year'),
    color: text('color'),
    kind: text('kind'),
    body: text('body'),
    purpose: text('purpose'),
    fuel: text('fuel'),
    capacity: integer('capacity'),
    powerKwt: integer('power_kwt'),
    ownWeight: integer('own_weight'),
    totalWeight: integer('total_weight'),
    plateInferred: boolean('plate_inferred').notNull()
  })
  .existing()

/** Incremental-ingest bookkeeping: which CKAN resources have been loaded. */
export const ingestedResources = registry.table('ingested_resources', {
  ckanResourceId: text('ckan_resource_id').primaryKey(),
  name: text('name'),
  url: text('url'),
  lastModified: timestamp('last_modified', { withTimezone: true }),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
  rowCount: integer('row_count')
})
export type IngestedResourceRow = typeof ingestedResources.$inferSelect
