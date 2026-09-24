export * as schema from './schema.js'
export {
  registry,
  registrations,
  currentRegistration,
  statsSummary,
  statsByYear,
  statsByRegion,
  statsByRegionYear,
  statsByBody,
  statsByKind,
  statsByColor,
  statsByFuel,
  statsByBrand,
  statsByBrandYear,
  ingestedResources,
  type RegistrationRow,
  type RegistrationInsert,
  type IngestedResourceRow
} from './schema.js'
export {
  createDb,
  resolveDatabaseUrl,
  refreshCurrentRegistration,
  refreshStats,
  LOCAL_DATABASE_URL,
  type Db
} from './client.js'
export { runMigrations } from './migrate.js'
