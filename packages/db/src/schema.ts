import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'

/**
 * All derived, read-only registry data lives in the `registry` schema so the
 * future `app` schema (accounts, favorites — Phase 5) can be added without
 * moving anything.
 */
export const registry = pgSchema('registry')

/** One vehicle-registration action from the data.gov.ua open dataset. */
export const registrations = registry.table(
  'registrations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /**
     * Normalized (Cyrillic, no spaces/slashes) — the query key. Nullable since
     * the 2026 ГСЦ МВС order №67/ОД (2026-06-29) stopped publishing plates; such
     * rows carry `vin` instead (`ck_reg_identity` requires one or the other).
     */
    plate: text('plate'),
    person: text('person'),
    regAddrKoatuu: text('reg_addr_koatuu'),
    operCode: integer('oper_code'),
    operName: text('oper_name'),
    dReg: date('d_reg'),
    depCode: text('dep_code'),
    dep: text('dep'),
    brand: text('brand'),
    model: text('model'),
    vin: text('vin'),
    makeYear: integer('make_year'),
    color: text('color'),
    kind: text('kind'),
    body: text('body'),
    purpose: text('purpose'),
    fuel: text('fuel'),
    capacity: integer('capacity'),
    /** Engine power in kW — added in the 2026 layout; the only engine figure a pure EV has. */
    powerKwt: integer('power_kwt'),
    ownWeight: integer('own_weight'),
    totalWeight: integer('total_weight'),
    /** true when `plate` was reconstructed (VIN/event match), not published as-is. */
    plateInferred: boolean('plate_inferred').notNull().default(false),
    /** CKAN resource id this row was ingested from */
    sourceResourceId: text('source_resource_id')
  },
  t => [
    index('ix_reg_plate').on(t.plate, t.dReg.desc()),
    index('ix_reg_vin')
      .on(t.vin)
      .where(sql`${t.vin} is not null`),
    // The real constraints (partial + NULLS NOT DISTINCT, PG15+) are created in
    // migrations/0001_plateless_and_power.sql — drizzle 0.45's builder can't
    // express WHERE-qualified unique indexes or that modifier together.
    uniqueIndex('ux_reg_dedupe').on(t.plate, t.dReg, t.operCode, t.vin),
    uniqueIndex('ux_reg_dedupe_vin').on(t.vin, t.dReg, t.operCode)
  ]
)
export type RegistrationRow = typeof registrations.$inferSelect
export type RegistrationInsert = typeof registrations.$inferInsert

/**
 * Latest known registration per plate — DISTINCT ON (plate) ORDER BY plate, d_reg DESC.
 * Managed by SQL migration (the DISTINCT ON is not expressible in the query
 * builder); declared `.existing()` here purely for typed reads.
 */
export const currentRegistration = registry
  .materializedView('current_registration', {
    plate: text('plate').notNull(),
    person: text('person'),
    regAddrKoatuu: text('reg_addr_koatuu'),
    operCode: integer('oper_code'),
    operName: text('oper_name'),
    dReg: date('d_reg'),
    depCode: text('dep_code'),
    dep: text('dep'),
    brand: text('brand'),
    model: text('model'),
    vin: text('vin'),
    makeYear: integer('make_year'),
    color: text('color'),
    kind: text('kind'),
    body: text('body'),
    purpose: text('purpose'),
    fuel: text('fuel'),
    capacity: integer('capacity'),
    powerKwt: integer('power_kwt'),
    ownWeight: integer('own_weight'),
    totalWeight: integer('total_weight'),
    plateInferred: boolean('plate_inferred').notNull()
  })
  .existing()

const statsMetrics = {
  totalRows: bigint('total_rows', { mode: 'number' }).notNull(),
  distinctPlates: bigint('distinct_plates', { mode: 'number' }).notNull(),
  distinctVins: bigint('distinct_vins', { mode: 'number' }).notNull()
}

/** Single-row totals — see migrations/0002_stats_rollups.sql. */
export const statsSummary = registry
  .materializedView('stats_summary', {
    ...statsMetrics,
    platelessCount: bigint('plateless_count', { mode: 'number' }).notNull()
  })
  .existing()

/** By registration-action year (`d_reg`); `year` is null for undated rows. */
export const statsByYear = registry
  .materializedView('stats_by_year', { year: integer('year'), ...statsMetrics })
  .existing()

/** By oblast (plate-prefix -> `registry.plate_regions`, mirrors `REGIONS` in `@carplates/shared`). */
export const statsByRegion = registry
  .materializedView('stats_by_region', { region: text('region').notNull(), ...statsMetrics })
  .existing()

/** The one 2D rollup (region x year) — see migrations/0002_stats_rollups.sql. */
export const statsByRegionYear = registry
  .materializedView('stats_by_region_year', {
    region: text('region').notNull(),
    year: integer('year'),
    ...statsMetrics
  })
  .existing()

export const statsByBody = registry
  .materializedView('stats_by_body', { body: text('body'), ...statsMetrics })
  .existing()

export const statsByKind = registry
  .materializedView('stats_by_kind', { kind: text('kind'), ...statsMetrics })
  .existing()

export const statsByColor = registry
  .materializedView('stats_by_color', { color: text('color'), ...statsMetrics })
  .existing()

export const statsByFuel = registry
  .materializedView('stats_by_fuel', { fuel: text('fuel'), ...statsMetrics })
  .existing()

export const statsByBrand = registry
  .materializedView('stats_by_brand', { brand: text('brand'), ...statsMetrics })
  .existing()

/**
 * Imported vs. dealer-bought-domestic rollup, derived from oper_name keywords —
 * see migrations/0011_stats_by_origin.sql for the classification and its rationale.
 */
export const statsByOrigin = registry
  .materializedView('stats_by_origin', { origin: text('origin'), ...statsMetrics })
  .existing()

/** Brand x year 2D rollup — see migrations/0004_stats_by_brand.sql. */
export const statsByBrandYear = registry
  .materializedView('stats_by_brand_year', {
    brand: text('brand'),
    year: integer('year'),
    ...statsMetrics
  })
  .existing()

/**
 * Brand+model rollup backing the stats-page "top 5 models" leaderboard only
 * (~79k distinct pairs, mostly ingest noise) — see migrations/0010_stats_by_model.sql.
 */
export const statsByModel = registry
  .materializedView('stats_by_model', {
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    ...statsMetrics
  })
  .existing()

/**
 * One Euro NCAP tested assessment (make/model/generation/variant) — scraped from
 * euroncap.com (no public API) via `scripts/src/euroncap.ts` and refreshed by
 * re-running it, unlike NHTSA/Pixabay which are fetched live per-request.
 * `makeKey`/`modelKey` (`@carplates/shared`) drive both the scraper's write key
 * and the API's lookup — see migrations/0005_euroncap_ratings.sql.
 */
export const euroncapRatings = registry.table(
  'euroncap_ratings',
  {
    assessmentId: text('assessment_id').primaryKey(),
    url: text('url').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    makeKey: text('make_key').notNull(),
    modelKey: text('model_key').notNull(),
    testedVariant: text('tested_variant'),
    bodyType: text('body_type'),
    ratingYear: integer('rating_year'),
    stars: smallint('stars'),
    adultOccupantPct: smallint('adult_occupant_pct'),
    childOccupantPct: smallint('child_occupant_pct'),
    vulnerableRoadUsersPct: smallint('vulnerable_road_users_pct'),
    safetyAssistPct: smallint('safety_assist_pct'),
    safetyPack: boolean('safety_pack').notNull().default(false),
    /** The frontal ("_0_") carousel shot — hotlinked from Euro NCAP's CDN, never rehosted. */
    frontImageUrl: text('front_image_url'),
    /** `{ url, test }[]` — carousel images, hotlinked. */
    images: jsonb('images').$type<{ url: string; test: string | null }[]>().notNull().default([]),
    /** YouTube video ids, played via youtube-nocookie.com — never downloaded/transcoded. */
    youtubeIds: text('youtube_ids').array().notNull().default([]),
    reportPdfUrl: text('report_pdf_url'),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_euroncap_make_model').on(t.makeKey, t.modelKey)]
)
export type EuroncapRatingRow = typeof euroncapRatings.$inferSelect
export type EuroncapRatingInsert = typeof euroncapRatings.$inferInsert

/**
 * One JNCAP (Japan, NASVA) tested assessment — scraped from nasva.go.jp's English mirror
 * (no public API) via `scripts/src/jncap.ts` and refreshed by re-running it, same rationale
 * as `euroncapRatings` above. `makeKey`/`modelKey` (`@carplates/shared`) drive both the
 * scraper's write key and the API's lookup — see migrations/0006_jncap_ratings.sql.
 */
export const jncapRatings = registry.table(
  'jncap_ratings',
  {
    assessmentId: text('assessment_id').primaryKey(),
    url: text('url').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    makeKey: text('make_key').notNull(),
    modelKey: text('model_key').notNull(),
    vehicleType: text('vehicle_type'),
    ratingYear: integer('rating_year'),
    stars: smallint('stars'),
    overallPct: smallint('overall_pct'),
    preventiveRank: text('preventive_rank'),
    preventivePct: smallint('preventive_pct'),
    collisionRank: text('collision_rank'),
    collisionPct: smallint('collision_pct'),
    emergencyCallType: text('emergency_call_type'),
    emergencyCallPct: smallint('emergency_call_pct'),
    /** Raw ordered `{ label, value }[]` breakdown — JNCAP's own test taxonomy, kept as-is. */
    testScores: jsonb('test_scores').$type<{ label: string; value: string }[]>().notNull().default([]),
    /** Hotlinked from NASVA's own site, never rehosted. */
    imageUrl: text('image_url'),
    youtubeId: text('youtube_id'),
    reportPdfUrl: text('report_pdf_url'),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_jncap_make_model').on(t.makeKey, t.modelKey)]
)
export type JncapRatingRow = typeof jncapRatings.$inferSelect
export type JncapRatingInsert = typeof jncapRatings.$inferInsert

/**
 * One C-NCAP (China, CATARC) tested car — scraped from c-ncap.org.cn's own JSON API
 * (no stable public contract, same rationale as `euroncapRatings`/`jncapRatings` above)
 * via `scripts/src/cncap.ts` and refreshed by re-running it. `makeKey`/`modelKey`
 * (`@carplates/shared`) drive both the scraper's write key and the API's lookup — see
 * migrations/0007_cncap_ratings.sql. C-NCAP's own data is Chinese-only, so `make`/`model`
 * come from a curated translation table (`scripts/src/cncap-names.ts`), not the source
 * directly — `nameZh`/`manufacturerZh` keep the original text for display and re-curation.
 */
export const cncapRatings = registry.table(
  'cncap_ratings',
  {
    assessmentId: text('assessment_id').primaryKey(),
    carId: integer('car_id').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    makeKey: text('make_key').notNull(),
    modelKey: text('model_key').notNull(),
    nameZh: text('name_zh').notNull(),
    manufacturerZh: text('manufacturer_zh'),
    vehicleClass: text('vehicle_class'),
    ratingYear: integer('rating_year'),
    /** Which shape `overallScore`/the sub-scores are in — see migration comment for why. */
    scoreUnit: text('score_unit').$type<'pct' | 'points'>().notNull(),
    overallScore: real('overall_score'),
    occupantScore: real('occupant_score'),
    vruScore: real('vru_score'),
    activeSafetyScore: real('active_safety_score'),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_cncap_make_model').on(t.makeKey, t.modelKey)]
)
export type CncapRatingRow = typeof cncapRatings.$inferSelect
export type CncapRatingInsert = typeof cncapRatings.$inferInsert

/**
 * One KNCAP (Korea, MOLIT/KoROAD) tested car — scraped from kncap.org's own JSON results
 * catalog via `scripts/src/kncap.ts` and refreshed by re-running it, same rationale as
 * `cncapRatings` above. `makeKey`/`modelKey` (`@carplates/shared`) drive both the scraper's
 * write key and the API's lookup — see migrations/0008_kncap_ratings.sql. KNCAP's own
 * `COMPANY_NAME`/`BRAND_NAME` are Korean-only, so `make`/`model` come from a curated
 * translation table (`scripts/src/kncap-names.ts`), not the source directly — `nameKo` keeps
 * the original text for display and re-curation. Scraped from the "current results" catalog
 * only (2021 onward) — see PLAN.md's KNCAP section for the historical-recovery gap.
 */
export const kncapRatings = registry.table(
  'kncap_ratings',
  {
    assessmentId: text('assessment_id').primaryKey(),
    idx: integer('idx').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    makeKey: text('make_key').notNull(),
    modelKey: text('model_key').notNull(),
    nameKo: text('name_ko').notNull(),
    ratingYear: integer('rating_year'),
    overallScore: real('overall_score'),
    overallClass: smallint('overall_class'),
    crashPct: real('crash_pct'),
    crashStar: smallint('crash_star'),
    pedestrianPct: real('pedestrian_pct'),
    pedestrianStar: smallint('pedestrian_star'),
    accidentPct: real('accident_pct'),
    accidentStar: smallint('accident_star'),
    imageUrl: text('image_url'),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_kncap_make_model').on(t.makeKey, t.modelKey)]
)
export type KncapRatingRow = typeof kncapRatings.$inferSelect
export type KncapRatingInsert = typeof kncapRatings.$inferInsert

/**
 * One row of infocar.ua's brand -> model -> version catalog (`scripts/src/infocar.ts`), per `tree`
 * (`test_drive` | `reviews`). `versionName` null = a model-level row (url is the model page). `yearTo` null with a
 * `yearFrom` = still in production. `reviewCount`/`avgRating` are model-level, reviews tree only. Links and facts
 * only — see migrations/0020_infocar_versions.sql.
 */
export const infocarVersions = registry.table(
  'infocar_versions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tree: text('tree').notNull(),
    brandSlug: text('brand_slug').notNull(),
    modelSlug: text('model_slug').notNull(),
    modelName: text('model_name').notNull(),
    versionName: text('version_name'),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
    url: text('url').notNull().unique(),
    reviewCount: integer('review_count'),
    avgRating: real('avg_rating'),
    isRu: boolean('is_ru').notNull().default(false),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_infocar_brand_model_year').on(t.brandSlug, t.modelSlug, t.yearFrom)]
)
export type InfocarVersionRow = typeof infocarVersions.$inferSelect
export type InfocarVersionInsert = typeof infocarVersions.$inferInsert

/**
 * One video from infocar.ua's `/video/` section (`scripts/src/infocar-videos.ts`), keyed by its YouTube id. `modelSlug`
 * (from the video page's canonical URL) and `year` (from the title) are null for brand-level videos. Links and facts
 * only — see migrations/0023_car_videos.sql.
 */
export const carVideos = registry.table(
  'car_videos',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    youtubeId: text('youtube_id').notNull().unique(),
    infocarVideoId: integer('infocar_video_id').notNull().unique(),
    url: text('url').notNull(),
    title: text('title').notNull(),
    thumbUrl: text('thumb_url'),
    durationS: integer('duration_s'),
    publishedAt: date('published_at', { mode: 'string' }),
    brandSlug: text('brand_slug').notNull(),
    modelSlug: text('model_slug'),
    generationId: integer('generation_id'),
    year: integer('year'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_car_videos_brand_model').on(t.brandSlug, t.modelSlug)]
)
export type CarVideoRow = typeof carVideos.$inferSelect
export type CarVideoInsert = typeof carVideos.$inferInsert

/**
 * YouTube fallback for models infocar has no video for (`scripts/src/youtube-videos.ts`) — a sibling of `carVideos`.
 * `modelSlug` is the registry model slug with its doubled spelling collapsed. See migrations/0031_youtube_videos.sql.
 */
export const youtubeVideos = registry.table(
  'youtube_videos',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    youtubeId: text('youtube_id').notNull().unique(),
    brandSlug: text('brand_slug').notNull(),
    modelSlug: text('model_slug').notNull(),
    lang: text('lang').notNull(),
    title: text('title').notNull(),
    channel: text('channel').notNull(),
    views: integer('views').notNull().default(0),
    durationS: integer('duration_s').notNull(),
    publishedAt: date('published_at', { mode: 'string' }),
    year: smallint('year'),
    query: text('query').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_youtube_videos_brand_model').on(t.brandSlug, t.modelSlug)]
)
export type YoutubeVideoRow = typeof youtubeVideos.$inferSelect
export type YoutubeVideoInsert = typeof youtubeVideos.$inferInsert

/** Resume marker + per-day quota ledger of the YouTube search, one row per (brand, model). */
export const youtubeModelRuns = registry.table(
  'youtube_model_runs',
  {
    brandSlug: text('brand_slug').notNull(),
    modelSlug: text('model_slug').notNull(),
    status: text('status').notNull(),
    kept: integer('kept').notNull().default(0),
    queries: integer('queries').notNull().default(0),
    units: integer('units').notNull().default(0),
    cars: integer('cars').notNull().default(0),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [primaryKey({ columns: [t.brandSlug, t.modelSlug] })]
)
export type YoutubeModelRunRow = typeof youtubeModelRuns.$inferSelect
export type YoutubeModelRunInsert = typeof youtubeModelRuns.$inferInsert

/**
 * One e-drive.com.ua owner post (`scripts/src/edrive.ts`), keyed by its e-drive post id and tagged with the make/model/
 * generation it was found under. Links and facts only — see migrations/0025_owner_posts.sql.
 */
export const ownerPosts = registry.table(
  'owner_posts',
  {
    postId: integer('post_id').primaryKey(),
    url: text('url').notNull(),
    title: text('title').notNull(),
    category: text('category'),
    coverUrl: text('cover_url'),
    createdAt: date('created_at', { mode: 'string' }),
    brandSlug: text('brand_slug').notNull(),
    modelSlug: text('model_slug').notNull(),
    modelName: text('model_name').notNull(),
    generationName: text('generation_name'),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_owner_posts_brand_model').on(t.brandSlug, t.modelSlug)]
)
export type OwnerPostRow = typeof ownerPosts.$inferSelect
export type OwnerPostInsert = typeof ownerPosts.$inferInsert

/**
 * One Sketchfab 3D car model (`scripts/src/sketchfab.ts`), keyed by its Sketchfab uid and tagged with the make/model
 * the search was run for. Facts + links only (embedded from Sketchfab) — see migrations/0026_car_models_3d.sql.
 */
export const carModels3d = registry.table(
  'car_models_3d',
  {
    uid: text('uid').primaryKey(),
    name: text('name').notNull(),
    brandSlug: text('brand_slug').notNull(),
    modelSlug: text('model_slug').notNull(),
    modelName: text('model_name').notNull(),
    year: integer('year'),
    authorName: text('author_name').notNull(),
    authorUrl: text('author_url').notNull(),
    thumbUrl: text('thumb_url'),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    license: text('license'),
    publishedAt: date('published_at', { mode: 'string' }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_car_models_3d_brand_model').on(t.brandSlug, t.modelSlug)]
)
export type CarModel3dRow = typeof carModels3d.$inferSelect
export type CarModel3dInsert = typeof carModels3d.$inferInsert

/**
 * One TopGear UK editorial review page (`scripts/src/topgear.ts`), keyed by its topgear.com URL. `brandSlug` is our
 * (infocar-spelled) brand slug, null when TopGear's make has no catalog match; `yearFrom`/`yearTo` only when the model
 * slug carries a range. Facts + links only (score, date, meta-description blurb) — see migrations/0027_topgear_reviews.sql.
 */
export const topgearReviews = registry.table(
  'topgear_reviews',
  {
    url: text('url').primaryKey(),
    makeSlug: text('make_slug').notNull(),
    modelSlug: text('model_slug').notNull(),
    brandSlug: text('brand_slug'),
    title: text('title').notNull(),
    rating: real('rating'),
    bestRating: real('best_rating'),
    publishedAt: date('published_at', { mode: 'string' }),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
    blurb: text('blurb'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_topgear_reviews_brand_model').on(t.brandSlug, t.modelSlug)]
)
export type TopgearReviewRow = typeof topgearReviews.$inferSelect
export type TopgearReviewInsert = typeof topgearReviews.$inferInsert

/**
 * Wikimedia hero-photo cache, keyed by normalized (brand, model, year); `year` 0 = the model-level fallback row.
 * Image metadata only — files stay hotlinked. See migrations/0030_wiki_image.sql.
 */
export const wikiImage = registry.table(
  'wiki_image',
  {
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    year: smallint('year').notNull().default(0),
    status: text('status').notNull(),
    imageUrl: text('image_url'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    attrAuthor: text('attr_author'),
    attrLicense: text('attr_license'),
    attrLicenseUrl: text('attr_license_url'),
    origin: text('origin'),
    title: text('title'),
    lastHttpStatus: integer('last_http_status'),
    lastError: text('last_error'),
    attempts: integer('attempts').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [primaryKey({ columns: [t.brand, t.model, t.year] }), index('ix_wiki_image_status').on(t.status, t.nextRetryAt)]
)
export type WikiImageRow = typeof wikiImage.$inferSelect
export type WikiImageInsert = typeof wikiImage.$inferInsert

/**
 * One tech-press test drive (`scripts/src/press.ts`: itc.ua, mezha.ua), keyed by its primary (Ukrainian) URL. `langs`
 * holds every language edition (`uk`/`ru`/`en`: url, title, blurb). `brandSlug` is our brand slug found in the titles/tags;
 * the model is matched at lookup from `keywords` + titles. Facts + links only — see migrations/0029_press_reviews.sql.
 */
export type PressLangEntry = { url: string; title: string; blurb: string | null }
/** Mirrors `PRESS_LANGS` in @carplates/shared (db doesn't depend on it). */
export type PressLang = 'uk' | 'ru' | 'en'
export const pressReviews = registry.table(
  'press_reviews',
  {
    url: text('url').primaryKey(),
    source: text('source').notNull(),
    brandSlug: text('brand_slug'),
    keywords: text('keywords').notNull().default(''),
    yearHint: integer('year_hint'),
    publishedAt: date('published_at', { mode: 'string' }),
    langs: jsonb('langs').$type<Partial<Record<PressLang, PressLangEntry>>>().notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_press_reviews_brand').on(t.brandSlug)]
)
export type PressReviewRow = typeof pressReviews.$inferSelect
export type PressReviewInsert = typeof pressReviews.$inferInsert

/**
 * Auto-news headlines polled from the RSS feeds listed in `scripts/news-sources.json` (`pnpm ingest:news`), accumulated
 * by `url` because feeds only hold their latest N items. Facts + links only — title, ≤300-char summary, image URL
 * (hotlinked), date. `brand_slug`/`model_slug` are the infocar catalog's slugs, found in the title once at ingest
 * (NULL = general news).
 */
export const newsItems = registry.table(
  'news_items',
  {
    url: text('url').primaryKey(),
    source: text('source').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    imageUrl: text('image_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    lang: text('lang').notNull(),
    brandSlug: text('brand_slug'),
    modelSlug: text('model_slug'),
    year: integer('year'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    index('ix_news_items_brand').on(t.brandSlug, t.publishedAt),
    index('ix_news_items_published').on(t.publishedAt)
  ]
)
export type NewsItemRow = typeof newsItems.$inferSelect
export type NewsItemInsert = typeof newsItems.$inferInsert

/**
 * One IIHS (US, insurance-industry-funded) vehicle model-year assessment — scraped from
 * iihs.org's own server-rendered detail pages via `scripts/src/iihs.ts` and refreshed by
 * re-running it, same rationale as `cncapRatings`/`kncapRatings` above. `makeKey`/`modelKey`
 * (`@carplates/shared`) drive both the scraper's write key and the API's lookup — see
 * migrations/0009_iihs_ratings.sql. IIHS's own tested-criteria set changes by era, so `tests`
 * is a jsonb array rather than fixed columns (see the migration's header comment).
 */
export const iihsRatings = registry.table(
  'iihs_ratings',
  {
    assessmentId: text('assessment_id').primaryKey(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    makeKey: text('make_key').notNull(),
    modelKey: text('model_key').notNull(),
    variantType: text('variant_type').notNull(),
    vehicleClass: text('vehicle_class'),
    modelYear: integer('model_year').notNull(),
    award: text('award'),
    /** `{ key, label, rating, qualifier }[]` — see migration header comment for why this isn't fixed columns. */
    tests: jsonb('tests')
      .$type<{ key: string; label: string; rating: string | null; qualifier: string | null }[]>()
      .notNull()
      .default([]),
    imageUrl: text('image_url'),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_iihs_make_model').on(t.makeKey, t.modelKey)]
)
export type IihsRatingRow = typeof iihsRatings.$inferSelect
export type IihsRatingInsert = typeof iihsRatings.$inferInsert

/**
 * Fuel consumption + tailpipe CO2 reference rows (fueleconomy.gov first), loaded by
 * `scripts/src/fuel-economy.ts` — see migrations/0016_fuel_economy.sql. Values are normalized on load
 * (g/mi → g/km, MPG → L/100km); `cycle` says which test procedure produced them.
 */
export const fuelEconomy = registry.table(
  'fuel_economy',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    cycle: text('cycle').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    makeKey: text('make_key').notNull(),
    modelKey: text('model_key').notNull(),
    modelYear: integer('model_year').notNull(),
    fuelType: text('fuel_type').notNull(),
    fuelCategory: text('fuel_category').notNull(),
    /** 'ice' | 'hybrid' | 'phev' | 'ev' | 'fcev' — see migrations/0017. */
    powertrain: text('powertrain').notNull().default('ice'),
    engineCc: integer('engine_cc'),
    cylinders: integer('cylinders'),
    l100km: real('l_100km'),
    co2GKm: real('co2_g_km'),
    evKwh100km: real('ev_kwh_100km'),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_fuel_economy_make_model').on(t.makeKey, t.modelKey, t.modelYear)]
)
export type FuelEconomyRow = typeof fuelEconomy.$inferSelect
export type FuelEconomyInsert = typeof fuelEconomy.$inferInsert

/**
 * Per-(brand, model, year, fuel, capacity bucket) passenger-car counts joined with the CO2 estimate the reference
 * data gives them — backs the /fuel statistics page. Rebuilt by `scripts/src/fuel-stats.ts`; see
 * migrations/0018_stats_fuel.sql.
 */
export const statsFuel = registry.table(
  'stats_fuel',
  {
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    makeYear: integer('make_year').notNull(),
    fuel: text('fuel'),
    fuelClass: text('fuel_class').notNull(),
    capacityBucket: integer('capacity_bucket'),
    n: integer('n').notNull(),
    co2GKm: real('co2_g_km'),
    l100km: real('l_100km'),
    source: text('source'),
    cycle: text('cycle')
  },
  t => [index('ix_stats_fuel_year').on(t.makeYear), index('ix_stats_fuel_brand').on(t.brand)]
)
export type StatsFuelInsert = typeof statsFuel.$inferInsert

/** Incremental-ingest bookkeeping: which CKAN resources have been loaded. */
export const ingestedResources = registry.table('ingested_resources', {
  ckanResourceId: text('ckan_resource_id').primaryKey(),
  name: text('name'),
  url: text('url'),
  lastModified: timestamp('last_modified', { withTimezone: true }),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
  rowCount: integer('row_count')
})
export type IngestedResourceRow = typeof ingestedResources.$inferSelect

/**
 * Per-(brand, model, make year) passenger-car counts joined with the combined crash score of the NCAP-style ratings
 * that apply to them — backs the /safety statistics page. Rebuilt by `scripts/src/safety-stats.ts`; see
 * migrations/0019_stats_safety.sql.
 */
export const statsSafety = registry.table(
  'stats_safety',
  {
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    makeYear: integer('make_year').notNull(),
    n: integer('n').notNull(),
    score: real('score'),
    sources: smallint('sources').notNull().default(0),
    euroncapScore: real('euroncap_score'),
    jncapScore: real('jncap_score'),
    cncapScore: real('cncap_score'),
    kncapScore: real('kncap_score'),
    iihsScore: real('iihs_score')
  },
  t => [index('ix_stats_safety_year').on(t.makeYear), index('ix_stats_safety_brand').on(t.brand)]
)
export type StatsSafetyInsert = typeof statsSafety.$inferInsert

/**
 * Format-valid plate/VIN searches that matched nothing in the registry (e.g. a plate not yet issued or ingested) —
 * see migrations/0021_missed_lookups.sql. Written by the API only.
 */
export const missedLookups = registry.table(
  'missed_lookups',
  {
    kind: text('kind').notNull(),
    value: text('value').notNull(),
    hits: integer('hits').notNull().default(1),
    firstSeen: timestamp('first_seen', { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp('last_seen', { withTimezone: true }).notNull().defaultNow()
  },
  t => [primaryKey({ columns: [t.kind, t.value] }), index('ix_missed_lookups_last_seen').on(t.lastSeen)]
)

/**
 * One CarShow360 360° gallery (`scripts/src/carshow360.ts`), keyed by its carshow360 numeric id and tagged with the
 * make/model URL slugs. Facts + links only (embedded from carshow360.net) — see migrations/0028_car_models_360.sql.
 */
export const carModels360 = registry.table(
  'car_models_360',
  {
    id: integer('id').primaryKey(),
    brandSlug: text('brand_slug').notNull(),
    modelSlug: text('model_slug').notNull(),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    title: text('title'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('ix_car_models_360_brand_model').on(t.brandSlug, t.modelSlug)]
)
export type CarModel360Row = typeof carModels360.$inferSelect
export type CarModel360Insert = typeof carModels360.$inferInsert
