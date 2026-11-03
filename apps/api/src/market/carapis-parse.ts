import { marketSourceName } from '@carplates/shared'
import type { MarketCard, MarketDetail } from '@carplates/shared'
import { z } from 'zod'

/**
 * Upstream CarAPIS shapes (checked against live answers 2026-11-03) and their mapping to our own contract. Everything is
 * `.nullish()`: the aggregator fills fields per source, and an unknown field must never fail a whole page.
 */

const photoSchema = z.object({
  url: z.string().nullish(),
  thumb_url: z.string().nullish()
})

export const upstreamRowSchema = z.object({
  id: z.string(),
  source_code: z.string(),
  trim: z.string().nullish(),
  year: z.number().nullish(),
  price_usd: z.number().nullish(),
  /** A decimal string (`"18500.00"`). */
  price_original: z.union([z.string(), z.number()]).nullish(),
  price_original_currency: z.string().nullish(),
  mileage: z.number().nullish(),
  fuel_type: z.string().nullish(),
  transmission: z.string().nullish(),
  body_type: z.string().nullish(),
  region: z.string().nullish(),
  source_location: z.object({ iso2: z.string().nullish() }).nullish(),
  has_accident: z.boolean().nullish(),
  is_available: z.boolean().nullish(),
  last_seen_at: z.string().nullish(),
  /** An object on live answers; tolerate a bare URL too. */
  thumb: z.union([photoSchema, z.string()]).nullish()
})
export type UpstreamRow = z.infer<typeof upstreamRowSchema>

export const upstreamPageSchema = z.object({
  count: z.number().nullish(),
  /** Parsed row by row (a malformed row is skipped, not fatal). */
  results: z.array(z.unknown())
})

export const upstreamDetailSchema = upstreamRowSchema.extend({
  description: z.string().nullish(),
  photos: z.array(photoSchema).nullish(),
  engine_cc: z.number().nullish(),
  drive_type: z.string().nullish(),
  seat_count: z.number().nullish(),
  owner_count: z.number().nullish(),
  warranty_type: z.string().nullish(),
  inspection_passed: z.boolean().nullish(),
  has_recall: z.boolean().nullish(),
  is_undervalued: z.boolean().nullish(),
  availability_checked_at: z.string().nullish(),
  listing_url: z.string().nullish()
})

/** `/models/?brand=&search=` answers a bare array. */
export const upstreamModelsSchema = z.array(z.object({ slug: z.string() }))

const MAX_PHOTOS = 20

const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

const httpsUrl = (v: string | null | undefined): string | null => {
  if (!v) return null
  try {
    return new URL(v).protocol === 'https:' ? v : null
  } catch {
    return null
  }
}

export function mapRow(row: UpstreamRow): MarketCard {
  const thumb = typeof row.thumb === 'string' ? row.thumb : (row.thumb?.thumb_url ?? row.thumb?.url)
  return {
    id: row.id,
    source: row.source_code,
    sourceName: marketSourceName(row.source_code),
    country: row.source_location?.iso2?.toUpperCase() ?? null,
    year: row.year ?? null,
    trim: row.trim ?? null,
    priceUsd: row.price_usd ?? null,
    priceOriginal: num(row.price_original),
    currencyOriginal: row.price_original_currency ?? null,
    mileage: row.mileage ?? null,
    fuel: row.fuel_type ?? null,
    transmission: row.transmission ?? null,
    body: row.body_type ?? null,
    region: row.region ?? null,
    thumb: httpsUrl(thumb),
    lastSeenAt: row.last_seen_at ?? null,
    hasAccident: row.has_accident ?? null
  }
}

/** Valid rows of a list page; rows the source marks unavailable are dropped. */
export function mapPage(body: unknown): MarketCard[] {
  const page = upstreamPageSchema.safeParse(body)
  if (!page.success) return []
  const cards: MarketCard[] = []
  for (const raw of page.data.results) {
    const row = upstreamRowSchema.safeParse(raw)
    if (row.success && row.data.is_available !== false) cards.push(mapRow(row.data))
  }
  return cards
}

/** The modal's data plus the outbound link, which stays server-side (the web gets `/api/market/go/:id`). */
export type MappedDetail = { detail: MarketDetail; listingUrl: string | null }

export function mapDetail(body: unknown): MappedDetail | null {
  const parsed = upstreamDetailSchema.safeParse(body)
  if (!parsed.success) return null
  const d = parsed.data
  const photos = (d.photos ?? [])
    .map(p => httpsUrl(p.url ?? p.thumb_url))
    .filter((u): u is string => !!u)
    .slice(0, MAX_PHOTOS)
  return {
    detail: {
      id: d.id,
      source: d.source_code,
      sourceName: marketSourceName(d.source_code),
      description: d.description || null,
      photos,
      engineCc: d.engine_cc ?? null,
      driveType: d.drive_type ?? null,
      seatCount: d.seat_count ?? null,
      ownerCount: d.owner_count ?? null,
      warrantyType: d.warranty_type ?? null,
      inspectionPassed: d.inspection_passed ?? null,
      hasAccident: d.has_accident ?? null,
      hasRecall: d.has_recall ?? null,
      isUndervalued: d.is_undervalued ?? null,
      isAvailable: d.is_available ?? null,
      availabilityCheckedAt: d.availability_checked_at ?? null,
      lastSeenAt: d.last_seen_at ?? null
    },
    listingUrl: httpsUrl(d.listing_url)
  }
}

/** Alphanumeric lowercase, the form `modelKey` produces: `cd-ceed` and `Ceed` compare equal to `cdceed` / `ceed`. */
export const alnum = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** The CarAPIS model slug whose alphanumeric form equals ours (`ceed`), else null: a near miss is never guessed. */
export function pickModelSlug(body: unknown, wanted: string): string | null {
  const parsed = upstreamModelsSchema.safeParse(body)
  if (!parsed.success) return null
  const key = alnum(wanted)
  return parsed.data.find(m => alnum(m.slug) === key)?.slug ?? null
}
