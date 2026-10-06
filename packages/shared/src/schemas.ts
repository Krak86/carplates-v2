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
  historyCount: z.number().int().nonnegative(),
  /** Estimated owners over the (plate/VIN-stitched) history — see `countOwners`. */
  ownersCount: z.number().int().nonnegative()
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

/** A rectangle in a photo, as fractions (0-1) of its width/height. */
export const photoBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1)
})

/** One OCR read, already normalized to the canonical plate key. */
export const plateCandidateSchema = z.object({
  plate: z.string(), // canonical Cyrillic, ready for /:query
  raw: z.string(), // provider's raw Latin OCR string
  score: z.number().min(0).max(1),
  // Where the plate sits in the uploaded photo, as fractions (0-1) of its width/height so it's
  // independent of any client-side resize. Only the self-hosted ALPR reports it.
  box: photoBoxSchema.optional()
})
export type PlateCandidate = z.infer<typeof plateCandidateSchema>

/** EXIF facts read client-side from an uploaded photo before it is downscaled (which drops them). */
export const photoMetaSchema = z.object({
  takenAt: z.date().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable()
})
export type PhotoMeta = z.infer<typeof photoMetaSchema>

/** POST /api/recognize/plate/cloud — plate reads found in an uploaded photo, best first. */
export const plateRecognizeResponseSchema = z.object({ candidates: z.array(plateCandidateSchema).min(1) })
export type PlateRecognizeResponse = z.infer<typeof plateRecognizeResponseSchema>

/** POST /api/recognize/vin — VIN reads found in an uploaded photo, best first. */
export const vinRecognizeResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        vin: z.string().length(17),
        score: z.number().min(0).max(1),
        checkDigitOk: z.boolean(),
        /** Where the VIN sits in the uploaded photo (the self-hosted OCR reports it). */
        box: photoBoxSchema.optional()
      })
    )
    .min(1)
})
export type VinRecognizeResponse = z.infer<typeof vinRecognizeResponseSchema>

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

/** One test entry inside an IIHS assessment's `tests` array — see `iihsRatingSchema`. */
export const iihsTestSchema = z.object({
  key: z.string(),
  label: z.string(),
  /** IIHS's own word (Good/Acceptable/Marginal/Poor, or Superior/Advanced/Basic for the older
   *  front-crash-prevention scale — see PLAN.md's IIHS section), or null if not rated. */
  rating: z.string().nullable(),
  /** The "Standard system"/"Optional system" availability text next to a crash-prevention test. */
  qualifier: z.string().nullable()
})
export type IihsTest = z.infer<typeof iihsTestSchema>

/**
 * One IIHS (US, insurance-industry-funded) vehicle model-year assessment — scraped from
 * iihs.org's own server-rendered detail pages and persisted, same rationale as `cncapRatingSchema`
 * above (no stable per-request public API). IIHS rates each body variant of a model-year
 * separately (a sedan and a hatchback of the same nameplate each get their own row), so unlike
 * the other four sources this carries its own `variantType`/`vehicleClass`/`modelYear` rather
 * than relying solely on the query's make/model/year — the API's body-style filter (mirrors
 * NHTSA's) narrows `ratings` down to the variant that matches the registry car. `tests` is a
 * source-shaped array, not fixed columns, because IIHS's tested-criteria set changes by era (see
 * PLAN.md).
 */
export const iihsRatingSchema = z.object({
  assessmentId: z.string(),
  variantType: z.string(),
  vehicleClass: z.string().nullable(),
  modelYear: z.number().int(),
  /** "TSP" / "TSP+" (Top Safety Pick / Top Safety Pick+), or null. */
  award: z.string().nullable(),
  tests: z.array(iihsTestSchema),
  imageUrl: z.string().nullable()
})
export type IihsRating = z.infer<typeof iihsRatingSchema>

/**
 * GET /api/safety/iihs?make=&model=&year= — every persisted rating for the make/model, newest
 * first. `applicableAssessmentIds` is an array, unlike the other four sources' single
 * `applicableAssessmentId` — IIHS can have more than one variant applicable to the same car's
 * model year at once (e.g. a car whose registry data doesn't disambiguate sedan vs. hatchback).
 */
export const iihsRatingsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  ratings: z.array(iihsRatingSchema),
  applicableAssessmentIds: z.array(z.string())
})
export type IihsRatingsResponse = z.infer<typeof iihsRatingsResponseSchema>

/**
 * Fuel consumption + tailpipe CO2 estimate for "similar vehicles" (same make/model, nearby year, matching fuel and
 * powertrain), aggregated to a min–max range over every matched reference row. `cycle` is the test procedure the
 * numbers come from and must always be shown next to them. `estimate` is null when nothing matched.
 */
export const fuelEconomyEstimateSchema = z.object({
  source: z.string(),
  cycle: z.string(),
  modelYear: z.number().int(),
  matches: z.number().int(),
  co2GKmMin: z.number(),
  co2GKmMax: z.number(),
  l100kmMin: z.number().nullable(),
  l100kmMax: z.number().nullable(),
  evKwh100km: z.number().nullable()
})
export type FuelEconomyEstimate = z.infer<typeof fuelEconomyEstimateSchema>

export const fuelEconomyResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  estimate: fuelEconomyEstimateSchema.nullable()
})
export type FuelEconomyResponse = z.infer<typeof fuelEconomyResponseSchema>

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

/** Author/license credit for a wiki-sourced vehicle image — Commons requires attribution for CC-BY/CC-BY-SA (never for public domain), so fields are null when Commons exposes none or the image has none. */
export const wikiImageAttributionSchema = z.object({
  author: z.string().nullable(),
  license: z.string().nullable(),
  licenseUrl: z.string().nullable()
})
export type WikiImageAttribution = z.infer<typeof wikiImageAttributionSchema>

export const wikiImageSchema = z.object({
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  attribution: wikiImageAttributionSchema.nullable()
})
export type WikiImage = z.infer<typeof wikiImageSchema>

/** GET /api/wiki?brand=&model=&lang= — best-effort Wikipedia article match for a brand/model. Live-fetched
 *  (unlike the NCAP sources, nothing here is persisted) and cached in-process, same rationale as `photos.service.ts`. */
export const wikiInfoResponseSchema = z.object({
  query: z.string(),
  found: z.boolean(),
  title: z.string().nullable(),
  extract: z.string().nullable(),
  pageUrl: z.string().nullable(),
  image: wikiImageSchema.nullable()
})
export type WikiInfo = z.infer<typeof wikiInfoResponseSchema>

/** GET /api/wiki/image?brand=&model=&year= — the hero photo alone: stored `wiki_image` row first, live Commons/Wikipedia
 *  lookup only when nothing is stored. No article text, so the first paint never waits on a live Wikipedia request. */
export const wikiImageResponseSchema = z.object({ image: wikiImageSchema.nullable() })
export type WikiImageResponse = z.infer<typeof wikiImageResponseSchema>

/** GET /api/reviews?brand=&model=&year= — links into infocar.ua's persisted catalog (`pnpm ingest:infocar`), per tree:
 *  the best version page for the year, the model page, or the brand page; `null` when the catalog has no such brand. */
export const infocarVersionLinkSchema = z.object({
  name: z.string(),
  yearFrom: z.number().int().nullable(),
  yearTo: z.number().int().nullable(),
  url: z.string()
})
export const infocarMatchSchema = z.object({
  level: z.enum(['version', 'model', 'brand']),
  url: z.string(),
  modelName: z.string().nullable(),
  versions: z.array(infocarVersionLinkSchema),
  reviewCount: z.number().int().nullable(),
  avgRating: z.number().nullable(),
  yearUrl: z.string().nullable()
})
/** An infocar.ua video (persisted by `pnpm ingest:infocar:videos`) for this car's make/model; embedded from YouTube. */
export const infocarVideoSchema = z.object({
  youtubeId: z.string(),
  title: z.string(),
  thumbUrl: z.string().nullable(),
  durationS: z.number().int().nullable(),
  publishedAt: z.string().nullable(),
  url: z.string()
})
/** An e-drive.com.ua owner post (persisted by `pnpm ingest:edrive`) filed under this car's make/model/generation. */
export const ownerPostSchema = z.object({
  postId: z.number().int(),
  url: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  coverUrl: z.string().nullable(),
  createdAt: z.string().nullable()
})
/** A TopGear UK editorial review (persisted by `pnpm ingest:topgear`) of this car's make/model: score out of `bestRating`, link and blurb only. */
export const topgearReviewSchema = z.object({
  url: z.string(),
  title: z.string(),
  rating: z.number().nullable(),
  bestRating: z.number().nullable(),
  publishedAt: z.string().nullable(),
  blurb: z.string().nullable()
})
/** A tech-press test drive (itc.ua / mezha.ua, persisted by `pnpm ingest:press`): one entry per language edition (`uk`/`ru`/`en`), link + title + blurb only. */
export const pressReviewSchema = z.object({
  url: z.string(),
  source: z.enum(['itc', 'mezha']),
  publishedAt: z.string().nullable(),
  langs: z.partialRecord(
    z.enum(['uk', 'ru', 'en']),
    z.object({ url: z.string(), title: z.string(), blurb: z.string().nullable() })
  )
})
export const reviewsResponseSchema = z.object({
  testDrive: infocarMatchSchema.nullable(),
  reviews: infocarMatchSchema.nullable(),
  videos: z.array(infocarVideoSchema),
  ownerPosts: z.array(ownerPostSchema),
  topgear: z.array(topgearReviewSchema),
  press: z.array(pressReviewSchema)
})
export type ReviewsResponse = z.infer<typeof reviewsResponseSchema>

/** A Sketchfab 3D model (persisted by `pnpm ingest:sketchfab`) of this car's make/model; embedded from Sketchfab. */
export const model3dSchema = z.object({
  uid: z.string(),
  name: z.string(),
  year: z.number().int().nullable(),
  authorName: z.string(),
  authorUrl: z.string(),
  thumbUrl: z.string().nullable(),
  viewCount: z.number().int(),
  likeCount: z.number().int(),
  license: z.string().nullable()
})
export const models3dResponseSchema = z.object({ models: z.array(model3dSchema) })
export type Model3d = z.infer<typeof model3dSchema>
export type Models3dResponse = z.infer<typeof models3dResponseSchema>

/** A CarShow360 360° gallery (persisted by `pnpm ingest:carshow360`) of this car's make/model; embedded from carshow360.net. */
export const model360Schema = z.object({
  id: z.number().int(),
  /** URL slugs — together with `id` they build the embed URL. */
  brandSlug: z.string(),
  modelSlug: z.string(),
  slug: z.string(),
  /** Generation/trim text from the URL slug, e.g. "III FL2021 Hatchback". */
  label: z.string(),
  /** Page title when the optional --enrich pass has fetched it. */
  title: z.string().nullable()
})
export const models360ResponseSchema = z.object({ models: z.array(model360Schema) })
export type Model360 = z.infer<typeof model360Schema>
export type Models360Response = z.infer<typeof models360ResponseSchema>

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

/** One brand+model pair — only ever the top few by distinctPlates, see statsResponseSchema.topModels. */
export const statsByModelRowSchema = statsMetricsSchema.extend({
  brand: z.string(),
  model: z.string()
})
export type StatsByModelRow = z.infer<typeof statsByModelRowSchema>

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
  byBrandYear: z.array(statsByBrandYearRowSchema),
  /** Imported vs. dealer-bought-domestic — see stats_by_origin's migration comment. */
  byOrigin: z.array(statsByDimensionRowSchema),
  /** Top 5 brand+model pairs by distinctPlates — not a full dimension, see stats_by_model's migration comment. */
  topModels: z.array(statsByModelRowSchema)
})
export type StatsResponse = z.infer<typeof statsResponseSchema>

export const STATS_FIELD_DIMENSIONS = ['body', 'kind', 'color', 'fuel'] as const
export type StatsFieldDimension = (typeof STATS_FIELD_DIMENSIONS)[number]
export const statsFieldDimensionSchema = z.enum(STATS_FIELD_DIMENSIONS)

/** GET /api/stats/field/:dimension — one free-text dimension's full breakdown, for the ResultCard "?" popovers. */
export const statsFieldResponseSchema = z.array(statsByDimensionRowSchema)
export type StatsFieldResponse = z.infer<typeof statsFieldResponseSchema>

/** GET /api/stats/version — opaque token that changes whenever an ingest, stats refresh or ratings load does. */
export const dataVersionResponseSchema = z.object({ dataVersion: z.string() })
export type DataVersionResponse = z.infer<typeof dataVersionResponseSchema>

/** One brand and its registered-plate count, ranked by `stats_by_brand` — for the advanced-search autocomplete. */
export const brandSuggestionSchema = z.object({
  brand: z.string(),
  distinctPlates: z.number().int().nonnegative()
})
export type BrandSuggestion = z.infer<typeof brandSuggestionSchema>

/** GET /api/search/brands?q= — top-10 matching brands by distinctPlates, so a popular real spelling outranks ingest noise. */
export const brandSuggestionsResponseSchema = z.object({ suggestions: z.array(brandSuggestionSchema) })
export type BrandSuggestionsResponse = z.infer<typeof brandSuggestionsResponseSchema>

/** One model (scoped to a single brand) and its registered-plate count, ranked by `stats_by_model`. */
export const modelSuggestionSchema = z.object({
  model: z.string(),
  distinctPlates: z.number().int().nonnegative()
})
export type ModelSuggestion = z.infer<typeof modelSuggestionSchema>

/** GET /api/search/models?brand=&q= — top-10 matching models for one brand, same ranking rationale as brand suggestions. */
export const modelSuggestionsResponseSchema = z.object({ suggestions: z.array(modelSuggestionSchema) })
export type ModelSuggestionsResponse = z.infer<typeof modelSuggestionsResponseSchema>

/**
 * One `current_registration` row matching an advanced-search filter set — enough to identify
 * and link to the plate. `plate` is never null here (unlike `registrationSchema`): this view is
 * keyed `DISTINCT ON (plate)`, so a plateless (2026+ order №67/ОД) row never appears in it.
 */
export const searchResultRowSchema = z.object({
  plate: z.string(),
  vin: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  makeYear: z.number().int().nullable(),
  color: z.string().nullable(),
  fuel: z.string().nullable(),
  dReg: z.string().nullable()
})
export type SearchResultRow = z.infer<typeof searchResultRowSchema>

/** GET /api/search?brand=&model=&yearFrom=&yearTo=&fuel=&color=&kind=&page=&pageSize= — filtered, paginated `current_registration` rows. */
export const searchResponseSchema = z.object({
  results: z.array(searchResultRowSchema),
  /** Capped for a very broad match (see search.service.ts) — check `totalIsExact` before treating this as the real count. */
  total: z.number().int().nonnegative(),
  /** False means `total` is a floor ("at least this many"), not the real count — an exact COUNT(*) over a huge match is too slow to run on every search. */
  totalIsExact: z.boolean(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive()
})
export type SearchResponse = z.infer<typeof searchResponseSchema>

/** Typed error body returned by the API exception filter. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string()
})
export type ApiError = z.infer<typeof apiErrorSchema>

/**
 * /fuel statistics page payload — every figure comes from `registry.stats_fuel` (passenger cars only). `avgCo2` is the
 * registration-weighted mean of the matched estimate's midpoint; `matched` counts cars that have an estimate at all,
 * so a row's coverage is `matched / n`.
 */
export const fuelStatsRowSchema = z.object({
  label: z.string(),
  n: z.number().int(),
  matched: z.number().int(),
  avgCo2: z.number().nullable()
})
export type FuelStatsRow = z.infer<typeof fuelStatsRowSchema>

export const fuelStatsModelSchema = z.object({
  brand: z.string(),
  model: z.string(),
  n: z.number().int(),
  avgCo2: z.number()
})
export type FuelStatsModel = z.infer<typeof fuelStatsModelSchema>

export const fuelStatsResponseSchema = z.object({
  total: z.number().int(),
  matched: z.number().int(),
  fleetAvgCo2: z.number().nullable(),
  byYear: z.array(fuelStatsRowSchema),
  byBrand: z.array(fuelStatsRowSchema),
  byFuelClass: z.array(fuelStatsRowSchema),
  cleanestModels: z.array(fuelStatsModelSchema),
  dirtiestModels: z.array(fuelStatsModelSchema),
  /** Matched cars per CO2 band: `from` (inclusive) to `from + bandWidth`. */
  distribution: z.array(z.object({ from: z.number().int(), n: z.number().int() })),
  bandWidth: z.number().int()
})
export type FuelStatsResponse = z.infer<typeof fuelStatsResponseSchema>

// Crash-rating statistics (/safety page) — see crashScore.ts for how the five sources are combined.
export const safetyStatsRowSchema = z.object({
  label: z.string(),
  n: z.number().int(),
  /** Cars in this row that have at least one crash rating. */
  matched: z.number().int(),
  avgScore: z.number().nullable()
})
export type SafetyStatsRow = z.infer<typeof safetyStatsRowSchema>

export const safetyStatsModelSchema = z.object({
  brand: z.string(),
  model: z.string(),
  n: z.number().int(),
  avgScore: z.number(),
  /** Most sources any generation of this model was rated by (1–5). */
  sources: z.number().int()
})
export type SafetyStatsModel = z.infer<typeof safetyStatsModelSchema>

export const safetyStatsSourceSchema = z.object({
  source: z.enum(['euroncap', 'jncap', 'cncap', 'kncap', 'iihs']),
  /** Cars with a rating from this source. */
  matched: z.number().int(),
  avgScore: z.number().nullable()
})
export type SafetyStatsSource = z.infer<typeof safetyStatsSourceSchema>

export const safetyStatsResponseSchema = z.object({
  total: z.number().int(),
  matched: z.number().int(),
  fleetAvgScore: z.number().nullable(),
  byYear: z.array(safetyStatsRowSchema),
  byBrand: z.array(safetyStatsRowSchema),
  bySource: z.array(safetyStatsSourceSchema),
  safestModels: z.array(safetyStatsModelSchema),
  leastSafeModels: z.array(safetyStatsModelSchema),
  /** Rated cars per score band: `from` (inclusive) to `from + bandWidth`. */
  distribution: z.array(z.object({ from: z.number().int(), n: z.number().int() })),
  bandWidth: z.number().int()
})
export type SafetyStatsResponse = z.infer<typeof safetyStatsResponseSchema>

/**
 * GET /api/stats/top — everything the ResultCard ranking chips need in one small payload: the four registry
 * leaderboards (top 10 each, ranked by distinctPlates) plus the fuel/CO2 and crash-test model leaderboards
 * (the same ones /fuel and /safety show); a few KB instead of the full /api/stats.
 */
export const statsTopResponseSchema = statsResponseSchema
  .pick({
    byBrand: true,
    byColor: true,
    byRegion: true,
    topModels: true
  })
  .extend({
    cleanestModels: z.array(fuelStatsModelSchema),
    dirtiestModels: z.array(fuelStatsModelSchema),
    safestModels: z.array(safetyStatsModelSchema),
    leastSafeModels: z.array(safetyStatsModelSchema)
  })
export type StatsTopResponse = z.infer<typeof statsTopResponseSchema>

/** An auto-news headline (persisted by `pnpm ingest:news`): link + facts only. `match` is how it relates to the car asked about. */
export const newsItemSchema = z.object({
  url: z.string(),
  source: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  imageUrl: z.string().nullable(),
  publishedAt: z.string(),
  lang: z.string(),
  match: z.enum(['model', 'brand']).nullable()
})
export const newsResponseSchema = z.object({ items: z.array(newsItemSchema) })
export type NewsItem = z.infer<typeof newsItemSchema>
export type NewsResponse = z.infer<typeof newsResponseSchema>

/** One page of the /news archive, plus per-source counts (for the filter chips; computed over the language filter only). */
export const newsPageResponseSchema = z.object({
  items: z.array(newsItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  sources: z.array(z.object({ source: z.string(), count: z.number().int() }))
})
export type NewsPageResponse = z.infer<typeof newsPageResponseSchema>

/** A brand / group channel upload (persisted by `pnpm ingest:social`): link + facts only. */
export const socialPostSchema = z.object({
  url: z.string(),
  platform: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  imageUrl: z.string().nullable(),
  publishedAt: z.string()
})
/** The channels that speak for a car's brand (its own first, then its group's), each with its latest posts; a channel with none yet is omitted. */
export const socialResponseSchema = z.object({
  channels: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['make', 'group']),
      name: z.string(),
      url: z.string(),
      posts: z.array(socialPostSchema)
    })
  )
})
export type SocialPost = z.infer<typeof socialPostSchema>
export type SocialResponse = z.infer<typeof socialResponseSchema>

/** A listed company's price series for a car's brand (live, via the API's Yahoo Finance proxy). */
export const stockResponseSchema = z.object({
  company: z.object({ id: z.string(), name: z.string(), symbol: z.string(), url: z.string() }).nullable(),
  currency: z.string().nullable(),
  price: z.number().nullable(),
  /** Reference close the change is measured against (previous close for 1d, first close of the range otherwise). */
  baseline: z.number().nullable(),
  /** `[unix seconds, close]` pairs. */
  points: z.array(z.tuple([z.number(), z.number()]))
})
export type StockResponse = z.infer<typeof stockResponseSchema>
