import { brandSlug } from './brandLogo.js'

/**
 * Outbound links only, same idea as `wikiUrl.ts` / `dealerUrl.ts` — nothing is fetched, scraped or
 * stored. Every URL pattern below was opened and confirmed on 2026-10-03:
 *
 * - infocar test drives  `/test-drive/<brand>/<model>/`  (model slugs e.g. `octavia`, `enyaq-iv`)
 * - infocar owner reviews `/reviews/<brand>/<model>/`    (per-generation ratings)
 * - auto-blog            `/uk/?s=<query>`                 (stock WordPress search)
 * - drive2 (Russian)     `/search?text=<query>`           (its per-model pages need a numeric id, e.g.
 *                          `/cars/skoda/octavia/m2473/`, so a name can't build one)
 *
 * Not included on purpose: avtoporadnyk (no working search URL found), nv.ua (403 to non-browser
 * fetches, `/search` disallowed in robots.txt).
 *
 * infocar needs a brand slug (`brandLogo.ts`) and, for the model page, a plain-Latin model slug;
 * when the model can't be slugged safely the link falls back to the brand-level page rather than
 * guessing. A model slug that infocar doesn't have is still possible (the registry's model text is
 * free-form) — curate a verified (brand, model) list if that proves common (see PLAN.md).
 *
 * `lang` is the language of the *site*, not of the UI: drive2 is tagged `ru` so the UI can badge it.
 */
export const REVIEW_SITES = [
  { id: 'infocar-test-drive', lang: 'uk' },
  { id: 'infocar-reviews', lang: 'uk' },
  { id: 'auto-blog', lang: 'uk' },
  { id: 'drive2', lang: 'ru' }
] as const

export type ReviewSiteId = (typeof REVIEW_SITES)[number]['id']
export type ReviewSiteLang = (typeof REVIEW_SITES)[number]['lang']

export type ReviewLink = {
  site: ReviewSiteId
  lang: ReviewSiteLang
  url: string
}

const LANG_BY_SITE = Object.fromEntries(REVIEW_SITES.map(s => [s.id, s.lang])) as Record<ReviewSiteId, ReviewSiteLang>

/** infocar's model slug: lowercase Latin/digits, words joined by `-`; `null` for Cyrillic or anything odd. */
function infocarModelSlug(model: string | null | undefined): string | null {
  const slug = (model ?? '').trim().toLowerCase().replace(/\s+/g, '-')
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? slug : null
}

/** Review-site links for a raw registry brand + model, `[]` when neither is known. */
export function reviewLinks(brand: string | null | undefined, model: string | null | undefined): ReviewLink[] {
  const vehicle = [brand, model].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (!vehicle) return []

  const urls: [ReviewSiteId, string][] = []
  const slug = brandSlug(brand)
  if (slug) {
    const modelPath = infocarModelSlug(model)
    const tail = modelPath ? `${slug}/${modelPath}/` : `${slug}/`
    urls.push(['infocar-test-drive', `https://www.infocar.ua/test-drive/${tail}`])
    urls.push(['infocar-reviews', `https://www.infocar.ua/reviews/${tail}`])
  }
  const query = encodeURIComponent(vehicle)
  urls.push(['auto-blog', `https://auto-blog.com.ua/uk/?s=${query}`])
  urls.push(['drive2', `https://www.drive2.ru/search?text=${query}`])

  return urls.map(([site, url]) => ({ site, lang: LANG_BY_SITE[site], url }))
}
