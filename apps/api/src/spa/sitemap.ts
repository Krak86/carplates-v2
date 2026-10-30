import { catalogPath } from '@carplates/shared'

import { alternateLinks, langUrl } from './meta.js'
import { LANGS, STATIC_PAGES } from './spa-text.js'

/** Per-device pages: nothing worth indexing (empty for a crawler). */
const EXCLUDED = new Set(['/history', '/favorites'])

/** Indexable static paths — same set that gets a canonical (non-noindex) meta block. Plate/VIN pages are noindex. */
export const sitemapPaths = (): string[] => Object.keys(STATIC_PAGES).filter(p => !EXCLUDED.has(p))

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The sitemap files, listed by the index at `/sitemap.xml` (each stays far below the 50,000-URL and IndexNow 10,000-URL limits). */
export const SITEMAP_FILES = ['/sitemap-pages.xml', '/sitemap-cars.xml'] as const

const URLSET_OPEN =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'

/** One `<url>` per path × language, each listing the full hreflang set (Google wants the alternates on every entry). */
const urlEntries = (siteUrl: string, paths: readonly string[]): string[] =>
  paths.flatMap(p => {
    const path = p === '/' ? '' : p
    const links = alternateLinks(siteUrl, path)
      .map(a => `<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}"/>`)
      .join('')
    return LANGS.map(l => `  <url><loc>${esc(langUrl(siteUrl, path, l))}</loc>${links}</url>`)
  })

/** The static pages file. */
export function renderSitemap(siteUrl: string): string {
  return `${URLSET_OPEN}\n${urlEntries(siteUrl, sitemapPaths()).join('\n')}\n</urlset>\n`
}

/** The catalog file: the indexable `/cars/:make/:model` pages (the MVP set, widened only while metrics stay flat). */
export function renderCatalogSitemap(siteUrl: string, pages: readonly (readonly [string, string])[]): string {
  const paths = pages.map(([make, model]) => catalogPath(make, model))
  return `${URLSET_OPEN}\n${urlEntries(siteUrl, paths).join('\n')}\n</urlset>\n`
}

/** `/sitemap.xml`: an index of the files above (what robots.txt and Search Console point at). */
export function renderSitemapIndex(siteUrl: string): string {
  const entries = SITEMAP_FILES.map(f => `  <sitemap><loc>${esc(siteUrl + f)}</loc></sitemap>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`
}

/**
 * `/og/<plate|vin>.png` cards are one expensive render per plate (an enumerable set), so they stay blocked; the generic
 * cards that static pages use as `og:image` are allowed, else Twitterbot and Google skip the image. The most specific
 * rule wins, so the `Allow` lines override the `/og/` block.
 */
export const renderRobots = (siteUrl: string): string =>
  `User-agent: *\nDisallow: /api/\nDisallow: /og/\nAllow: /og/default.png\nAllow: /og/page/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
