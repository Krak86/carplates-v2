import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  WikimediaError,
  commonsFilenameFromUrl,
  fetchWikimediaJson,
  nextRetryAt,
  retryDelayMs,
  shapeWikiExtract,
  wikiImageFromInfo,
  wikiImageKey
} from './wikimedia.js'

describe('shapeWikiExtract', () => {
  const raw =
    'Toyota Camry ([ˈkæmri]; яп. トヨタ・カムリ) — car.\nSecond intro paragraph.\n\n\n== History ==\n\nFirst gen text.\n\n\n== Empty ==\n\n\n=== Sub ===\n\nSub text.'

  it('splits the intro from the sections and drops noisy parentheticals', () => {
    const { intro, more } = shapeWikiExtract(raw)
    expect(intro).toBe('Toyota Camry — car.\nSecond intro paragraph.')
    expect(more).toBe('## History\n\nFirst gen text.\n\n## Sub\n\nSub text.')
  })

  it('returns no body for an intro-only article', () => {
    expect(shapeWikiExtract('Just a stub.')).toEqual({ intro: 'Just a stub.', more: null })
  })

  it('caps the intro at a sentence boundary', () => {
    const long = `${'A sentence here. '.repeat(200)}`
    const { intro } = shapeWikiExtract(long)
    expect(intro.length).toBeLessThanOrEqual(1800)
    expect(intro.endsWith('.')).toBe(true)
  })
})

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers })

const options = { userAgent: 'test/1.0', sleep: vi.fn(async () => {}), random: () => 0 }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  options.sleep.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('wikiImageKey', () => {
  it('lower-cases, trims and collapses whitespace; no year = model level', () => {
    expect(wikiImageKey(' KIA ', 'Ceed  SW', 2018)).toEqual({ brand: 'kia', model: 'ceed sw', year: 2018 })
    expect(wikiImageKey('Kia', 'Ceed').year).toBe(0)
  })
})

describe('retryDelayMs', () => {
  it('honors Retry-After in seconds, capped at 30 s', () => {
    expect(retryDelayMs(1, '7')).toBe(7000)
    expect(retryDelayMs(1, '600')).toBe(30_000)
  })

  it('backs off exponentially with jitter when there is no usable header', () => {
    expect(retryDelayMs(1, null, () => 0)).toBe(1000)
    expect(retryDelayMs(2, null, () => 0)).toBe(2000)
    expect(retryDelayMs(2, 'Wed, 21 Oct 2026 07:28:00 GMT', () => 1)).toBe(3000)
  })
})

describe('fetchWikimediaJson', () => {
  it('retries a 429 honoring Retry-After and then succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({}, 429, { 'retry-after': '3' }))
      .mockResolvedValueOnce(json({ ok: true }))

    await expect(fetchWikimediaJson('https://x/api', options)).resolves.toEqual({ ok: true })
    expect(options.sleep).toHaveBeenCalledWith(3000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('gives up after 3 attempts on 5xx with the last status and attempt count', async () => {
    vi.mocked(fetch).mockImplementation(async () => json({}, 503))

    const err = await fetchWikimediaJson('https://x/api', options).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WikimediaError)
    expect(err).toMatchObject({ status: 503, attempts: 3, retryable: true })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('does not retry a non-retryable 4xx', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}, 403))

    const err = await fetchWikimediaJson('https://x/api', options).catch((e: unknown) => e)
    expect(err).toMatchObject({ status: 403, attempts: 1, retryable: false })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries a network error / timeout (status null)', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(json({ a: 1 }))

    await expect(fetchWikimediaJson('https://x/api', options)).resolves.toEqual({ a: 1 })
  })

  it('treats a 200 with an API ratelimited error as a 429 and retries', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ error: { code: 'ratelimited', info: 'slow down' } }))
      .mockResolvedValueOnce(json({ ok: 1 }))

    await expect(fetchWikimediaJson('https://x/api', options)).resolves.toEqual({ ok: 1 })
  })
})

describe('nextRetryAt', () => {
  const now = new Date('2026-10-05T00:00:00Z')
  const hoursLater = (d: Date | null): number | null => (d ? (d.getTime() - now.getTime()) / 3_600_000 : null)

  it('never for ok, 30 days for not_found, a 1 h → 6 h → 24 h ladder for retryable failures, 7 d otherwise', () => {
    expect(nextRetryAt('ok', 0, null, now)).toBeNull()
    expect(hoursLater(nextRetryAt('not_found', 0, null, now))).toBe(720)
    expect(hoursLater(nextRetryAt('failed', 1, 429, now))).toBe(1)
    expect(hoursLater(nextRetryAt('failed', 2, 503, now))).toBe(6)
    expect(hoursLater(nextRetryAt('failed', 5, null, now))).toBe(24)
    expect(hoursLater(nextRetryAt('failed', 1, 403, now))).toBe(168)
  })
})

describe('commonsFilenameFromUrl', () => {
  it('reads the file name from original and thumbnail URLs', () => {
    expect(commonsFilenameFromUrl('https://upload.wikimedia.org/wikipedia/commons/5/55/Toyota_Camry.jpg')).toBe(
      'Toyota_Camry.jpg'
    )
    expect(
      commonsFilenameFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Toyota_Camry.jpg/1280px-Toyota_Camry.jpg'
      )
    ).toBe('Toyota_Camry.jpg')
  })
})

describe('wikiImageFromInfo', () => {
  it('maps the thumbnail and licence; null without a thumbnail', () => {
    expect(wikiImageFromInfo({ width: 1, height: 1, mime: 'image/jpeg' })).toBeNull()
    expect(
      wikiImageFromInfo({
        thumburl: 'https://t/x.jpg',
        thumbwidth: 1280,
        thumbheight: 853,
        width: 3000,
        height: 2000,
        mime: 'image/jpeg',
        extmetadata: { Artist: { value: '<a>Jane</a>' }, LicenseShortName: { value: 'CC BY 2.0' } }
      })
    ).toEqual({
      url: 'https://t/x.jpg',
      width: 1280,
      height: 853,
      attribution: { author: 'Jane', license: 'CC BY 2.0', licenseUrl: null }
    })
  })
})
