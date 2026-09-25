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
  euroncapRatings,
  jncapRatings,
  cncapRatings,
  type RegistrationRow,
  type RegistrationInsert,
  type IngestedResourceRow,
  type EuroncapRatingRow,
  type EuroncapRatingInsert,
  type JncapRatingRow,
  type JncapRatingInsert,
  type CncapRatingRow,
  type CncapRatingInsert
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
