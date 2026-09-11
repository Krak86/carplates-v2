export { normalizePlate, denormalizePlate, isVin, classifyQuery } from './plate.js'
export { REGIONS, regionName } from './regions.js'
export {
  registrationSchema,
  plateLookupResponseSchema,
  plateHistoryResponseSchema,
  vinDecodeResponseSchema,
  vinRegistrySchema,
  apiErrorSchema,
  type Registration,
  type PlateLookupResponse,
  type PlateHistoryResponse,
  type VinDecodeResponse,
  type VinRegistry,
  type ApiError
} from './schemas.js'
