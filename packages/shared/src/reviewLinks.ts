/**
 * Outbound search links only, same idea as `wikiUrl.ts` / `dealerUrl.ts` — nothing is fetched, scraped or
 * stored. The URL pattern was opened and confirmed on 2026-10-03:
 *
 * - drive2     `/search?text=<query>` (Russian; its per-model pages need a numeric id, e.g.
 *                `/cars/skoda/octavia/m2473/`, so a name can't build one)
 *
 * infocar.ua is not here: its links come from the crawled catalog (`infocarLookup.ts`, `GET /api/reviews`), which
 * only ever returns pages that exist. Not included on purpose: auto-blog (its site search returns irrelevant
 * results), avtoporadnyk (no working search URL found), nv.ua (403 to non-browser fetches, `/search` disallowed in
 * robots.txt).
 *
 * `lang` is the language of the *site*, not of the UI: drive2 is tagged `ru` so the UI can badge it.
 */
export const REVIEW_SITES = [{ id: 'drive2', lang: 'ru' }] as const

export type ReviewSiteId = (typeof REVIEW_SITES)[number]['id']
export type ReviewSiteLang = (typeof REVIEW_SITES)[number]['lang']

export type ReviewLink = {
  site: ReviewSiteId
  lang: ReviewSiteLang
  url: string
}

const LANG_BY_SITE = Object.fromEntries(REVIEW_SITES.map(s => [s.id, s.lang])) as Record<ReviewSiteId, ReviewSiteLang>

/** Review-site search links for a raw registry brand + model, `[]` when neither is known. */
export function reviewLinks(brand: string | null | undefined, model: string | null | undefined): ReviewLink[] {
  const vehicle = [brand, model].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (!vehicle) return []

  const query = encodeURIComponent(vehicle)
  const urls: [ReviewSiteId, string][] = [['drive2', `https://www.drive2.ru/search?text=${query}`]]

  return urls.map(([site, url]) => ({ site, lang: LANG_BY_SITE[site], url }))
}
