/**
 * Pure parsing for the TopGear UK review ingest (topgear.ts): sitemap -> model-page URLs, and a model page's
 * `Car` JSON-LD (`review` + `reviewRating`) + meta description -> one review record. Facts only; review text is never kept.
 */
import { z } from 'zod'

export const TOPGEAR_ORIGIN = 'https://www.topgear.com'
const BLURB_MAX = 300

/** `ratingValue`/`bestRating` arrive as a number, a string (`"6"`) or `"9/10"` — all tolerated. */
const scoreSchema = z.union([z.number(), z.string()]).optional()

/** Free-text fields are sometimes a string[] (a comma-split sentence) — joined back; any other type is dropped. */
const textSchema = z
  .union([z.string(), z.array(z.string()).transform(parts => parts.join(', '))])
  .optional()
  .catch(undefined)

const carSchema = z.object({
  '@type': z.literal('Car'),
  name: textSchema,
  description: textSchema,
  review: z
    .object({
      headline: textSchema,
      description: textSchema,
      datePublished: z.string().optional().catch(undefined),
      reviewRating: z.object({ ratingValue: scoreSchema, bestRating: scoreSchema }).partial().optional()
    })
    .optional()
})

export type TopgearReview = {
  title: string
  rating: number | null
  bestRating: number | null
  /** `YYYY-MM-DD` */
  publishedAt: string | null
  blurb: string | null
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }

export function decodeEntities(s: string): string {
  return s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (m, hex?: string, dec?: string, name?: string) => {
    if (hex) return String.fromCodePoint(parseInt(hex, 16))
    if (dec) return String.fromCodePoint(parseInt(dec, 10))
    return ENTITIES[name!.toLowerCase()] ?? m
  })
}

/** `<loc>` URLs of a sitemap page. */
export function parseSitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => decodeEntities(m[1]!))
}

/** Slugs under `/car-reviews/<make>/` that are articles or section pages, not a model (`first-drive-3`, `report-2`, `buying`). */
const NON_MODEL_SLUG = /^(?:first-drive|report|driving|interior|buying|specs|gallery|video|news)(?:-\d+)?$/

export type TopgearModelRef = { url: string; path: string; makeSlug: string; modelSlug: string }

/**
 * Keeps only `/car-reviews/<make>/<model>` URLs — drops brand pages (`/car-reviews/kia`) and variant/section subpages
 * (`/car-reviews/kia/ceed/first-drive`, `/buying`, …) and make-level article series (`/kia/first-drive-3`, `/kia/report-2`), which add nothing we need.
 */
export function modelPages(urls: string[]): TopgearModelRef[] {
  const seen = new Set<string>()
  const out: TopgearModelRef[] = []
  for (const url of urls) {
    const m = /^https:\/\/www\.topgear\.com\/car-reviews\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/.exec(url)
    if (!m || NON_MODEL_SLUG.test(m[2]!) || seen.has(url)) continue
    seen.add(url)
    out.push({ url, path: `/car-reviews/${m[1]}/${m[2]}`, makeSlug: m[1]!, modelSlug: m[2]! })
  }
  return out
}

/** `sportage-2017-2021` -> 2017–2021; no range -> nulls. A lone trailing year is not a range. */
export function slugYearRange(modelSlug: string): { yearFrom: number | null; yearTo: number | null } {
  const m = /-((?:19|20)\d{2})-((?:19|20)\d{2})(?:-\d+)?$/.exec(modelSlug)
  if (!m) return { yearFrom: null, yearTo: null }
  const [from, to] = [Number(m[1]), Number(m[2])]
  return from <= to ? { yearFrom: from, yearTo: to } : { yearFrom: null, yearTo: null }
}

/** Leading number of `6`, `"6"`, `"9/10"`, `"7.5"`; null when absent or not a finite number. */
function toScore(v: string | number | undefined): number | null {
  if (v === undefined) return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** ISO (`2015-01-13T15:04:59+0000`) or Drupal's `Tue, 01/13/2015 - 15:04` -> `YYYY-MM-DD`. */
export function toIsoDate(v: string | undefined): string | null {
  if (!v) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const us = /(\d{2})\/(\d{2})\/(\d{4})/.exec(v)
  return us ? `${us[3]}-${us[1]}-${us[2]}` : null
}

const cleanTitle = (t: string): string =>
  t
    .replace(/\s*\|\s*Top Gear\s*$/i, '')
    .replace(/\s+Review(?:\s+(?:19|20)\d{2})?\s*$/i, '')
    .trim()

function metaDescription(html: string): string | null {
  const m = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html)
  return m ? decodeEntities(m[1]!) : null
}

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = []
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      out.push(JSON.parse(m[1]!))
    } catch {
      // a malformed block is skipped; the Car block is the only one we need
    }
  }
  return out
}

/** One model page -> its review record, or null when the page has no `Car` review (e.g. the 404 page). */
export function parseTopgearPage(html: string): TopgearReview | null {
  const car = jsonLdBlocks(html)
    .map(j => carSchema.safeParse(j))
    .find(r => r.success)?.data
  if (!car?.review) return null
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]
  const rawTitle = car.review.headline ?? car.name ?? (titleTag ? decodeEntities(titleTag) : '')
  const title = cleanTitle(rawTitle)
  if (!title) return null
  const rating = toScore(car.review.reviewRating?.ratingValue)
  const blurb = (metaDescription(html) ?? car.review.description ?? car.description ?? '').trim().slice(0, BLURB_MAX)
  return {
    title,
    rating,
    bestRating: rating === null ? null : (toScore(car.review.reviewRating?.bestRating) ?? 10),
    publishedAt: toIsoDate(car.review.datePublished),
    blurb: blurb || null
  }
}
