/**
 * Pure parsers for infocar.ua's video section (see infocar-videos.ts and PLAN.md "Car reviews" Step 2). Input is the
 * already-decoded HTML (`decodeInfocarHtml`). Markup verified against fixtures/infocar/video-*.html (2026-10-03):
 *
 * - `/video/<brand>/`       `li` per video: `a.preview-img[href=/video/<id>.html]` (+ `img` thumbnail), `i.time` "01:03",
 *                           `.copy > a` title; `.pages a.digit` shows the first pages + the last one (`page-N/`)
 * - `/video/<id>.html`      `iframe[src=youtube.com/embed/<ytid>]`, `h1`,
 *                           `link[rel=canonical]` = `https://<brand>-<model>.infocar.ua/video<id>_<model>_id<n>.html`
 *                           (model-tagged videos only), `#video-date` "8 лип. 2026"
 *
 * Facts and links only: the description text is not read.
 */
import * as cheerio from 'cheerio'

import { absoluteUrl } from './infocar-parse.js'

export type VideoListItem = { id: number; title: string; durationS: number | null; thumbUrl: string | null }
export type VideoPage = {
  youtubeId: string
  title: string
  modelSlug: string | null
  /** infocar generation id (`_id7347`) — the same id as the catalog version page `test_rav4_id7347.html`. */
  generationId: number | null
  publishedAt: string | null
}

/** "01:03" -> 63, "1:02:03" -> 3723; anything else -> null. */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':')
  if (parts.length < 2 || parts.length > 3 || parts.some(p => !/^\d{1,2}$/.test(p))) return null
  return parts.reduce((sum, p) => sum * 60 + Number(p), 0)
}

const MONTH_PREFIXES = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']

/** "8 лип. 2026" -> "2026-07-08"; unparseable -> null. */
export function parseUkDate(text: string): string | null {
  const m = /^\s*(\d{1,2})\s+([а-яіїєґ]{3})[а-яіїєґ.]*\s+(\d{4})\s*$/i.exec(text)
  if (!m) return null
  const month = MONTH_PREFIXES.indexOf(m[2]!.toLowerCase()) + 1
  if (!month) return null
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
}

/** First plausible model year named in a title ("KIA Ceed 2018 ..."), else null. */
export function parseTitleYear(title: string): number | null {
  const year = /\b(19[89]\d|20[0-4]\d)\b/.exec(title)?.[1]
  return year ? Number(year) : null
}

/** The videos on one brand listing page, in page order. */
export function parseVideoListing(html: string): VideoListItem[] {
  const $ = cheerio.load(html)
  const out: VideoListItem[] = []
  $('li').each((_, li) => {
    const $li = $(li)
    const $preview = $li.find('a.preview-img').first()
    const id = /^\/video\/(\d+)\.html$/.exec($preview.attr('href') ?? '')?.[1]
    if (!id) return
    const title = $li.find('.copy > a').first().text().trim()
    if (!title) return
    const thumb = $preview.find('img').attr('src')
    out.push({
      id: Number(id),
      title,
      durationS: parseDuration($li.find('i.time').first().text()),
      thumbUrl: thumb ? absoluteUrl(thumb) : null
    })
  })
  return out
}

/** Highest page number linked from the pager (1 when there is none). */
export function parseLastPage(html: string): number {
  const $ = cheerio.load(html)
  let last = 1
  $('.pages a.digit').each((_, a) => {
    const n = Number(/\/page-(\d+)\/$/.exec($(a).attr('href') ?? '')?.[1])
    if (n > last) last = n
  })
  return last
}

/** One video page, or null when it has no YouTube embed (an infocar-hosted video we can't link to). */
export function parseVideoPage(html: string): VideoPage | null {
  const $ = cheerio.load(html)
  const embed = $('iframe[src*="youtube.com/embed/"]').attr('src') ?? $('a[href*="youtube.com/watch?v="]').attr('href')
  const youtubeId = /(?:embed\/|[?&]v=)([\w-]{11})/.exec(embed ?? '')?.[1]
  if (!youtubeId) return null
  const canonical = $('link[rel="canonical"]').attr('href') ?? ''
  return {
    youtubeId,
    title: $('h1').first().text().trim(),
    modelSlug: /\/video\d+_([a-z0-9-]+)_id\d+\.html$/.exec(canonical)?.[1] ?? null,
    generationId: Number(/\/video\d+_[a-z0-9-]+_id(\d+)\.html$/.exec(canonical)?.[1]) || null,
    publishedAt: parseUkDate($('#video-date').text())
  }
}
