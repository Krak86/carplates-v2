export { normalizePlate, denormalizePlate, isVin, classifyQuery } from './plate.js'
export { REGIONS, regionName } from './regions.js'
export {
  registrationSchema,
  plateLookupResponseSchema,
  plateHistoryResponseSchema,
  vinDecodeResponseSchema,
  apiErrorSchema,
  type Registration,
  type PlateLookupResponse,
  type PlateHistoryResponse,
  type VinDecodeResponse,
  type ApiError
} from './schemas.js'
