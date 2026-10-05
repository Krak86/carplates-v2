/**
 * Pure helpers for the carshow360.net ingest (see carshow360.ts): the gallery sitemap -> entries, and a readable
 * generation/trim label from a URL slug. No I/O.
 */
export type Carshow360Entry = {
  id: number
  brandSlug: string
  modelSlug: string
  /** URL slug without the trailing `-<id>`, e.g. `iii-fl2021-hatchback-buissnes-line-iii`. */
  slug: string
}

const GALLERY_URL = /^https?:\/\/carshow360\.net\/[a-z]{2}\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)-(\d+)$/

/** One gallery URL (any language prefix) -> entry, or null when it isn't a `/{lang}/{brand}/{model}/{slug}-{id}` page. */
export function parseGalleryUrl(url: string): Carshow360Entry | null {
  const m = GALLERY_URL.exec(url.trim().replace(/[?#].*$/, ''))
  if (!m) return null
  return { brandSlug: m[1]!, modelSlug: m[2]!, slug: m[3]!, id: Number(m[4]) }
}

/** Every distinct gallery of a sitemap (all language variants collapse onto the id), in sitemap order. */
export function parseSitemap(xml: string): Carshow360Entry[] {
  const seen = new Set<number>()
  const out: Carshow360Entry[] = []
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const entry = parseGalleryUrl(m[1]!)
    if (!entry || seen.has(entry.id)) continue
    seen.add(entry.id)
    out.push(entry)
  }
  return out
}

const ROMAN = /^(?:i{1,3}|iv|vi{0,3}|ix|x{1,2})$/

/** `iii-fl2021-hatchback-buissnes-line-iii` -> `III FL2021 Hatchback Buissnes Line III` (roman numerals + FLyyyy upper-cased). */
export function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => (ROMAN.test(w) || /^fl\d{4}$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/** `Kia Ceed III Hatchback | CarShow360` -> `Kia Ceed III Hatchback`; null for an empty/missing title. */
export function parsePageTitle(html: string): string | null {
  const raw = /<title>([^<]*)<\/title>/i.exec(html)?.[1]
  const title = raw
    ?.replace(/\s*\|\s*CarShow360\s*$/i, '')
    .replace(/&amp;/g, '&')
    .trim()
  return title || null
}
