/**
 * Pure parsers for infocar.ua's catalog pages (see infocar.ts and PLAN.md "Car reviews"). Input is the page's
 * already-decoded HTML — infocar serves windows-1251, so decode with `decodeInfocarHtml` first. Markup verified
 * against the saved pages in fixtures/infocar/ (2026-10-03):
 *
 * - `reviews/marks.html`       `#listmarks li a[href=/reviews/<brand>/]` + `<sup>review count</sup>`; one flat list,
 *                              no section markup — the Russian/Soviet brands are the second alphabetical run
 * - `<tree>/<brand>/`          `#modelsdiv li a[href=/<tree>/<brand>/<model>/]` (+ `<sup>` count in the reviews tree)
 * - `<tree>/<brand>/<model>/`  `#js-modelsdiv-list a.carousel-slide`: `<span>name</span><span>2018 - 2021</span>`,
 *                              href on a per-model subdomain, protocol-relative (`//kia-ceed.infocar.ua/...`)
 * - reviews model page         `meta[itemprop=ratingValue]` + `strong[itemprop=ratingCount]` (model average + count)
 *
 * Facts and links only: no review text, authors or photos are read.
 */
import * as cheerio from 'cheerio'
// eslint-disable-next-line import-x/default -- CJS `export =` typings; esModuleInterop makes the default real
import iconv from 'iconv-lite'

export const INFOCAR_ORIGIN = 'https://www.infocar.ua'

export type InfocarTreeId = 'test_drive' | 'reviews'

export const TREE_PATH: Record<InfocarTreeId, string> = { test_drive: 'test-drive', reviews: 'reviews' }

export type InfocarBrand = { slug: string; name: string; reviewCount: number | null; isRu: boolean }
export type InfocarModel = { slug: string; name: string; reviewCount: number | null }
export type InfocarVersion = { name: string; yearFrom: number | null; yearTo: number | null; url: string }
export type InfocarModelStats = { reviewCount: number; avgRating: number }

/** Decodes a page by its `<meta charset>` (infocar: windows-1251), falling back to UTF-8. */
export function decodeInfocarHtml(buf: Buffer): string {
  const head = buf.subarray(0, 2048).toString('latin1')
  const charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8'
  return iconv.encodingExists(charset) ? iconv.decode(buf, charset) : buf.toString('utf8')
}

/** `//host/path` and `/path` -> absolute https URL. */
export function absoluteUrl(href: string): string {
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `${INFOCAR_ORIGIN}${href}`
  return href
}

const toInt = (text: string | undefined): number | null => {
  const n = Number.parseInt((text ?? '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

/**
 * "2018 - 2021" -> {2018, 2021}; a second part that isn't a year ("н.в.", "...", empty) or a lone year -> open-ended
 * (`yearTo` null). Anything without a leading year -> both null. (No open-ended example is in the saved fixtures yet.)
 */
export function parseYearRange(text: string): { yearFrom: number | null; yearTo: number | null } {
  const years = text.match(/\b(?:19|20)\d{2}\b/g)?.map(Number) ?? []
  if (!years.length) return { yearFrom: null, yearTo: null }
  const [from, to] = years
  return { yearFrom: from ?? null, yearTo: years.length > 1 ? (to ?? null) : null }
}

/** Brands with review counts from `reviews/marks.html`. `isRu` flips on where the alphabet restarts. */
export function parseBrands(html: string): InfocarBrand[] {
  const $ = cheerio.load(html)
  const out: InfocarBrand[] = []
  let prev = ''
  let ru = false
  $('#listmarks li a').each((_, el) => {
    const slug = /^\/reviews\/([a-z0-9-]+)\/$/.exec($(el).attr('href') ?? '')?.[1]
    if (!slug) return
    // The list is sorted by display name, so slugs wobble by a letter or two (`brp-can-am` after `cadillac`); the
    // Russian/Soviet run is the restart at the start of the alphabet (`zxauto` -> `alfamoto`), a big drop.
    if (prev && prev.charCodeAt(0) - slug.charCodeAt(0) > 3) ru = true
    prev = slug
    const $a = $(el)
    const reviewCount = toInt($a.find('sup').text())
    $a.find('sup').remove()
    out.push({ slug, name: $a.text().trim(), reviewCount, isRu: ru })
  })
  return out
}

/** Models of one brand page (`/<tree>/<brand>/`); the review count exists in the reviews tree only. */
export function parseModels(html: string, tree: InfocarTreeId, brand: string): InfocarModel[] {
  const $ = cheerio.load(html)
  const re = new RegExp(`^/${TREE_PATH[tree]}/${brand}/([a-z0-9-]+)/$`)
  const out: InfocarModel[] = []
  $('#modelsdiv li').each((_, li) => {
    const $a = $(li).find('a').first()
    const slug = re.exec($a.attr('href') ?? '')?.[1]
    if (!slug) return
    out.push({ slug, name: $a.text().trim(), reviewCount: toInt($(li).find('sup').text()) })
  })
  return out
}

/** Version cards ("Ceed" / "2018 - 2021" -> its page) of one model page; deduped by URL, empty when there are none. */
export function parseVersions(html: string): InfocarVersion[] {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const out: InfocarVersion[] = []
  $('#js-modelsdiv-list a.carousel-slide').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const url = absoluteUrl(href)
    if (seen.has(url)) return
    seen.add(url)
    const spans = $(el).find('.copy span')
    out.push({ name: spans.eq(0).text().trim(), ...parseYearRange(spans.eq(1).text()), url })
  })
  return out
}

/** Model-level average rating + review count from a reviews model page, `null` when it has no rating block. */
export function parseModelStats(html: string): InfocarModelStats | null {
  const $ = cheerio.load(html)
  const block = $('[itemprop=aggregateRating]').first()
  const avg = Number.parseFloat(block.find('meta[itemprop=ratingValue]').attr('content') ?? '')
  const count = toInt(block.find('[itemprop=ratingCount]').text())
  return Number.isFinite(avg) && count !== null ? { reviewCount: count, avgRating: avg } : null
}
