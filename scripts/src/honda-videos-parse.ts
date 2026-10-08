/**
 * Pure parsing for the honda.ua video ingest (honda-videos.ts): an article page -> the YouTube ids it embeds, and the
 * (brand-stripped) title. Facts + links only; article text is never kept.
 */
import { namesModel, pressTokens, titleYear } from '@carplates/shared'

import { decodeEntities } from './topgear-parse.js'

export const HONDA_ORIGIN = 'https://honda.ua'
export const HONDA_SITEMAP = `${HONDA_ORIGIN}/press-review-sitemap.xml`
export const HONDA_BRAND_SLUG = 'honda'

const YOUTUBE_ID = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})(?![\w-])/g

/** Distinct YouTube ids embedded or linked in the page, in page order. */
export function parseYoutubeIds(html: string): string[] {
  return [...new Set([...html.matchAll(YOUTUBE_ID)].map(m => m[1]!))]
}

/** `Чей ГИБРИД круче? RAV4 vs Honda CR-V · Хонда Україна` -> the title without the site suffix. */
export function cleanTitle(title: string): string {
  return title.replace(/\s*[·|–—-]\s*Хонда Україна\s*$/u, '').trim()
}

/** The catalog model slugs the given texts (title, tags) name, longest first; `[]` for a brand-only article. */
export function modelSlugsIn(texts: string[], modelSlugs: string[]): string[] {
  const words = texts.flatMap(t => pressTokens(t))
  return modelSlugs
    .filter(slug => namesModel(words, pressTokens(slug).join(''), [HONDA_BRAND_SLUG]))
    .sort((a, b) => b.length - a.length)
}

/** A model year named in the title, else `null`. */
export const yearOf = (title: string): number | null => titleYear(title)

export const HONDA_LISTING = `${HONDA_ORIGIN}/avto/pres-ohliad/`

/** Listing page URL; page 1 is the bare listing. */
export const listingPageUrl = (page: number): string => (page > 1 ? `${HONDA_LISTING}page/${page}/` : HONDA_LISTING)

export type ListingGroup = { heading: string; urls: string[] }

/**
 * The listing's model groups: an `<h3>` such as "Прес-огляд CR-V Hybrid" followed by a list of article links. The heading
 * (without the "Прес-огляд" prefix) is Honda's own model tag for those articles.
 */
export function parseListingGroups(html: string): ListingGroup[] {
  const groups: ListingGroup[] = []
  for (const chunk of html.split(/<h3\b/i).slice(1)) {
    const heading = /^[^>]*>([^<]+)</.exec(chunk)?.[1]
    if (!heading) continue
    const list = /<ul class="uk-list">([\s\S]*?)<\/ul>/.exec(chunk)?.[1] ?? ''
    const urls = [...list.matchAll(/href="(https:\/\/honda\.ua\/press-review\/[^"]+)"/g)].map(m => m[1]!)
    if (urls.length)
      groups.push({
        heading: decodeEntities(heading)
          .replace(/^\s*Прес-огляд\s*/u, '')
          .trim(),
        urls: [...new Set(urls)]
      })
  }
  return groups
}
