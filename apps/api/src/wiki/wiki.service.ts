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
  leadLanguages,
  pickCommonsCandidate,
  shapeWikiExtract,
  titleMentionsModel,
  wikiDomain,
  wikiDomainChain,
  wikiImageFromInfo,
  wikiImageFromRow,
  wikiImageKey,
  wikiImageRowIsFinal,
  wikiImageRowValues,
  wikiSearchName,
  wikipediaSearchUrl
} from '@carplates/shared'
import type {
  CommonsPages,
  WikiImage,
  WikiImageKey,
  WikiImageFrom,
  WikiImageResponse,
  WikiImageOutcome,
  WikiInfo,
  WikipediaPage,
  WikipediaSearch
} from '@carplates/shared'

import { loadEnv } from '../env.js'
import { WikiImageStore } from './wiki-image.store.js'

export const WIKI_IMAGE_SOURCES = ['commons', 'wiki'] as const
export type WikiImageSource = (typeof WIKI_IMAGE_SOURCES)[number]

/** `yearOnly`: a photo of that model year (or, with `yearBack`, the nearest of that many earlier years) or nothing — never the stored model row / article lead image. */
type LookupOptions = {
  year?: number
  source?: WikiImageSource
  yearOnly?: boolean
  yearBack?: number
  /** On-demand update: ignore stored/hot answers and ask Commons/Wikipedia now (the new photo replaces the stored one). */
  refresh?: boolean
}

/** `settled: false` = the answer came from a failed request, so it must not be memoized as "no photo". */
type Resolved = { image: WikiImage | null; settled: boolean; from?: WikiImageFrom }

const CACHE_MAX = 300
const UPSTREAM_TIMEOUT_MS = 10_000

@Injectable()
export class WikiService {
  private readonly env = loadEnv()
  private readonly logger = new Logger(WikiService.name)
  /** Hot layer in front of `registry.wiki_image` (photo) and the live Wikipedia lookup (extract). Also caches
   *  "not found" (`found: false`) so garbled registry brand/model text doesn't re-hit the API. */
  private readonly cache = new Map<string, WikiInfo>()
  private readonly imageCache = new Map<string, WikiImageResponse>()
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
    const cached = options.refresh ? undefined : this.cache.get(cacheKey)
    if (cached) return cached

    // The UI-language edition first, then the other two (ua → uk, ru, en) — a rare model often has an article in one only.
    const domains = wikiDomainChain(lang)
    // Motorcycle indexes ("R 1200GS") are searched under the article's spelling ("BMW R1200GS").
    const motoAlias = /^bmw\b/i.test(brand) ? wikiSearchName(brand.toLowerCase(), model.toLowerCase()) : null
    const textQuery = motoAlias?.leadQuery ?? query
    const textModel = motoAlias?.model ?? model
    let page: WikipediaPage | null = null
    let articleDomain = domain
    try {
      for (const d of domains) {
        const hit = await this.fetchPage(d, textQuery)
        if (hit && titleMentionsModel(hit.title, textModel)) {
          page = hit
          articleDomain = d
          break
        }
      }
    } catch (err) {
      throw new BadGatewayException(`Wikipedia request failed: ${(err as Error).message}`)
    }

    // The photo is decoration: whatever happens resolving it, the article text is still returned.
    const resolved = page
      ? await this.resolveImage(brand, model, query, year, source, !!options.refresh)
      : { image: null, settled: true }

    const text = page ? shapeWikiExtract(page.extract ?? '') : null
    const result = page
      ? {
          query,
          found: true,
          title: page.title,
          extract: text?.intro || null,
          description: page.description?.trim() || null,
          more: text?.more ?? null,
          articleLang: articleDomain,
          pageUrl: `https://${articleDomain}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
          image: resolved.image
        }
      : { query, found: false, title: null, extract: null, pageUrl: null, image: null }

    if (resolved.settled) this.remember(cacheKey, result)
    return result
  }

  /**
   * The hero photo alone, independent of any Wikipedia article: stored rows first, a live Commons/Wikipedia lookup
   * only when nothing is stored (and that answer is stored). Never fetches the article text.
   */
  async lookupImage(brand: string, model: string, options: LookupOptions = {}): Promise<WikiImageResponse> {
    const query = [brand, model].filter(Boolean).join(' ').trim()
    if (query.length < 2) {
      throw new BadRequestException('Need a brand or model to look up a photo')
    }

    const source = options.source ?? this.env.WIKI_IMAGE_SOURCE
    const year = source === 'commons' && brand && model ? (options.year ?? null) : null
    const yearOnly = !!options.yearOnly && !!year && source === 'commons'
    const yearBack = yearOnly ? (options.yearBack ?? 0) : 0
    const cacheKey = `${source}:${yearOnly ? `y${yearBack || ''}` : ''}${year ?? ''}:${query.toLowerCase()}`
    const refresh = !!options.refresh
    const cached = refresh ? undefined : this.imageCache.get(cacheKey)
    if (cached) return cached

    const resolved = yearOnly
      ? await this.resolveYearOnlyLadder(brand, model, year!, yearBack, refresh)
      : await this.resolveImage(brand, model, query, year, source, refresh)
    const result: WikiImageResponse = { image: resolved.image, from: resolved.image ? resolved.from : undefined }
    // A photo fetched now is stored by the time the next request asks, so the memoized copy reports the table.
    if (resolved.settled)
      this.rememberImage(cacheKey, {
        ...result,
        from: result.from === 'live' && source === 'commons' ? 'db' : result.from
      })
    return result
  }

  /**
   * What `lookupImage` (default options) would answer from storage alone — the hot cache, then the stored
   * `(brand, model, year)` / `(brand, model)` rows — or null when only a live Commons/Wikipedia lookup could tell. Never
   * reaches the network, so it is safe on the card-bundle path; the client asks `lookupImage` itself on a null.
   */
  async peekImage(brand: string, model: string, year: number | null): Promise<WikiImageResponse | null> {
    const query = [brand, model].filter(Boolean).join(' ').trim()
    const source = this.env.WIKI_IMAGE_SOURCE
    if (query.length < 2 || source !== 'commons') return null

    const askedYear = brand && model ? year : null
    const cached = this.imageCache.get(`${source}:${askedYear ?? ''}:${query.toLowerCase()}`)
    if (cached) return cached

    const yearRow = askedYear ? await this.readRow(wikiImageKey(brand, model, askedYear)) : null
    if (yearRow?.status === 'ok') return { image: wikiImageFromRow(yearRow), from: 'db' }
    const modelRow = await this.readRow(wikiImageKey(brand, model))
    if (modelRow?.status === 'ok') return { image: wikiImageFromRow(modelRow), from: 'db' }
    return null
  }

  private async fetchPage(domain: string, query: string): Promise<WikipediaPage | null> {
    const payload = await this.fetchJson<WikipediaSearch>(wikipediaSearchUrl(domain, query, { extract: true }))
    const pages = payload.query?.pages
    return pages ? (Object.values(pages)[0] ?? null) : null
  }

  /** `year`, then each earlier year down to `year - back`: the first photo wins; each year is its own stored row. */
  private async resolveYearOnlyLadder(
    brand: string,
    model: string,
    year: number,
    back: number,
    refresh: boolean
  ): Promise<Resolved> {
    let settled = true
    for (let y = year; y >= year - back; y--) {
      const found = await this.resolveYearOnlyImage(brand, model, y, refresh)
      if (found.image) return found
      settled = settled && found.settled
    }
    return { image: null, settled }
  }

  /** Stored `(brand, model, year)` row, else one live Commons year search (whose answer is stored, "none" included). */
  private async resolveYearOnlyImage(brand: string, model: string, year: number, refresh: boolean): Promise<Resolved> {
    // Own key space: a strict (model-year-only) answer must neither be poisoned by, nor overwrite, the hero photo's looser year row.
    const key = wikiImageKey(`showcase ${brand}`, model, year)
    const row = await this.readRow(key)
    if (!refresh) {
      if (row?.status === 'ok') return { image: wikiImageFromRow(row), settled: true, from: 'db' }
      if (row && wikiImageRowIsFinal(row)) return { image: null, settled: true }
    }
    return this.liveYearImage(brand, model, year, key, row, true)
  }

  /**
   * Photo order: stored `(brand, model, year)` row → stored `(brand, model)` row → live fetch (which stores its answer).
   * `source=wiki` is the A/B knob for the lead image alone, so it bypasses the table.
   * `refresh` skips the stored rows and re-fetches. `from` tells the client which of the two produced the photo.
   */
  private async resolveImage(
    brand: string,
    model: string,
    query: string,
    year: number | null,
    source: WikiImageSource,
    refresh: boolean
  ): Promise<Resolved> {
    if (source === 'wiki')
      return this.fetchLeadImage(brand, query, model)
        .then(found => ({ ...found, from: 'live' as const }))
        .catch(() => ({ image: null, settled: false }))

    const yearKey = year ? wikiImageKey(brand, model, year) : null
    const modelKey = wikiImageKey(brand, model)

    const yearRow = yearKey ? await this.readRow(yearKey) : null
    const modelRow = await this.readRow(modelKey)
    if (!refresh) {
      if (yearRow?.status === 'ok') return { image: wikiImageFromRow(yearRow), settled: true, from: 'db' }
      if (modelRow?.status === 'ok') return { image: wikiImageFromRow(modelRow), settled: true, from: 'db' }
      if (modelRow && wikiImageRowIsFinal(modelRow)) return { image: null, settled: true }
    }

    let settled = true
    if (yearKey && year && (refresh || !yearRow || !wikiImageRowIsFinal(yearRow))) {
      const found = await this.liveYearImage(brand, model, year, yearKey, yearRow)
      if (found.image) return found
      settled = found.settled
    }
    const lead = await this.liveLeadImage(brand, query, model, modelKey, modelRow)
    return { image: lead.image, settled: settled && lead.settled, from: lead.from }
  }

  private async liveYearImage(
    brand: string,
    model: string,
    year: number,
    key: WikiImageKey,
    previous: WikiImageRow | null,
    modelYearOnly = false
  ): Promise<Resolved> {
    try {
      const image = await this.fetchCommonsYearImage(brand, model, year, modelYearOnly)
      await this.persist(
        key,
        image ? { kind: 'ok', image, origin: 'commons_year', title: null } : { kind: 'not_found' },
        previous
      )
      return { image, settled: true, from: 'live' }
    } catch (err) {
      await this.persist(key, this.failure(err), previous)
      return { image: null, settled: false }
    }
  }

  private async liveLeadImage(
    brand: string,
    query: string,
    model: string,
    key: WikiImageKey,
    previous: WikiImageRow | null
  ): Promise<Resolved> {
    try {
      const { image } = await this.fetchLeadImage(brand, query, model)
      await this.persist(
        key,
        image ? { kind: 'ok', image, origin: 'lead', title: null } : { kind: 'not_found' },
        previous
      )
      return { image, settled: true, from: 'live' }
    } catch (err) {
      await this.persist(key, this.failure(err), previous)
      return { image: null, settled: false }
    }
  }

  /** English article first, then the brand's home-country edition and Ukrainian — the image is language-free, so one
   *  stored row still serves every UI language. Throws on a failed search request. */
  private async fetchLeadImage(brand: string, query: string, model: string): Promise<Resolved> {
    // Factory indexes / engine codes ("21104", "e 270 cdi") are searched under their marketing name.
    const alias = wikiSearchName(brand, model)
    for (const lang of leadLanguages(brand)) {
      const payload = await this.fetchJson<WikipediaSearch>(
        wikipediaSearchUrl(lang, alias?.leadQuery ?? query, { leadImage: true })
      )
      const page = Object.values(payload.query?.pages ?? {})[0]
      if (!page?.original) continue
      // Same "an article about a vehicle carries the model in its title" guard as the text lookup; a Cyrillic title
      // (ВАЗ-2110, ЗАЗ Сенс) has nothing the Latin matcher can compare, so the specific alias query vouches for it.
      const titleOk =
        titleMentionsModel(page.title, alias?.model ?? model) || (!!alias && /[а-яіїєґ]/i.test(page.title))
      if (!titleOk) continue

      const attribution = await this.fetchAttribution(page.original.source).catch(() => null)
      const shown = page.thumbnail ?? page.original
      return { image: { url: shown.source, width: shown.width, height: shown.height, attribution }, settled: true }
    }
    return { image: null, settled: true }
  }

  /** Commons files are conventionally named `<year> <Make> <Model> …`, so a quoted make+model plus the year
   *  finds generation-correct photos. One request returns thumbnails and license metadata together. */
  private async fetchCommonsYearImage(
    brand: string,
    model: string,
    year: number,
    modelYearOnly = false
  ): Promise<WikiImage | null> {
    const alias = wikiSearchName(brand, model)
    const searchModel = alias?.model ?? model
    const payload = await this.fetchJson<CommonsPages>(commonsYearSearchUrl(alias?.brand ?? brand, searchModel, year))
    const candidates = commonsPagesInOrder(payload).flatMap(({ title, info }) =>
      info.thumburl && info.mime && info.width && info.height
        ? [{ title, mime: info.mime, width: info.width, height: info.height, info }]
        : []
    )
    const best = pickCommonsCandidate(candidates, searchModel, year, modelYearOnly)
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
    // A refresh that finds nothing (or fails) must not wipe the photo we already have.
    if (previous?.status === 'ok' && outcome.kind !== 'ok') return
    const failures = previous?.status === 'failed' ? previous.attempts : 0
    try {
      await this.store.save(wikiImageRowValues(key, outcome, failures))
    } catch (err) {
      this.logger.warn(`wiki_image write failed: ${(err as Error).message}`)
    }
  }

  private remember(key: string, value: WikiInfo): void {
    this.cache.set(key, value)
    this.evictOldest(this.cache)
  }

  private rememberImage(key: string, value: WikiImageResponse): void {
    this.imageCache.set(key, value)
    this.evictOldest(this.imageCache)
  }

  private evictOldest(cache: Map<string, unknown>): void {
    if (cache.size <= CACHE_MAX) return
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}
