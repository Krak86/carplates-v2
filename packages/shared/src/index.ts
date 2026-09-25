export { normalizePlate, denormalizePlate, isVin, classifyQuery, repairOcrPlate } from './plate.js'
export { REGIONS, regionName } from './regions.js'
export { VEHICLE_KINDS, resolveVehicleKind, type VehicleKind } from './vehicleKind.js'
export {
  VEHICLE_COLORS,
  VEHICLE_COLOR_HEX,
  VEHICLE_COLOR_SHADOW_HEX,
  resolveVehicleColor,
  fallbackVehicleColor,
  type VehicleColor
} from './vehicleColor.js'
export { brandLogoUrl, brandSlug } from './brandLogo.js'
export { dealerUrl } from './dealerUrl.js'
export { makeKey, modelKey } from './vehicleKey.js'
export {
  registrationSchema,
  plateLookupResponseSchema,
  plateHistoryResponseSchema,
  vinDecodeResponseSchema,
  vinRegistrySchema,
  apiErrorSchema,
  plateCandidateSchema,
  plateRecognizeResponseSchema,
  vehiclePhotoSchema,
  vehiclePhotosResponseSchema,
  safetyRatingSchema,
  safetyRatingsResponseSchema,
  euroNcapRatingSchema,
  euroNcapRatingsResponseSchema,
  statsMetricsSchema,
  statsByYearRowSchema,
  statsByRegionRowSchema,
  statsByRegionYearRowSchema,
  statsByDimensionRowSchema,
  statsResponseSchema,
  type Registration,
  type PlateLookupResponse,
  type PlateHistoryResponse,
  type VinDecodeResponse,
  type VinRegistry,
  type ApiError,
  type PlateCandidate,
  type PlateRecognizeResponse,
  type VehiclePhoto,
  type VehiclePhotosResponse,
  type SafetyRating,
  type SafetyRatingsResponse,
  type EuroNcapRating,
  type EuroNcapRatingsResponse,
  type StatsMetrics,
  type StatsByYearRow,
  type StatsByRegionRow,
  type StatsByRegionYearRow,
  type StatsByDimensionRow,
  type StatsResponse
} from './schemas.js'
