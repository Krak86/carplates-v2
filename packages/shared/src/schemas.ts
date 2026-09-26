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

/** One `{ label, value }` row from JNCAP's own raw test-score breakdown, kept as published. */
export const jncapTestScoreSchema = z.object({
  label: z.string(),
  value: z.string()
})
export type JncapTestScore = z.infer<typeof jncapTestScoreSchema>

/**
 * One JNCAP (Japan, NASVA) assessment — scraped from nasva.go.jp's English mirror and
 * persisted, unlike NHTSA which is fetched live. No public API exists, so this is only as
 * fresh as the last `pnpm ingest:jncap` run. `testScores` carries JNCAP's own test breakdown
 * verbatim — its taxonomy has changed substantially across FY2003-2025, so it isn't forced
 * into fixed per-metric fields the way Euro NCAP's four pillars are. Media stays as source
 * URLs/ids: the vehicle photo is hotlinked from NASVA's own site and the video plays via
 * YouTube's own embed — nothing is downloaded or rehosted.
 */
export const jncapRatingSchema = z.object({
  assessmentId: z.string(),
  /** Link-out target — the official nasva.go.jp assessment detail page. */
  url: z.string(),
  vehicleType: z.string().nullable(),
  ratingYear: z.number().int().nullable(),
  /** 0-5 on JNCAP's current scale; legacy pre-2010ish assessments used a 6-star scale instead
   *  (e.g. a real FY2007 Nissan AD scored "6" outright) — kept as-is rather than compressed,
   *  so the max here is 6, not 5. `formatStars` (apps/web) already falls back to the raw
   *  number for anything it can't render as a 5-glyph bar. */
  stars: z.number().int().min(0).max(6).nullable(),
  overallPct: z.number().int().min(0).max(100).nullable(),
  preventiveRank: z.string().nullable(),
  preventivePct: z.number().int().min(0).max(100).nullable(),
  collisionRank: z.string().nullable(),
  collisionPct: z.number().int().min(0).max(100).nullable(),
  emergencyCallType: z.string().nullable(),
  emergencyCallPct: z.number().int().min(0).max(100).nullable(),
  testScores: z.array(jncapTestScoreSchema),
  imageUrl: z.string().nullable(),
  youtubeId: z.string().regex(YOUTUBE_ID_RE).nullable(),
  reportPdfUrl: z.string().nullable()
})
export type JncapRating = z.infer<typeof jncapRatingSchema>

/** GET /api/safety/jncap?make=&model=&year= — every persisted rating for the make/model, newest first. */
export const jncapRatingsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  ratings: z.array(jncapRatingSchema),
  /** The generation's assessmentId that best matches `year`, or null when none does. */
  applicableAssessmentId: z.string().nullable()
})
export type JncapRatingsResponse = z.infer<typeof jncapRatingsResponseSchema>

/**
 * C-NCAP's own normalized size/body classes (`carKind` in its API) — an enumerable set
 * confirmed against the full real dump (2026-09-25), not guessed. Declared as a const array
 * with the type derived from it (never write both, see CLAUDE_RULES.md) so the ingest-time
 * translation stays exhaustive: a new class the source starts using shows up as a type error,
 * not a silently-dropped value.
 */
export const CNCAP_VEHICLE_CLASSES = [
  'sedan',
  'suv',
  'mpv',
  'van',
  'pickup',
  'midLargeSedan',
  'midLarge',
  'midLargeSuv',
  'aClassSedan',
  'compactSedan',
  'compactSuv',
  'midSuv',
  'smallSuv',
  'largeSuv',
  'smallCar',
  'classAPassenger',
  'classBPassenger',
  'evHev',
  'miniPassenger'
] as const
export type CncapVehicleClass = (typeof CNCAP_VEHICLE_CLASSES)[number]

/**
 * One C-NCAP (China, CATARC) tested car — scraped from c-ncap.org.cn's own JSON API and
 * persisted, unlike NHTSA which is fetched live. C-NCAP has no star rating at all (the source
 * site only ever shows scores), and its scoring shape changed in 2018: `scoreUnit` says
 * whether `overallScore`/the sub-scores are a 0-100 percentage (2018+, three sub-scores) or
 * raw points with no fixed maximum (2006-2018, a single occupant-protection sub-score only) —
 * the two are never comparable, so the UI must always show the unit, never convert one to the
 * other. `nameZh`/`manufacturerZh` keep the source's own Chinese text for display, since
 * `make`/`model` come from a curated translation table (`scripts/src/cncap-names.ts`), not
 * from the source directly — see PLAN.md's C-NCAP section for why.
 */
export const cncapRatingSchema = z.object({
  assessmentId: z.string(),
  nameZh: z.string(),
  manufacturerZh: z.string().nullable(),
  vehicleClass: z.enum(CNCAP_VEHICLE_CLASSES).nullable(),
  ratingYear: z.number().int().nullable(),
  scoreUnit: z.enum(['pct', 'points']),
  overallScore: z.number().nullable(),
  occupantScore: z.number().nullable(),
  vruScore: z.number().nullable(),
  activeSafetyScore: z.number().nullable()
})
export type CncapRating = z.infer<typeof cncapRatingSchema>

/** GET /api/safety/cncap?make=&model=&year= — every persisted rating for the make/model, newest first. */
export const cncapRatingsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  ratings: z.array(cncapRatingSchema),
  /** The generation's assessmentId that best matches `year`, or null when none does. */
  applicableAssessmentId: z.string().nullable()
})
export type CncapRatingsResponse = z.infer<typeof cncapRatingsResponseSchema>

/**
 * One KNCAP (Korea, MOLIT/KoROAD) tested car — scraped from kncap.org's own JSON results
 * catalog (`POST /ncs/KncapResult/selectInitList.json`) and persisted, same rationale as
 * `cncapRatingSchema` above (no stable per-request public API). KNCAP's own `COMPANY_NAME`/
 * `BRAND_NAME` are Korean-only, so `make`/`model` come from a curated translation table
 * (`scripts/src/kncap-names.ts`), not the source directly — `nameKo` keeps the original text
 * for display and re-curation. Unlike C-NCAP, KNCAP does publish a star rating per category
 * (crash/pedestrian/accident-prevention) alongside each category's percentage, plus an overall
 * 1-5 tier (`overallClass`, KNCAP's own "등급") and, for some cars, a 0-100 `overallScore` —
 * left nullable since not every tested car has one published. Data is scraped from the site's
 * "current results" catalog only (2021 onward) — KNCAP's own results search doesn't expose
 * anything older through that endpoint, see PLAN.md's KNCAP section for what a historical
 * (pre-2021) recovery would need.
 */
export const kncapRatingSchema = z.object({
  assessmentId: z.string(),
  nameKo: z.string(),
  ratingYear: z.number().int().nullable(),
  overallScore: z.number().nullable(),
  overallClass: z.number().int().nullable(),
  crashPct: z.number().nullable(),
  crashStar: z.number().int().nullable(),
  pedestrianPct: z.number().nullable(),
  pedestrianStar: z.number().int().nullable(),
  accidentPct: z.number().nullable(),
  accidentStar: z.number().int().nullable(),
  imageUrl: z.string().nullable()
})
export type KncapRating = z.infer<typeof kncapRatingSchema>

/** GET /api/safety/kncap?make=&model=&year= — every persisted rating for the make/model, newest first. */
export const kncapRatingsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  ratings: z.array(kncapRatingSchema),
  /** The generation's assessmentId that best matches `year`, or null when none does. */
  applicableAssessmentId: z.string().nullable()
})
export type KncapRatingsResponse = z.infer<typeof kncapRatingsResponseSchema>

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
