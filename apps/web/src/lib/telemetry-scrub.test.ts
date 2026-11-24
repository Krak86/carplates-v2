import { describe, expect, it } from 'vitest'

import { scrubBreadcrumb, scrubPostHogEvent, scrubSentryEvent, scrubUrl, shareRef } from './telemetry-scrub'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'

describe('scrubUrl', () => {
  it('redacts the share token and templates the plate path', () => {
    const out = scrubUrl(`https://carsua.app/AA1234BB?p=${TOKEN}&section=photo`)
    expect(out).not.toContain(TOKEN)
    expect(out).not.toContain('AA1234BB')
    expect(out).toBe('https://carsua.app/:query?p=redacted&section=photo')
  })

  it('templates API plate, VIN and share paths', () => {
    expect(scrubUrl('/api/plate/AA1234BB/history')).toBe('/api/plate/:plate/history')
    expect(scrubUrl('/api/vin/1HGCM82633A004352')).toBe('/api/vin/:vin')
    expect(scrubUrl(`/api/shares/${TOKEN}/image?v=2`)).toBe('/api/shares/:id/image?v=2')
  })

  it('templates a VIN typed as a SPA path and leaves static routes alone', () => {
    expect(scrubUrl('https://carsua.app/1HGCM82633A004352')).toBe('https://carsua.app/:query')
    expect(scrubUrl('https://carsua.app/about')).toBe('https://carsua.app/about')
    expect(scrubUrl('/read/vin')).toBe('/read/vin')
  })
})

describe('scrubbers', () => {
  it('scrubs a Sentry event: request url, referrer, query string, breadcrumbs', () => {
    const event = scrubSentryEvent({
      request: {
        url: `https://carsua.app/AA1234BB?p=${TOKEN}`,
        query_string: `p=${TOKEN}`,
        headers: { Referer: `https://carsua.app/AA1234BB?p=${TOKEN}` }
      },
      transaction: '/AA1234BB',
      breadcrumbs: [{ data: { url: `/api/shares/${TOKEN}`, to: `/AA1234BB?p=${TOKEN}` } }]
    })
    const json = JSON.stringify(event)
    expect(json).not.toContain(TOKEN)
    expect(json).not.toContain('AA1234BB')
    expect(event.request?.query_string).toBeUndefined()
  })

  it('scrubs a breadcrumb without data untouched', () => {
    const crumb = { category: 'x' } as { data?: Record<string, unknown> }
    expect(scrubBreadcrumb(crumb)).toBe(crumb)
  })

  it('scrubs PostHog URL properties and keeps other events', () => {
    const event = scrubPostHogEvent({
      properties: { $current_url: `https://carsua.app/AA1234BB?p=${TOKEN}`, $pathname: '/AA1234BB', other: 1 }
    })
    expect(JSON.stringify(event)).not.toContain(TOKEN)
    expect(JSON.stringify(event)).not.toContain('AA1234BB')
    expect(event.properties.other).toBe(1)
    expect(scrubPostHogEvent(null)).toBeNull()
  })

  it('shareRef is a stable 8-hex fingerprint that does not contain the token', async () => {
    const ref = await shareRef(TOKEN)
    expect(ref).toMatch(/^[0-9a-f]{8}$/)
    expect(await shareRef(TOKEN)).toBe(ref)
    expect(await shareRef('x'.repeat(22))).not.toBe(ref)
  })
})
