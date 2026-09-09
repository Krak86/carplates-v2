export * as schema from './schema.js'
export {
  registry,
  registrations,
  currentRegistration,
  ingestedResources,
  type RegistrationRow,
  type RegistrationInsert,
  type IngestedResourceRow
} from './schema.js'
export { createDb, resolveDatabaseUrl, refreshCurrentRegistration, LOCAL_DATABASE_URL, type Db } from './client.js'
export { runMigrations } from './migrate.js'
