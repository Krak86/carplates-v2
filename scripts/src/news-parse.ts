/**
 * Pure parsing for the auto-news ingest (news.ts): RSS 2.0 XML -> `FeedItem[]`, plus charset detection (infocar's feeds
 * are windows-1251) and the validated `news-sources.json` list. Facts only — title, ≤300-char plain-text summary,
 * image URL, date, url — article text is never kept.
 */
import * as cheerio from 'cheerio'
// eslint-disable-next-line import-x/default -- CJS `export =` typings; esModuleInterop makes the default real
import iconv from 'iconv-lite'
import { z } from 'zod'

export const SUMMARY_MAX = 300

/** Namespaced image tags (`media:content`) can't be CSS selectors, so they are matched by name. */
const MEDIA_TAGS = new Set(['media:content', 'media:thumbnail'])

export const newsSourceSchema = z.object({
  /** Stable key stored in `news_items.source`. */
  id: z.string().min(1),
  /** Display name (several feeds may share one, e.g. the three infocar.ua feeds). */
  name: z.string().min(1),
  url: z.url(),
  lang: z.enum(['uk', 'ru', 'en']),
  enabled: z.boolean().default(true),
  /** Whole-site feeds: keep only items carrying one of these `<category>` values (exact, case-insensitive); the rest are dropped. */
  onlyCategories: z.array(z.string().min(1)).optional(),
  note: z.string().optional()
})
export const newsSourcesSchema = z.array(newsSourceSchema)
export type NewsSource = z.infer<typeof newsSourceSchema>

export type FeedItem = {
  url: string
  title: string
  summary: string | null
  imageUrl: string | null
  publishedAt: Date | null
  categories: string[]
}

/** Bytes -> text: the XML declaration's encoding wins, then the `Content-Type` charset, else UTF-8. */
export function decodeFeed(bytes: Uint8Array, contentType?: string | null): string {
  const head = Buffer.from(bytes.subarray(0, 200)).toString('latin1')
  const declared =
    /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1] ?? /charset=([\w-]+)/i.exec(contentType ?? '')?.[1]
  const encoding = declared?.toLowerCase() ?? 'utf-8'
  return iconv.encodingExists(encoding)
    ? iconv.decode(Buffer.from(bytes), encoding)
    : Buffer.from(bytes).toString('utf8')
}

const squeeze = (s: string): string => s.replace(/\s+/g, ' ').trim()

/** HTML-ish description -> plain text of at most `SUMMARY_MAX` chars (cut at a word, `…` when shortened); `null` when empty. */
export function plainSummary(html: string): string | null {
  const text = squeeze(cheerio.load(html).text())
  if (!text) return null
  if (text.length <= SUMMARY_MAX) return text
  const cut = text.slice(0, SUMMARY_MAX)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), SUMMARY_MAX / 2))}…`
}

const absolute = (href: string | undefined): string | null => {
  if (!href) return null
  try {
    const url = new URL(href.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/** Items of an RSS 2.0 feed; items without a title or an http(s) link are dropped. */
export function parseFeed(xml: string): FeedItem[] {
  const $ = cheerio.load(xml, { xml: true })
  const items: FeedItem[] = []
  $('item').each((_, el) => {
    const item = $(el)
    const url = absolute(item.children('link').first().text())
    const title = squeeze(cheerio.load(item.children('title').first().text()).text())
    if (!url || !title) return

    const description = item.children('description').first().text()
    const enclosure = item.children('enclosure').filter((_i, e) => /^image\//.test($(e).attr('type') ?? 'image/'))
    const imageUrl =
      absolute(enclosure.first().attr('url')) ??
      absolute(
        item
          .children()
          .filter((_i, e) => e.type === 'tag' && MEDIA_TAGS.has(e.name))
          .first()
          .attr('url')
      ) ??
      absolute(cheerio.load(description)('img').first().attr('src'))
    const published = Date.parse(item.children('pubDate').first().text())

    items.push({
      url,
      title,
      summary: plainSummary(description),
      imageUrl,
      publishedAt: Number.isNaN(published) ? null : new Date(published),
      categories: item
        .children('category')
        .map((_i, c) => squeeze($(c).text()))
        .get()
        .filter(Boolean)
    })
  })
  return items
}

/** Does the item carry any of `wanted` as a category (exact match, case-insensitive)? */
export function hasCategory(item: Pick<FeedItem, 'categories'>, wanted: string[]): boolean {
  const lower = new Set(wanted.map(w => w.toLowerCase()))
  return item.categories.some(c => lower.has(c.toLowerCase()))
}
