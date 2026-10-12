import { STATIC_PAGES } from './spa-text.js'

/** Per-device pages: nothing worth indexing (empty for a crawler). */
const EXCLUDED = new Set(['/history', '/favorites'])

/** Indexable static paths — same set that gets a canonical (non-noindex) meta block. Plate/VIN pages are noindex. */
export const sitemapPaths = (): string[] => Object.keys(STATIC_PAGES).filter(p => !EXCLUDED.has(p))

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function renderSitemap(siteUrl: string): string {
  const urls = sitemapPaths().map(p => `  <url><loc>${esc(siteUrl + (p === '/' ? '' : p))}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export const renderRobots = (siteUrl: string): string =>
  `User-agent: *\nDisallow: /api/\nDisallow: /og/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
