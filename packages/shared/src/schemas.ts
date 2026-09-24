import { z } from 'zod'

/** One vehicle-registration action from the state open-data registry. */
export const registrationSchema = z.object({
  /** null since the 2026 plate-removal (ГСЦ МВС №67/ОД) — such rows key on `vin` instead. */
  plate: z.string().nullable(),
  person: z.string().nullable(),
  regAddrKoatuu: z.string().nullable(),
  operCode: z.number().int().nullable(),
  operName: z.string().nullable(),
  dReg: z.string().nullable(),
  depCode: z.string().nullable(),
  dep: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  vin: z.string().nullable(),
  makeYear: z.number().int().nullable(),
  color: z.string().nullable(),
  kind: z.string().nullable(),
  body: z.string().nullable(),
  purpose: z.string().nullable(),
  fuel: z.string().nullable(),
  capacity: z.number().int().nullable(),
  /** Engine power in kW — 2026+ only; the only engine figure a pure EV has. */
  powerKwt: z.number().int().nullable(),
  ownWeight: z.number().int().nullable(),
  totalWeight: z.number().int().nullable(),
  /** true when `plate` was reconstructed (event/VIN match), not published as-is. */
  plateInferred: z.boolean()
})
export type Registration = z.infer<typeof registrationSchema>

/** GET /api/plate/:plate — latest known registration for a plate. */
export const plateLookupResponseSchema = z.object({
  plate: z.string(),
  region: z.string().nullable(),
  current: registrationSchema,
  historyCount: z.number().int().nonnegative()
})
export type PlateLookupResponse = z.infer<typeof plateLookupResponseSchema>

/** GET /api/plate/:plate/history — every registration action, newest first. */
export const plateHistoryResponseSchema = z.object({
  plate: z.string(),
  region: z.string().nullable(),
  actions: z.array(registrationSchema)
})
export type PlateHistoryResponse = z.infer<typeof plateHistoryResponseSchema>

/** Our own registry rows for a VIN — present when the VIN appears in `registry.registrations`. */
export const vinRegistrySchema = z.object({
  plate: z.string().nullable(),
  plateInferred: z.boolean(),
  actions: z.array(registrationSchema)
})
export type VinRegistry = z.infer<typeof vinRegistrySchema>

/** GET /api/vin/:vin — non-empty variable/value pairs from the NHTSA decoder. */
export const vinDecodeResponseSchema = z.object({
  vin: z.string(),
  results: z.array(z.object({ variable: z.string(), value: z.string() })),
  /** Our own registry data for this VIN, when we have any (undefined otherwise). */
  registry: vinRegistrySchema.optional()
})
export type VinDecodeResponse = z.infer<typeof vinDecodeResponseSchema>

/** One OCR read, already normalized to the canonical plate key. */
export const plateCandidateSchema = z.object({
  plate: z.string(), // canonical Cyrillic, ready for /:query
  raw: z.string(), // provider's raw Latin OCR string
  score: z.number().min(0).max(1)
})
export type PlateCandidate = z.infer<typeof plateCandidateSchema>

/** POST /api/recognize/plate/cloud — plate reads found in an uploaded photo, best first. */
export const plateRecognizeResponseSchema = z.object({ candidates: z.array(plateCandidateSchema).min(1) })
export type PlateRecognizeResponse = z.infer<typeof plateRecognizeResponseSchema>

/** One trim/variant's NHTSA 5-star crash test rating — US-market vehicles only. */
export const safetyRatingSchema = z.object({
  vehicleId: z.number().int(),
  description: z.string(),
  overallRating: z.string().nullable(),
  overallFrontCrashRating: z.string().nullable(),
  frontCrashDriversideRating: z.string().nullable(),
  frontCrashPassengersideRating: z.string().nullable(),
  frontCrashPicture: z.string().nullable(),
  frontCrashVideo: z.string().nullable(),
  overallSideCrashRating: z.string().nullable(),
  sideCrashDriversideRating: z.string().nullable(),
  sideCrashPassengersideRating: z.string().nullable(),
  sideCrashPicture: z.string().nullable(),
  sideCrashVideo: z.string().nullable(),
  rolloverRating: z.string().nullable(),
  rolloverRating2: z.string().nullable(),
  rolloverPossibility: z.number().nullable(),
  rolloverPossibility2: z.number().nullable(),
  /** Whether the vehicle tipped up during the dynamic rollover-avoidance maneuver, e.g. "No Tip". */
  dynamicTipResult: z.string().nullable(),
  sidePoleCrashRating: z.string().nullable(),
  sidePolePicture: z.string().nullable(),
  sidePoleVideo: z.string().nullable(),
  /** Older/secondary side-impact sub-scores, alongside overallSideCrashRating and sidePoleCrashRating above. */
  combinedSideBarrierAndPoleRatingFront: z.string().nullable(),
  combinedSideBarrierAndPoleRatingRear: z.string().nullable(),
  sideBarrierRatingOverall: z.string().nullable(),
  electronicStabilityControl: z.string().nullable(),
  forwardCollisionWarning: z.string().nullable(),
  laneDepartureWarning: z.string().nullable(),
  complaintsCount: z.number().int().nullable(),
  recallsCount: z.number().int().nullable(),
  investigationCount: z.number().int().nullable()
})
export type SafetyRating = z.infer<typeof safetyRatingSchema>

/** GET /api/safety?make=&model=&year= — NHTSA ratings for every matching trim/variant, empty when none exist. */
export const safetyRatingsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  ratings: z.array(safetyRatingSchema)
})
export type SafetyRatingsResponse = z.infer<typeof safetyRatingsResponseSchema>

const EURONCAP_IMAGE_URL_RE = /^https:\/\/data-cdn\.euroncap\.com\/media\/assessment-media\/[\w-]+\/[\w.-]+\.webp$/
const YOUTUBE_ID_RE = /^[\w-]{11}$/

/** One Euro NCAP crash-test carousel image — always hotlinked from Euro NCAP's own CDN, never rehosted. */
export const euroNcapImageSchema = z.object({
  url: z.string().regex(EURONCAP_IMAGE_URL_RE),
  /** Test code parsed from the filename, e.g. "MPDB", "FW", "O2O1" — null when it can't be parsed. */
  test: z.string().nullable()
})
export type EuroNcapImage = z.infer<typeof euroNcapImageSchema>

/**
 * One Euro NCAP assessment (one tested variant/generation) — scraped from euroncap.com and
 * persisted, unlike NHTSA which is fetched live. No API exists, so `stars`/percentages are
 * only as fresh as the last `pnpm ingest:euroncap` run. Media stays as source URLs/ids: crash
 * images are hotlinked from Euro NCAP's CDN and videos play via YouTube's own embed — nothing
 * is downloaded or rehosted (their media is copyrighted; only the factual scores are ours to store).
 */
export const euroNcapRatingSchema = z.object({
  assessmentId: z.string(),
  /** Link-out target — the official euroncap.com report page. */
  url: z.string(),
  /** The tested trim/variant, e.g. "Mercedes-Benz CLA 250+ AMG Line" — this row's headline label. */
  testedVariant: z.string().nullable(),
  bodyType: z.string().nullable(),
  ratingYear: z.number().int().nullable(),
  /** Null when the page doesn't expose a star count in markup (rare, older protocols). */
  stars: z.number().int().min(0).max(5).nullable(),
  adultOccupantPct: z.number().int().min(0).max(100).nullable(),
  childOccupantPct: z.number().int().min(0).max(100).nullable(),
  vulnerableRoadUsersPct: z.number().int().min(0).max(100).nullable(),
  safetyAssistPct: z.number().int().min(0).max(100).nullable(),
  /** True for a "Safety Pack"/optional-equipment variant of the same generation. */
  safetyPack: z.boolean(),
  /** The frontal ("_0_") carousel shot, used as the row thumbnail when present. */
  frontImageUrl: z.string().regex(EURONCAP_IMAGE_URL_RE).nullable(),
  images: z.array(euroNcapImageSchema),
  youtubeIds: z.array(z.string().regex(YOUTUBE_ID_RE)),
  reportPdfUrl: z.string().nullable()
})
export type EuroNcapRating = z.infer<typeof euroNcapRatingSchema>

/** GET /api/safety/euroncap?make=&model=&year= — every persisted rating for the make/model, newest first. */
export const euroNcapRatingsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  ratings: z.array(euroNcapRatingSchema),
  /** The generation's assessmentId that best matches `year`, or null when none does. */
  applicableAssessmentId: z.string().nullable()
})
export type EuroNcapRatingsResponse = z.infer<typeof euroNcapRatingsResponseSchema>

/** One stock photo from Pixabay, filtered to only what the UI needs. */
export const vehiclePhotoSchema = z.object({
  id: z.number().int(),
  previewURL: z.string(),
  webformatURL: z.string(),
  pageURL: z.string(),
  tags: z.string(),
  user: z.string()
})
export type VehiclePhoto = z.infer<typeof vehiclePhotoSchema>

/** GET /api/photos — illustrative brand/model/year stock photos, not the specific registered vehicle. */
export const vehiclePhotosResponseSchema = z.object({
  query: z.string(),
  images: z.array(vehiclePhotoSchema)
})
export type VehiclePhotosResponse = z.infer<typeof vehiclePhotosResponseSchema>

/** Shared count fields for every stats rollup row. */
export const statsMetricsSchema = z.object({
  totalRows: z.number().int().nonnegative(),
  distinctPlates: z.number().int().nonnegative(),
  distinctVins: z.number().int().nonnegative()
})
export type StatsMetrics = z.infer<typeof statsMetricsSchema>

export const statsByYearRowSchema = statsMetricsSchema.extend({ year: z.number().int().nullable() })
export type StatsByYearRow = z.infer<typeof statsByYearRowSchema>

export const statsByRegionRowSchema = statsMetricsSchema.extend({ region: z.string() })
export type StatsByRegionRow = z.infer<typeof statsByRegionRowSchema>

export const statsByRegionYearRowSchema = statsMetricsSchema.extend({
  region: z.string(),
  year: z.number().int().nullable()
})
export type StatsByRegionYearRow = z.infer<typeof statsByRegionYearRowSchema>

/** A by-body / by-kind / by-color / by-fuel / by-brand rollup row — one free-text dimension value, null for unset rows. */
export const statsByDimensionRowSchema = statsMetricsSchema.extend({ value: z.string().nullable() })
export type StatsByDimensionRow = z.infer<typeof statsByDimensionRowSchema>

export const statsByBrandYearRowSchema = statsMetricsSchema.extend({
  brand: z.string().nullable(),
  year: z.number().int().nullable()
})
export type StatsByBrandYearRow = z.infer<typeof statsByBrandYearRowSchema>

/** GET /api/stats — everything the stats table (and, later, the map) needs; fetched once and filtered client-side. */
export const statsResponseSchema = z.object({
  summary: statsMetricsSchema.extend({ plateless: z.number().int().nonnegative() }),
  byYear: z.array(statsByYearRowSchema),
  byRegion: z.array(statsByRegionRowSchema),
  byRegionYear: z.array(statsByRegionYearRowSchema),
  byBody: z.array(statsByDimensionRowSchema),
  byKind: z.array(statsByDimensionRowSchema),
  byColor: z.array(statsByDimensionRowSchema),
  byFuel: z.array(statsByDimensionRowSchema),
  byBrand: z.array(statsByDimensionRowSchema),
  byBrandYear: z.array(statsByBrandYearRowSchema)
})
export type StatsResponse = z.infer<typeof statsResponseSchema>

/** Typed error body returned by the API exception filter. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string()
})
export type ApiError = z.infer<typeof apiErrorSchema>
