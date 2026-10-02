import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common'
import { wikiDomain } from '@carplates/shared'
import type { WikiImage, WikiImageAttribution, WikiInfo } from '@carplates/shared'

import { loadEnv } from '../env.js'
import { pickCommonsCandidate, titleMentionsModel } from './commons-image.js'

interface MediaWikiImage {
  source: string
  width: number
  height: number
}

interface MediaWikiPage {
  title: string
  extract?: string
  original?: MediaWikiImage
  thumbnail?: MediaWikiImage
}

interface MediaWikiSearchResponse {
  query?: { pages?: Record<string, MediaWikiPage> }
}

interface CommonsImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{
          extmetadata?: Record<string, { value: string }>
        }>
      }
    >
  }
}

interface CommonsSearchResponse {
  query?: {
    pages?: Record<
      string,
      {
        index?: number
        title: string
        imageinfo?: Array<{
          thumburl?: string
          thumbwidth?: number
          thumbheight?: number
          width: number
          height: number
          mime: string
          extmetadata?: Record<string, { value: string }>
        }>
      }
    >
  }
}

export const WIKI_IMAGE_SOURCES = ['commons', 'wiki'] as const
export type WikiImageSource = (typeof WIKI_IMAGE_SOURCES)[number]

type LookupOptions = { year?: number; source?: WikiImageSource }

const CACHE_MAX = 300
const UPSTREAM_TIMEOUT_MS = 10_000
// One of Wikimedia's standard thumbnail steps (non-standard widths get throttled); ~2x the 672px card.
const THUMB_WIDTH = 1280

@Injectable()
export class WikiService {
  private readonly env = loadEnv()
  /** A brand/model's Wikipedia summary doesn't change minute to minute — a plain bounded map is
   *  enough until Redis (Phase 4), same rationale as `VinService`/`PhotosService`. Also caches
   *  "not found" (`found: false`) so garbled registry brand/model text doesn't re-hit the API. */
  private readonly cache = new Map<string, WikiInfo>()
  private readonly userAgent = `carsua-app/1.0 (${this.env.PUBLIC_SITE_URL})`

  async lookup(brand: string, model: string, lang: string, options: LookupOptions = {}): Promise<WikiInfo> {
    const query = [brand, model].filter(Boolean).join(' ').trim()
    if (query.length < 2) {
      throw new BadRequestException('Need a brand or model to search Wikipedia')
    }

    const domain = wikiDomain(lang)
    const source = options.source ?? this.env.WIKI_IMAGE_SOURCE
    // Year only matters to the year-aware strategy; keep it out of the key otherwise so `wiki` entries still share.
    const year = source === 'commons' && brand && model ? (options.year ?? null) : null
    const cacheKey = `${domain}:${source}:${year ?? ''}:${query.toLowerCase()}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    let page: MediaWikiPage | null
    try {
      page = await this.fetchPage(domain, query)
    } catch (err) {
      throw new BadGatewayException(`Wikipedia request failed: ${(err as Error).message}`)
    }

    if (page && !titleMentionsModel(page.title, model)) page = null

    // The article's lead image is always the newest generation, so a known year gets a Commons
    // file search first (best-effort: any failure or no match falls back to the lead image).
    const yearImage = year ? await this.fetchCommonsYearImage(brand, model, year).catch(() => null) : null

    const result = page
      ? {
          query,
          found: true,
          title: page.title,
          extract: page.extract?.trim() || null,
          pageUrl: `https://${domain}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
          image: yearImage ?? (page.original ? await this.fetchImage(page.original, page.thumbnail) : null)
        }
      : { query, found: false, title: null, extract: null, pageUrl: null, image: null }

    this.remember(cacheKey, result)
    return result
  }

  private async fetchPage(domain: string, query: string): Promise<MediaWikiPage | null> {
    const url = new URL(`https://${domain}.wikipedia.org/w/api.php`)
    url.searchParams.set('action', 'query')
    url.searchParams.set('generator', 'search')
    url.searchParams.set('gsrsearch', query)
    url.searchParams.set('gsrlimit', '1')
    url.searchParams.set('prop', 'pageimages|extracts')
    url.searchParams.set('exintro', '1')
    url.searchParams.set('explaintext', '1')
    url.searchParams.set('exchars', '600')
    url.searchParams.set('piprop', 'original|thumbnail')
    url.searchParams.set('pithumbsize', String(THUMB_WIDTH))
    url.searchParams.set('format', 'json')

    const payload = await this.fetchJson<MediaWikiSearchResponse>(url)
    const pages = payload.query?.pages
    return pages ? (Object.values(pages)[0] ?? null) : null
  }

  /** Best-effort — an image without resolvable attribution is still usable, just shown uncredited.
   *  Attribution is looked up by the original's filename; thumbnail URLs carry a `1280px-` prefix. */
  private async fetchImage(original: MediaWikiImage, thumbnail: MediaWikiImage | undefined): Promise<WikiImage> {
    const attribution = await this.fetchAttribution(original.source).catch(() => null)
    const shown = thumbnail ?? original
    return { url: shown.source, width: shown.width, height: shown.height, attribution }
  }

  /** Commons files are conventionally named `<year> <Make> <Model> …`, so a quoted make+model plus the year
   *  finds generation-correct photos. One request returns thumbnails and license metadata together. */
  private async fetchCommonsYearImage(brand: string, model: string, year: number): Promise<WikiImage | null> {
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('generator', 'search')
    url.searchParams.set('gsrsearch', `"${brand} ${model}" ${year} filetype:bitmap`)
    url.searchParams.set('gsrnamespace', '6')
    url.searchParams.set('gsrlimit', '20')
    url.searchParams.set('prop', 'imageinfo')
    url.searchParams.set('iiprop', 'url|size|mime|extmetadata')
    url.searchParams.set('iiurlwidth', String(THUMB_WIDTH))
    url.searchParams.set('format', 'json')

    const payload = await this.fetchJson<CommonsSearchResponse>(url)
    const pages = Object.values(payload.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))

    const candidates = pages.flatMap(page => {
      const info = page.imageinfo?.[0]
      return info?.thumburl
        ? [{ title: page.title, mime: info.mime, width: info.width, height: info.height, info }]
        : []
    })
    const best = pickCommonsCandidate(candidates, model, year)
    if (!best) return null

    const { info } = best
    const meta = info.extmetadata
    return {
      url: info.thumburl ?? '',
      width: info.thumbwidth ?? info.width,
      height: info.thumbheight ?? info.height,
      attribution: meta
        ? {
            author: this.stripHtml(meta.Artist?.value),
            license: meta.LicenseShortName?.value ?? null,
            licenseUrl: meta.LicenseUrl?.value ?? null
          }
        : null
    }
  }

  private async fetchAttribution(imageUrl: string): Promise<WikiImageAttribution | null> {
    const filename = this.filenameFromUrl(imageUrl)
    if (!filename) return null

    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', `File:${filename}`)
    url.searchParams.set('prop', 'imageinfo')
    url.searchParams.set('iiprop', 'extmetadata')
    url.searchParams.set('format', 'json')

    const payload = await this.fetchJson<CommonsImageInfoResponse>(url)
    const pages = payload.query?.pages
    const page = pages ? Object.values(pages)[0] : undefined
    const meta = page?.imageinfo?.[0]?.extmetadata
    if (!meta) return null

    return {
      author: this.stripHtml(meta.Artist?.value),
      license: meta.LicenseShortName?.value ?? null,
      licenseUrl: meta.LicenseUrl?.value ?? null
    }
  }

  private filenameFromUrl(source: string): string | null {
    try {
      const path = decodeURIComponent(new URL(source).pathname)
      return path.split('/').pop() || null
    } catch {
      return null
    }
  }

  private stripHtml(value: string | undefined): string | null {
    if (!value) return null
    return value.replace(/<[^>]+>/g, '').trim() || null
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const res = await fetch(url, {
      headers: { 'user-agent': this.userAgent, accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`Wikimedia request failed: status ${res.status}`)
    return (await res.json()) as T
  }

  private remember(key: string, value: WikiInfo): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(key, value)
  }
}
