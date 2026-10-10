import { BadGatewayException, BadRequestException } from '@nestjs/common'
import type { WikiImageRow } from '@carplates/db'
import type { WikiImageKey, WikiImageRowValues } from '@carplates/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WikiImageStore } from './wiki-image.store.js'
import { WikiService } from './wiki.service.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const textPayload = {
  query: { pages: { '425391': { title: 'Toyota Camry', extract: 'Toyota Camry is a car.' } } }
}

const THUMB_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Toyota_Camry.jpg/1280px-Toyota_Camry.jpg'

const leadPayload = {
  query: {
    pages: {
      '425391': {
        title: 'Toyota Camry',
        original: {
          source: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Toyota_Camry.jpg',
          width: 4000,
          height: 3000
        },
        thumbnail: { source: THUMB_URL, width: 1280, height: 960 }
      }
    }
  }
}

const attributionPayload = {
  query: {
    pages: {
      '123': {
        title: 'File:Toyota_Camry.jpg',
        imageinfo: [
          {
            extmetadata: {
              Artist: { value: 'Someone' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' }
            }
          }
        ]
      }
    }
  }
}

const yearPayload = {
  query: {
    pages: {
      '1': {
        index: 1,
        title: 'File:2008 Toyota Camry EX.jpg',
        imageinfo: [
          {
            thumburl: 'https://upload.wikimedia.org/thumb/camry2008.jpg',
            thumbwidth: 1280,
            thumbheight: 853,
            width: 3000,
            height: 2000,
            mime: 'image/jpeg',
            extmetadata: { Artist: { value: '<a>Jane</a>' }, LicenseShortName: { value: 'CC BY 2.0' } }
          }
        ]
      }
    }
  }
}

/** Routes by request shape: Wikipedia text, Wikipedia lead image, Commons year search, Commons attribution. */
function routeFetch(overrides: { year?: () => Response; lead?: () => Response } = {}): void {
  vi.mocked(fetch).mockImplementation(async input => {
    const url = String(input)
    if (url.includes('commons.wikimedia.org')) {
      return url.includes('titles=')
        ? jsonResponse(attributionPayload)
        : (overrides.year?.() ?? jsonResponse({ query: {} }))
    }
    if (url.includes('pithumbsize')) return overrides.lead?.() ?? jsonResponse(leadPayload)
    return jsonResponse(textPayload)
  })
}

const callsTo = (needle: string): number =>
  vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes(needle)).length

class FakeStore {
  readonly rows = new Map<string, WikiImageRow>()
  private id = (k: WikiImageKey): string => `${k.brand}|${k.model}|${k.year}`

  async find(key: WikiImageKey): Promise<WikiImageRow | null> {
    return this.rows.get(this.id(key)) ?? null
  }

  async save(values: WikiImageRowValues): Promise<void> {
    this.rows.set(this.id(values), { ...values, updatedAt: new Date() } as WikiImageRow)
  }
}

function makeService(store = new FakeStore()): { service: WikiService; store: FakeStore } {
  const service = new WikiService(store as unknown as WikiImageStore)
  service.sleep = async () => {}
  return { service, store }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('WikiService', () => {
  it('resolves the article text, the English lead image and its attribution, and stores the photo', async () => {
    routeFetch()
    const { service, store } = makeService()

    const result = await service.lookup('Toyota', 'Camry', 'en')

    expect(result).toEqual({
      query: 'Toyota Camry',
      found: true,
      title: 'Toyota Camry',
      extract: 'Toyota Camry is a car.',
      description: null,
      more: null,
      articleLang: 'en',
      pageUrl: 'https://en.wikipedia.org/wiki/Toyota_Camry',
      image: {
        url: THUMB_URL,
        width: 1280,
        height: 960,
        attribution: {
          author: 'Someone',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0'
        }
      }
    })
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      headers: { 'user-agent': expect.stringContaining('carsua-app') }
    })
    expect(callsTo('titles=File%3AToyota_Camry.jpg')).toBe(1)
    expect(store.rows.get('toyota|camry|0')).toMatchObject({ status: 'ok', origin: 'lead', imageUrl: THUMB_URL })
  })

  it('falls back to the English article when the UI-language edition has none', async () => {
    vi.mocked(fetch).mockImplementation(async input => {
      const url = String(input)
      if (url.includes('commons.wikimedia.org')) return jsonResponse({ query: {} })
      if (url.includes('pithumbsize')) return jsonResponse(leadPayload)
      return url.includes('en.wikipedia.org') ? jsonResponse(textPayload) : jsonResponse({ query: {} })
    })
    const { service } = makeService()

    const result = await service.lookup('Toyota', 'Camry', 'ua')

    expect(result).toMatchObject({
      found: true,
      articleLang: 'en',
      pageUrl: 'https://en.wikipedia.org/wiki/Toyota_Camry'
    })
  })

  it('tries uk, then ru, then en for a Ukrainian UI and takes the first edition with the article', async () => {
    vi.mocked(fetch).mockImplementation(async input => {
      const url = String(input)
      if (url.includes('commons.wikimedia.org')) return jsonResponse({ query: {} })
      if (url.includes('pithumbsize')) return jsonResponse(leadPayload)
      return url.includes('ru.wikipedia.org') ? jsonResponse(textPayload) : jsonResponse({ query: {} })
    })
    const { service } = makeService()

    const result = await service.lookup('Toyota', 'Camry', 'ua')

    expect(result).toMatchObject({ found: true, articleLang: 'ru' })
    const hosts = vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url)).host)
    expect(hosts.slice(0, 2)).toEqual(['uk.wikipedia.org', 'ru.wikipedia.org'])
  })

  it('maps a UA language code to the uk.wikipedia.org domain, but takes the photo from the English article', async () => {
    routeFetch()
    const { service } = makeService()
    await service.lookup('Toyota', 'Camry', 'ua')

    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
    expect(urls[0]).toContain('uk.wikipedia.org')
    expect(urls.find(u => u.includes('pithumbsize'))).toContain('en.wikipedia.org')
  })

  it('keeps the answer in memory and does not call fetch twice', async () => {
    routeFetch()
    const { service } = makeService()
    await service.lookup('Toyota', 'Camry', 'en')
    const calls = vi.mocked(fetch).mock.calls.length
    await service.lookup('Toyota', 'Camry', 'en')

    expect(vi.mocked(fetch).mock.calls.length).toBe(calls)
  })

  it('returns found: false, without touching the image API, when the search has no results', async () => {
    vi.mocked(fetch).mockImplementation(async () => jsonResponse({ query: { pages: {} } }))
    const { service } = makeService()

    expect(await service.lookup('Asdfgh', 'Qwerty', 'en')).toEqual({
      query: 'Asdfgh Qwerty',
      found: false,
      title: null,
      extract: null,
      pageUrl: null,
      image: null
    })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('serves a stored year photo with no Wikimedia call besides the article text', async () => {
    routeFetch()
    const { service, store } = makeService()
    await store.save({
      brand: 'toyota',
      model: 'camry',
      year: 2008,
      status: 'ok',
      imageUrl: 'https://upload.wikimedia.org/stored.jpg',
      imageWidth: 1280,
      imageHeight: 853,
      attrAuthor: 'Jane',
      attrLicense: 'CC BY 2.0',
      attrLicenseUrl: null,
      origin: 'commons_year',
      title: null,
      lastHttpStatus: null,
      lastError: null,
      attempts: 0,
      nextRetryAt: null
    })

    const result = await service.lookup('Toyota', 'Camry', 'en', { year: 2008, source: 'commons' })

    expect(result.image).toEqual({
      url: 'https://upload.wikimedia.org/stored.jpg',
      width: 1280,
      height: 853,
      attribution: { author: 'Jane', license: 'CC BY 2.0', licenseUrl: null }
    })
    expect(callsTo('commons.wikimedia.org')).toBe(0)
    expect(callsTo('pithumbsize')).toBe(0)
  })

  it('falls back to the stored model-level photo when the year has no row', async () => {
    routeFetch()
    const { service, store } = makeService()
    const base = { brand: 'toyota', model: 'camry', year: 0, status: 'ok' as const, imageWidth: 1, imageHeight: 1 }
    await store.save({
      ...base,
      imageUrl: 'https://upload.wikimedia.org/model.jpg',
      attrAuthor: null,
      attrLicense: null,
      attrLicenseUrl: null,
      origin: 'commons_model',
      title: null,
      lastHttpStatus: null,
      lastError: null,
      attempts: 0,
      nextRetryAt: null
    })

    const result = await service.lookup('Toyota', 'Camry', 'en', { year: 2011, source: 'commons' })
    expect(result.image?.url).toBe('https://upload.wikimedia.org/model.jpg')
    expect(callsTo('commons.wikimedia.org')).toBe(0)
  })

  it('does a live Commons year search when nothing is stored, and stores the result', async () => {
    routeFetch({ year: () => jsonResponse(yearPayload) })
    const { service, store } = makeService()

    const result = await service.lookup('Toyota', 'Camry', 'en', { year: 2008, source: 'commons' })

    expect(result.image).toEqual({
      url: 'https://upload.wikimedia.org/thumb/camry2008.jpg',
      width: 1280,
      height: 853,
      attribution: { author: 'Jane', license: 'CC BY 2.0', licenseUrl: null }
    })
    expect(store.rows.get('toyota|camry|2008')).toMatchObject({ status: 'ok', origin: 'commons_year' })
    expect(callsTo('pithumbsize')).toBe(0)
  })

  it('stores not_found for a 200 with no qualifying photo, then answers from it without asking again', async () => {
    routeFetch({ lead: () => jsonResponse({ query: { pages: {} } }) })
    const { service, store } = makeService()

    const first = await service.lookup('Toyota', 'Camry', 'en')
    expect(first.image).toBeNull()
    expect(store.rows.get('toyota|camry|0')).toMatchObject({ status: 'not_found' })
    expect(store.rows.get('toyota|camry|0')?.nextRetryAt).toBeInstanceOf(Date)

    const leadCalls = callsTo('pithumbsize')
    const second = await makeServiceWith(store).lookup('Toyota', 'Camry', 'en')
    expect(second.image).toBeNull()
    expect(callsTo('pithumbsize')).toBe(leadCalls)
  })

  it('stores a failed row (never not_found) when the image request keeps failing, still returns the text, and does not memoize', async () => {
    routeFetch({ lead: () => jsonResponse({}, 429) })
    const { service, store } = makeService()

    const result = await service.lookup('Toyota', 'Camry', 'en')

    expect(result).toMatchObject({ found: true, extract: 'Toyota Camry is a car.', image: null })
    expect(callsTo('pithumbsize')).toBe(3)
    expect(store.rows.get('toyota|camry|0')).toMatchObject({ status: 'failed', lastHttpStatus: 429, attempts: 1 })

    // Within next_retry_at the stored failure answers (no hammering), and the in-memory layer didn't keep it.
    await service.lookup('Toyota', 'Camry', 'en')
    expect(callsTo('pithumbsize')).toBe(3)
  })

  it('retries the live photo once the stored failure is due, counting consecutive failures', async () => {
    routeFetch({ lead: () => jsonResponse({}, 503) })
    const { service, store } = makeService()
    await service.lookup('Toyota', 'Camry', 'en')
    const row = store.rows.get('toyota|camry|0')!
    store.rows.set('toyota|camry|0', { ...row, nextRetryAt: new Date(Date.now() - 1000) })

    await service.lookup('Toyota', 'Camry', 'en')

    expect(store.rows.get('toyota|camry|0')).toMatchObject({ status: 'failed', attempts: 2 })
  })

  it('degrades to a live lookup when the table is unavailable', async () => {
    routeFetch()
    const store = new FakeStore()
    store.find = async () => {
      throw new Error('connection refused')
    }
    store.save = async () => {
      throw new Error('connection refused')
    }
    const result = await makeService(store).service.lookup('Toyota', 'Camry', 'en')
    expect(result.image?.url).toBe(THUMB_URL)
  })

  it('source=wiki is the lead image alone and bypasses the table', async () => {
    routeFetch({ year: () => jsonResponse(yearPayload) })
    const { service, store } = makeService()

    const result = await service.lookup('Toyota', 'Camry', 'en', { year: 2008, source: 'wiki' })

    expect(result.image?.url).toBe(THUMB_URL)
    expect(store.rows.size).toBe(0)
  })

  it('treats an article whose title lacks the model as not found', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      jsonResponse({ query: { pages: { '1': { title: 'Mike Schmitz', extract: 'A priest.' } } } })
    )

    const result = await makeService().service.lookup('SCHMITZ', 'S 01', 'en')
    expect(result).toMatchObject({ found: false, image: null, extract: null })
  })

  it('throws BadRequestException when brand and model are both empty', async () => {
    await expect(makeService().service.lookup('', '', 'en')).rejects.toBeInstanceOf(BadRequestException)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws BadGatewayException when the article request keeps failing', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 500))
    await expect(makeService().service.lookup('Toyota', 'Camry', 'en')).rejects.toBeInstanceOf(BadGatewayException)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})

function makeServiceWith(store: FakeStore): WikiService {
  return makeService(store).service
}

describe('WikiService.lookupImage', () => {
  it('serves a stored photo with no Wikimedia call at all — no article text either', async () => {
    routeFetch()
    const { service, store } = makeService()
    await store.save({
      brand: 'mercedes-maybach',
      model: 's 580',
      year: 2025,
      status: 'ok',
      imageUrl: 'https://upload.wikimedia.org/stored.jpg',
      imageWidth: 1280,
      imageHeight: 853,
      attrAuthor: 'Jane',
      attrLicense: 'CC BY 2.0',
      attrLicenseUrl: null,
      origin: 'commons_year',
      title: null,
      lastHttpStatus: null,
      lastError: null,
      attempts: 0,
      nextRetryAt: null
    })

    const result = await service.lookupImage('MERCEDES-MAYBACH', 'S 580', { year: 2025, source: 'commons' })

    expect(result.image?.url).toBe('https://upload.wikimedia.org/stored.jpg')
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('falls back to a live Commons lookup when nothing is stored, and stores the answer', async () => {
    routeFetch({ year: () => jsonResponse(yearPayload) })
    const { service, store } = makeService()

    const result = await service.lookupImage('Toyota', 'Camry', { year: 2008, source: 'commons' })

    expect(result.image?.url).toBe('https://upload.wikimedia.org/thumb/camry2008.jpg')
    expect(store.rows.size).toBe(1)
  })

  it('yearOnly never falls back to the article lead image, and remembers "no photo" for that year', async () => {
    routeFetch() // Commons year search finds nothing; the lead image exists but must not be used
    const { service, store } = makeService()

    const result = await service.lookupImage('Toyota', 'Camry', { year: 2026, source: 'commons', yearOnly: true })

    expect(result).toEqual({ image: null })
    expect(callsTo('pithumbsize')).toBe(0)
    expect(store.rows.size).toBe(1)
  })

  it('yearOnly returns a photo of that year when Commons has one', async () => {
    routeFetch({ year: () => jsonResponse(yearPayload) })
    const { service } = makeService()

    const result = await service.lookupImage('Toyota', 'Camry', { year: 2008, source: 'commons', yearOnly: true })

    expect(result.image?.url).toBe('https://upload.wikimedia.org/thumb/camry2008.jpg')
  })

  it('returns image: null when no photo exists, and throws BadRequestException for an empty query', async () => {
    routeFetch()
    const { service } = makeService()

    expect(await service.lookupImage('Nobody', 'Nothing', { source: 'commons' })).toEqual({ image: null })
    await expect(service.lookupImage('', '')).rejects.toBeInstanceOf(BadRequestException)
  })
})
