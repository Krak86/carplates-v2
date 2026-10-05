import type { WikiImage, WikiImageAttribution } from './schemas.js'

/** Shared by `apps/api` (`WikiService`, live path) and `scripts/src/wiki-images.ts` (pre-warm): request shapes,
 *  retry policy and row-key rules live here so both write/read the same `registry.wiki_image` rows. */

export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
// One of Wikimedia's standard thumbnail steps (non-standard widths get throttled); ~2x the 672px card.
export const THUMB_WIDTH = 1280
/** MediaWiki's cap on `titles=` per request for anonymous clients. */
export const IMAGEINFO_BATCH = 50
export const SEARCH_PAGE_SIZE = 500

export const WIKI_IMAGE_STATUSES = ['ok', 'not_found', 'failed'] as const
export type WikiImageStatus = (typeof WIKI_IMAGE_STATUSES)[number]

/** Where a stored image came from: a year-matched file, the nearest year that had one, the model's newest-year file
 *  (the year-less row), or the English article's lead image. */
export const WIKI_IMAGE_ORIGINS = ['commons_year', 'commons_nearest', 'commons_model', 'lead'] as const
export type WikiImageOrigin = (typeof WIKI_IMAGE_ORIGINS)[number]

/** `year` 0 = the model-level row (lead / newest-year image), what a lookup falls back to. */
export const MODEL_LEVEL_YEAR = 0

export type WikiImageKey = { brand: string; model: string; year: number }

const normalizeText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

/** Row key for `registry.wiki_image` — lower-cased, whitespace-collapsed, so `KIA`/`Kia ` and `Ceed`/`CEED` share a row. */
export function wikiImageKey(brand: string, model: string, year?: number | null): WikiImageKey {
  return { brand: normalizeText(brand), model: normalizeText(model), year: year ?? MODEL_LEVEL_YEAR }
}

// ---- retry policy ---------------------------------------------------------------------------------------------

export const MAX_ATTEMPTS = 3
export const MAX_RETRY_AFTER_MS = 30_000
const BACKOFF_BASE_MS = 1000
const NOT_FOUND_TTL_MS = 30 * 24 * 3600 * 1000
const HOUR_MS = 3600 * 1000

/** Rate-limit / transient failures worth another try; any other 4xx (bad request, forbidden) won't self-heal. */
export const isRetryableStatus = (status: number | null): boolean => status === null || status === 429 || status >= 500

// MediaWiki sometimes answers 200 with `{ error: { code } }` instead of a 429.
const RETRYABLE_API_ERRORS = new Set(['ratelimited', 'maxlag', 'internal_api_error_DBConnectionError', 'readonly'])

export class WikimediaError extends Error {
  constructor(
    message: string,
    /** HTTP status; null = network error / timeout. */
    readonly status: number | null,
    readonly attempts: number
  ) {
    super(message)
    this.name = 'WikimediaError'
  }

  get retryable(): boolean {
    return isRetryableStatus(this.status)
  }
}

/** Honors `Retry-After` (seconds, capped), else exponential backoff with jitter: ~1 s, ~2 s … */
export function retryDelayMs(attempt: number, retryAfter: string | null, random: () => number = Math.random): number {
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
  return BACKOFF_BASE_MS * 2 ** (attempt - 1) * (1 + random() * 0.5)
}

export type FetchWikimediaOptions = {
  userAgent: string
  timeoutMs?: number
  maxAttempts?: number
  /** Injected so tests (and the script's global throttle) control waiting. */
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  /** Called before every attempt, including the first — the script paces its requests here. */
  beforeRequest?: () => Promise<void>
  /** Called when an attempt fails and will be retried. */
  onRetry?: (info: { attempt: number; status: number | null; delayMs: number }) => void
}

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** GET JSON from a Wikimedia API with retries on 429 / 5xx / timeouts / network errors (never on other 4xx).
 *  Throws `WikimediaError` carrying the last status and the attempts used. */
export async function fetchWikimediaJson<T>(url: URL | string, options: FetchWikimediaOptions): Promise<T> {
  const { userAgent, timeoutMs = 10_000, maxAttempts = MAX_ATTEMPTS, sleep = defaultSleep, random } = options
  for (let attempt = 1; ; attempt++) {
    await options.beforeRequest?.()
    let status: number | null
    let retryAfter: string | null = null
    let message: string
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': userAgent, accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      })
      status = res.status
      retryAfter = res.headers.get('retry-after')
      if (res.ok) {
        const payload = (await res.json()) as T & { error?: { code?: string; info?: string } }
        const code = payload.error?.code
        if (!code) return payload
        message = `Wikimedia API error ${code}${payload.error?.info ? `: ${payload.error.info}` : ''}`
        status = RETRYABLE_API_ERRORS.has(code) ? 429 : 400
      } else {
        message = `Wikimedia request failed: status ${res.status}`
      }
    } catch (err) {
      status = null
      message = `Wikimedia request failed: ${(err as Error).name === 'TimeoutError' ? 'timeout' : (err as Error).message}`
    }

    if (!isRetryableStatus(status) || attempt >= maxAttempts) throw new WikimediaError(message, status, attempt)
    const delayMs = retryDelayMs(attempt, retryAfter, random)
    options.onRetry?.({ attempt, status, delayMs })
    await sleep(delayMs)
  }
}

/** When a stored row may be looked at again: `ok` never, `not_found` after ~30 days (a fresh attempt may now find a
 *  photo), `failed` on a 1 h → 6 h → 1 d ladder, or 7 d for a non-retryable 4xx that needs a code fix, not time.
 *  `failures` is the consecutive-failure count including this one. */
export function nextRetryAt(
  status: WikiImageStatus,
  failures: number,
  httpStatus: number | null,
  now: Date = new Date()
): Date | null {
  if (status === 'ok') return null
  if (status === 'not_found') return new Date(now.getTime() + NOT_FOUND_TTL_MS)
  const hours = !isRetryableStatus(httpStatus) ? 24 * 7 : failures <= 1 ? 1 : failures === 2 ? 6 : 24
  return new Date(now.getTime() + hours * HOUR_MS)
}

// ---- stored rows ----------------------------------------------------------------------------------------------

export type WikiImageOutcome =
  | { kind: 'ok'; image: WikiImage; origin: WikiImageOrigin; title: string | null }
  | { kind: 'not_found' }
  | { kind: 'failed'; httpStatus: number | null; error: string }

/** Plain-object twin of `WikiImageInsert` (`@carplates/db`) so the API and the script build identical rows. */
export type WikiImageRowValues = WikiImageKey & {
  status: WikiImageStatus
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  attrAuthor: string | null
  attrLicense: string | null
  attrLicenseUrl: string | null
  origin: WikiImageOrigin | null
  title: string | null
  lastHttpStatus: number | null
  lastError: string | null
  attempts: number
  nextRetryAt: Date | null
}

/** `previousFailures` = the existing row's consecutive-failure count (0 when none or not failed). */
export function wikiImageRowValues(
  key: WikiImageKey,
  outcome: WikiImageOutcome,
  previousFailures = 0,
  now: Date = new Date()
): WikiImageRowValues {
  const empty = {
    imageUrl: null,
    imageWidth: null,
    imageHeight: null,
    attrAuthor: null,
    attrLicense: null,
    attrLicenseUrl: null,
    origin: null,
    title: null,
    lastHttpStatus: null,
    lastError: null,
    attempts: 0
  }
  if (outcome.kind === 'ok') {
    const { image } = outcome
    return {
      ...key,
      ...empty,
      status: 'ok',
      imageUrl: image.url,
      imageWidth: image.width,
      imageHeight: image.height,
      attrAuthor: image.attribution?.author ?? null,
      attrLicense: image.attribution?.license ?? null,
      attrLicenseUrl: image.attribution?.licenseUrl ?? null,
      origin: outcome.origin,
      title: outcome.title,
      nextRetryAt: null
    }
  }
  if (outcome.kind === 'not_found') {
    return { ...key, ...empty, status: 'not_found', nextRetryAt: nextRetryAt('not_found', 0, null, now) }
  }
  const failures = previousFailures + 1
  return {
    ...key,
    ...empty,
    status: 'failed',
    lastHttpStatus: outcome.httpStatus,
    lastError: outcome.error.slice(0, 500),
    attempts: failures,
    nextRetryAt: nextRetryAt('failed', failures, outcome.httpStatus, now)
  }
}

type StoredImageColumns = {
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  attrAuthor: string | null
  attrLicense: string | null
  attrLicenseUrl: string | null
}

export function wikiImageFromRow(row: StoredImageColumns): WikiImage | null {
  if (!row.imageUrl) return null
  const hasAttribution = row.attrAuthor !== null || row.attrLicense !== null || row.attrLicenseUrl !== null
  return {
    url: row.imageUrl,
    width: row.imageWidth ?? 0,
    height: row.imageHeight ?? 0,
    attribution: hasAttribution
      ? { author: row.attrAuthor, license: row.attrLicense, licenseUrl: row.attrLicenseUrl }
      : null
  }
}

/** A stored row answers the lookup (no live fetch): `ok` always; `not_found`/`failed` until their retry time. */
export function wikiImageRowIsFinal(
  row: { status: string; nextRetryAt: Date | null },
  now: Date = new Date()
): boolean {
  if (row.status === 'ok') return true
  return !!row.nextRetryAt && row.nextRetryAt.getTime() > now.getTime()
}

// ---- request shapes -------------------------------------------------------------------------------------------

function apiUrl(base: string, params: Record<string, string>): URL {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set('format', 'json')
  return url
}

/** Wikipedia article search → the first hit's intro extract and/or lead image. */
export function wikipediaSearchUrl(
  domain: string,
  query: string,
  what: { extractChars?: number; leadImage?: boolean }
): URL {
  const props = [what.extractChars ? 'extracts' : '', what.leadImage ? 'pageimages' : ''].filter(Boolean).join('|')
  return apiUrl(`https://${domain}.wikipedia.org/w/api.php`, {
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '1',
    prop: props,
    ...(what.extractChars ? { exintro: '1', explaintext: '1', exchars: String(what.extractChars) } : {}),
    ...(what.leadImage ? { piprop: 'original|thumbnail', pithumbsize: String(THUMB_WIDTH) } : {})
  })
}

/** Commons search that returns thumbnails + licences in the same response (≤20 hits) — the single-lookup live path. */
export function commonsYearSearchUrl(brand: string, model: string, year: number): URL {
  return apiUrl(COMMONS_API, {
    action: 'query',
    generator: 'search',
    gsrsearch: `"${brand} ${model}" ${year} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(THUMB_WIDTH)
  })
}

/** Commons search for titles only (cheap, up to 500 per page) — the pre-warm's one request per model. */
export function commonsTitleSearchUrl(brand: string, model: string, offset = 0): URL {
  return apiUrl(COMMONS_API, {
    action: 'query',
    list: 'search',
    srsearch: `"${brand} ${model}" filetype:bitmap`,
    srnamespace: '6',
    srlimit: String(SEARCH_PAGE_SIZE),
    srprop: '',
    sroffset: String(offset)
  })
}

/** Thumbnails + licences for up to 50 specific files in one request. */
export function commonsImageInfoUrl(titles: string[], withThumb = true): URL {
  return apiUrl(COMMONS_API, {
    action: 'query',
    titles: titles.join('|'),
    prop: 'imageinfo',
    iiprop: withThumb ? 'url|size|mime|extmetadata' : 'extmetadata',
    ...(withThumb ? { iiurlwidth: String(THUMB_WIDTH) } : {})
  })
}

// ---- response shapes ------------------------------------------------------------------------------------------

export type ExtMetadata = Record<string, { value: string }>

export type CommonsImageInfo = {
  thumburl?: string
  thumbwidth?: number
  thumbheight?: number
  width: number
  height: number
  mime: string
  extmetadata?: ExtMetadata
}

export type CommonsPages = {
  query?: {
    pages?: Record<string, { index?: number; title: string; imageinfo?: Array<Partial<CommonsImageInfo>> }>
  }
}

export type CommonsTitleSearch = {
  query?: { search?: Array<{ title: string }> }
  continue?: { sroffset?: number }
}

export type WikipediaPage = {
  title: string
  extract?: string
  original?: { source: string; width: number; height: number }
  thumbnail?: { source: string; width: number; height: number }
}

export type WikipediaSearch = { query?: { pages?: Record<string, WikipediaPage> } }

export const stripHtml = (value: string | undefined): string | null => value?.replace(/<[^>]+>/g, '').trim() || null

export function attributionFromMeta(meta: ExtMetadata | undefined): WikiImageAttribution | null {
  if (!meta) return null
  return {
    author: stripHtml(meta.Artist?.value),
    license: meta.LicenseShortName?.value ?? null,
    licenseUrl: meta.LicenseUrl?.value ?? null
  }
}

/** The 1280 px thumbnail of a Commons file with its licence; null when Commons returned no thumbnail. */
export function wikiImageFromInfo(info: Partial<CommonsImageInfo>): WikiImage | null {
  if (!info.thumburl) return null
  return {
    url: info.thumburl,
    width: info.thumbwidth ?? info.width ?? 0,
    height: info.thumbheight ?? info.height ?? 0,
    attribution: attributionFromMeta(info.extmetadata)
  }
}

/** Search hits in Commons' relevance order, flattened from a `generator=search` response. */
export function commonsPagesInOrder(payload: CommonsPages): Array<{ title: string; info: Partial<CommonsImageInfo> }> {
  return Object.values(payload.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .flatMap(page => (page.imageinfo?.[0] ? [{ title: page.title, info: page.imageinfo[0] }] : []))
}

/** Commons file name (`Foo bar.jpg`) from an `upload.wikimedia.org` URL, original or thumbnail path. */
export function commonsFilenameFromUrl(source: string): string | null {
  try {
    const parts = decodeURIComponent(new URL(source).pathname).split('/')
    // /wikipedia/commons/thumb/5/55/Foo.jpg/1280px-Foo.jpg -> Foo.jpg ; /wikipedia/commons/5/55/Foo.jpg -> Foo.jpg
    return (parts.includes('thumb') ? parts[parts.length - 2] : parts.pop()) || null
  } catch {
    return null
  }
}
