import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import type { WikiImageRow } from '@carplates/db'
import {
  WikimediaError,
  attributionFromMeta,
  commonsFilenameFromUrl,
  commonsImageInfoUrl,
  commonsPagesInOrder,
  commonsYearSearchUrl,
  fetchWikimediaJson,
  pickCommonsCandidate,
  titleMentionsModel,
  wikiDomain,
  wikiImageFromInfo,
  wikiImageFromRow,
  wikiImageKey,
  wikiImageRowIsFinal,
  wikiImageRowValues,
  wikipediaSearchUrl
} from '@carplates/shared'
import type {
  CommonsPages,
  WikiImage,
  WikiImageKey,
  WikiImageOutcome,
  WikiInfo,
  WikipediaPage,
  WikipediaSearch
} from '@carplates/shared'

import { loadEnv } from '../env.js'
import { WikiImageStore } from './wiki-image.store.js'

export const WIKI_IMAGE_SOURCES = ['commons', 'wiki'] as const
export type WikiImageSource = (typeof WIKI_IMAGE_SOURCES)[number]

type LookupOptions = { year?: number; source?: WikiImageSource }

/** `settled: false` = the answer came from a failed request, so it must not be memoized as "no photo". */
type Resolved = { image: WikiImage | null; settled: boolean }

const CACHE_MAX = 300
const UPSTREAM_TIMEOUT_MS = 10_000
// Intro-section cap (MediaWiki cuts at a sentence boundary); roughly the whole lead of a typical car article.
const EXTRACT_CHARS = 1800

@Injectable()
export class WikiService {
  private readonly env = loadEnv()
  private readonly logger = new Logger(WikiService.name)
  /** Hot layer in front of `registry.wiki_image` (photo) and the live Wikipedia lookup (extract). Also caches
   *  "not found" (`found: false`) so garbled registry brand/model text doesn't re-hit the API. */
  private readonly cache = new Map<string, WikiInfo>()
  private readonly userAgent = `carsua-app/1.0 (${this.env.PUBLIC_SITE_URL})`

  /** Backoff wait between retries — a property so tests can skip the delay. */
  sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))

  constructor(@Inject(WikiImageStore) private readonly store: WikiImageStore) {}

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

    let page: WikipediaPage | null
    try {
      page = await this.fetchPage(domain, query)
    } catch (err) {
      throw new BadGatewayException(`Wikipedia request failed: ${(err as Error).message}`)
    }

    if (page && !titleMentionsModel(page.title, model)) page = null

    // The photo is decoration: whatever happens resolving it, the article text is still returned.
    const resolved = page ? await this.resolveImage(brand, model, query, year, source) : { image: null, settled: true }

    const result = page
      ? {
          query,
          found: true,
          title: page.title,
          extract: page.extract?.trim() || null,
          pageUrl: `https://${domain}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
          image: resolved.image
        }
      : { query, found: false, title: null, extract: null, pageUrl: null, image: null }

    if (resolved.settled) this.remember(cacheKey, result)
    return result
  }

  private async fetchPage(domain: string, query: string): Promise<WikipediaPage | null> {
    const payload = await this.fetchJson<WikipediaSearch>(
      wikipediaSearchUrl(domain, query, { extractChars: EXTRACT_CHARS })
    )
    const pages = payload.query?.pages
    return pages ? (Object.values(pages)[0] ?? null) : null
  }

  /**
   * Photo order: stored `(brand, model, year)` row → stored `(brand, model)` row → live fetch (which stores its answer).
   * `source=wiki` is the A/B knob for the lead image alone, so it bypasses the table.
   */
  private async resolveImage(
    brand: string,
    model: string,
    query: string,
    year: number | null,
    source: WikiImageSource
  ): Promise<Resolved> {
    if (source === 'wiki') return this.fetchLeadImage(query, model).catch(() => ({ image: null, settled: false }))

    const yearKey = year ? wikiImageKey(brand, model, year) : null
    const modelKey = wikiImageKey(brand, model)

    const yearRow = yearKey ? await this.readRow(yearKey) : null
    if (yearRow?.status === 'ok') return { image: wikiImageFromRow(yearRow), settled: true }

    const modelRow = await this.readRow(modelKey)
    if (modelRow?.status === 'ok') return { image: wikiImageFromRow(modelRow), settled: true }
    if (modelRow && wikiImageRowIsFinal(modelRow)) return { image: null, settled: true }

    let settled = true
    if (yearKey && year && (!yearRow || !wikiImageRowIsFinal(yearRow))) {
      const found = await this.liveYearImage(brand, model, year, yearKey, yearRow)
      if (found.image) return found
      settled = found.settled
    }
    const lead = await this.liveLeadImage(query, model, modelKey, modelRow)
    return { image: lead.image, settled: settled && lead.settled }
  }

  private async liveYearImage(
    brand: string,
    model: string,
    year: number,
    key: WikiImageKey,
    previous: WikiImageRow | null
  ): Promise<Resolved> {
    try {
      const image = await this.fetchCommonsYearImage(brand, model, year)
      await this.persist(
        key,
        image ? { kind: 'ok', image, origin: 'commons_year', title: null } : { kind: 'not_found' },
        previous
      )
      return { image, settled: true }
    } catch (err) {
      await this.persist(key, this.failure(err), previous)
      return { image: null, settled: false }
    }
  }

  private async liveLeadImage(
    query: string,
    model: string,
    key: WikiImageKey,
    previous: WikiImageRow | null
  ): Promise<Resolved> {
    try {
      const { image } = await this.fetchLeadImage(query, model)
      await this.persist(
        key,
        image ? { kind: 'ok', image, origin: 'lead', title: null } : { kind: 'not_found' },
        previous
      )
      return { image, settled: true }
    } catch (err) {
      await this.persist(key, this.failure(err), previous)
      return { image: null, settled: false }
    }
  }

  /** English article only — one stored row then serves every UI language. Throws on a failed search request. */
  private async fetchLeadImage(query: string, model: string): Promise<Resolved> {
    const payload = await this.fetchJson<WikipediaSearch>(wikipediaSearchUrl('en', query, { leadImage: true }))
    const page = Object.values(payload.query?.pages ?? {})[0]
    // Same "an article about a vehicle carries the model in its title" guard as the text lookup.
    if (!page?.original || !titleMentionsModel(page.title, model)) return { image: null, settled: true }

    const attribution = await this.fetchAttribution(page.original.source).catch(() => null)
    const shown = page.thumbnail ?? page.original
    return { image: { url: shown.source, width: shown.width, height: shown.height, attribution }, settled: true }
  }

  /** Commons files are conventionally named `<year> <Make> <Model> …`, so a quoted make+model plus the year
   *  finds generation-correct photos. One request returns thumbnails and license metadata together. */
  private async fetchCommonsYearImage(brand: string, model: string, year: number): Promise<WikiImage | null> {
    const payload = await this.fetchJson<CommonsPages>(commonsYearSearchUrl(brand, model, year))
    const candidates = commonsPagesInOrder(payload).flatMap(({ title, info }) =>
      info.thumburl && info.mime && info.width && info.height
        ? [{ title, mime: info.mime, width: info.width, height: info.height, info }]
        : []
    )
    const best = pickCommonsCandidate(candidates, model, year)
    return best ? wikiImageFromInfo(best.info) : null
  }

  private async fetchAttribution(imageUrl: string): Promise<WikiImage['attribution']> {
    const filename = commonsFilenameFromUrl(imageUrl)
    if (!filename) return null

    const payload = await this.fetchJson<CommonsPages>(commonsImageInfoUrl([`File:${filename}`], false))
    const page = Object.values(payload.query?.pages ?? {})[0]
    return attributionFromMeta(page?.imageinfo?.[0]?.extmetadata)
  }

  private fetchJson<T>(url: URL): Promise<T> {
    return fetchWikimediaJson<T>(url, {
      userAgent: this.userAgent,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      sleep: ms => this.sleep(ms)
    })
  }

  private failure(err: unknown): WikiImageOutcome {
    const status = err instanceof WikimediaError ? err.status : null
    const error = (err as Error).message
    this.logger.warn(`Wikimedia image lookup failed (${status ?? 'network'}): ${error}`)
    return { kind: 'failed', httpStatus: status, error }
  }

  /** The table is a cache — a DB hiccup must not break the lookup, so reads and writes degrade to "live only". */
  private async readRow(key: WikiImageKey): Promise<WikiImageRow | null> {
    try {
      return await this.store.find(key)
    } catch (err) {
      this.logger.warn(`wiki_image read failed: ${(err as Error).message}`)
      return null
    }
  }

  private async persist(key: WikiImageKey, outcome: WikiImageOutcome, previous: WikiImageRow | null): Promise<void> {
    const failures = previous?.status === 'failed' ? previous.attempts : 0
    try {
      await this.store.save(wikiImageRowValues(key, outcome, failures))
    } catch (err) {
      this.logger.warn(`wiki_image write failed: ${(err as Error).message}`)
    }
  }

  private remember(key: string, value: WikiInfo): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(key, value)
  }
}
