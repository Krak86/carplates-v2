/**
 * Pure parsing for the tech-press ingest (press.ts): a "test drive" tag listing page -> article URLs, and an article's
 * `<head>` (hreflang alternates, og:title, meta description, keywords/tags, publication date) -> one language edition.
 * Facts + links only; article text is never kept.
 */
import { titleYear } from '@carplates/shared'
import type { PressLang } from '@carplates/shared'

import { decodeEntities } from './topgear-parse.js'

export const PRESS_SOURCES = ['itc', 'mezha'] as const
export type PressSource = (typeof PRESS_SOURCES)[number]

const BLURB_MAX = 300

export const PRESS_ORIGIN: Record<PressSource, string> = { itc: 'https://itc.ua', mezha: 'https://mezha.ua' }

/** Listing page URL of a source's Ukrainian "test drive" tag; `page` 1 is the bare tag URL. */
export function listingUrl(source: PressSource, page: number): string {
  if (source === 'itc') return `https://itc.ua/ua/tag/test-drayv-ua/${page > 1 ? `page/${page}/` : ''}`
  return page > 1 ? `https://mezha.ua/tag/test-drayv/?page=${page}` : 'https://mezha.ua/tag/test-drayv/'
}

const LISTING_LINK: Record<PressSource, RegExp> = {
  // Only cards of the tag's own loop (`post … tag-test-drayv-ua`); sidebars repeat `entry-title` for unrelated articles.
  itc: /<div class="post [^"]*\btag-test-drayv-ua\b[^"]*"[\s\S]*?entry-title[^>]*>\s*<a\s+href="(https:\/\/itc\.ua\/ua\/[^"]+)"/g,
  mezha: /class="article_title">\s*<a\s+href="(https:\/\/mezha\.ua\/(?:articles|reviews)\/[^"]+)"/g
}

/** Article URLs of one listing page, in page order (the articles' own cards only — not sidebars or other widgets). */
export function parseListing(html: string, source: PressSource): string[] {
  return [...new Set([...html.matchAll(LISTING_LINK[source])].map(m => decodeEntities(m[1]!)))]
}

const meta = (html: string, attr: 'name' | 'property', key: string): string | null => {
  const tag = new RegExp(`<meta[^>]*\\b${attr}="${key}"[^>]*>`, 'i').exec(html)?.[0]
  const content = tag ? /\bcontent="([^"]*)"/i.exec(tag)?.[1] : null
  return content ? decodeEntities(content).replace(/\s+/g, ' ').trim() || null : null
}

const toLang = (hreflang: string): PressLang | null => {
  const base = hreflang.toLowerCase().split('-')[0]
  return base === 'uk' || base === 'ru' || base === 'en' ? base : null
}

export type PressArticle = {
  /** The page's own URL (`og:url`). */
  url: string
  title: string
  blurb: string | null
  /** `YYYY-MM-DD`. */
  publishedAt: string | null
  /** Tags/keywords the outlet filed it under (often the model), joined with `, `. */
  keywords: string
  /** Every language edition the page links to via hreflang, including itself. */
  alternates: Partial<Record<PressLang, string>>
}

export function parseArticle(html: string): PressArticle | null {
  const url = meta(html, 'property', 'og:url')
  const title = meta(html, 'property', 'og:title') ?? /<title>([^<]+)<\/title>/i.exec(html)?.[1]
  if (!url || !title) return null

  const alternates: PressArticle['alternates'] = {}
  for (const tag of html.matchAll(/<link\b[^>]*\bhreflang="([^"]+)"[^>]*>/gi)) {
    const lang = toLang(tag[1]!)
    const href = /\bhref="([^"]+)"/i.exec(tag[0])?.[1]
    if (lang && href) alternates[lang] = decodeEntities(href)
  }

  const tags = [...html.matchAll(/<meta[^>]*\bproperty="article:tag"[^>]*>/gi)].map(m =>
    decodeEntities(/\bcontent="([^"]*)"/i.exec(m[0])?.[1] ?? '')
  )
  const keywords = [meta(html, 'name', 'keywords') ?? '', ...tags].filter(Boolean).join(', ')

  const published =
    meta(html, 'property', 'article:published_time') ?? /"datePublished"\s*:\s*"([^"]+)"/.exec(html)?.[1] ?? null
  const description = meta(html, 'name', 'description') ?? meta(html, 'property', 'og:description')

  return {
    url,
    title: decodeEntities(title).replace(/\s+/g, ' ').trim(),
    blurb: description ? description.slice(0, BLURB_MAX) : null,
    publishedAt: published && /^\d{4}-\d{2}-\d{2}/.test(published) ? published.slice(0, 10) : null,
    keywords,
    alternates
  }
}

/** A model year named in any of the titles, else `null`. */
export function yearHintOf(titles: string[]): number | null {
  for (const t of titles) {
    const y = titleYear(t)
    if (y) return y
  }
  return null
}
