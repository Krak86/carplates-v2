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

/** Brand x year 2D rollup — see migrations/0004_stats_by_brand.sql. */
export const statsByBrandYear = registry
  .materializedView('stats_by_brand_year', {
    brand: text('brand'),
    year: integer('year'),
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
