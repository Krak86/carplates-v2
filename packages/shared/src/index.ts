export { normalizePlate, denormalizePlate, isVin, classifyQuery, repairOcrPlate } from './plate.js'
export { REGIONS, regionName } from './regions.js'
export {
  registrationSchema,
  plateLookupResponseSchema,
  plateHistoryResponseSchema,
  vinDecodeResponseSchema,
  vinRegistrySchema,
  apiErrorSchema,
  plateCandidateSchema,
  plateRecognizeResponseSchema,
  type Registration,
  type PlateLookupResponse,
  type PlateHistoryResponse,
  type VinDecodeResponse,
  type VinRegistry,
  type ApiError,
  type PlateCandidate,
  type PlateRecognizeResponse
} from './schemas.js'
