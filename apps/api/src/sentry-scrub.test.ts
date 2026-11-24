import { describe, expect, it } from 'vitest'

import { scrubApiEvent, scrubApiUrl } from './sentry-scrub.js'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'

describe('scrubApiUrl', () => {
  it('templates plate, VIN, card, ria and share paths and drops the query', () => {
    expect(scrubApiUrl('https://carsua.app/api/plate/BC9813PX?x=1')).toBe('https://carsua.app/api/plate/:plate')
    expect(scrubApiUrl('/api/plate/BC9813PX/history')).toBe('/api/plate/:plate/history')
    expect(scrubApiUrl('/api/vin/1HGCM82633A004352')).toBe('/api/vin/:vin')
    expect(scrubApiUrl('/api/card/BC9813PX')).toBe('/api/card/:plate')
    expect(scrubApiUrl('/api/ria-check/BC9813PX')).toBe('/api/ria-check/:plate')
    expect(scrubApiUrl(`/api/shares/${TOKEN}/image`)).toBe('/api/shares/:id/image')
  })

  it('templates the SPA plate page and og cards, leaves other routes alone', () => {
    expect(scrubApiUrl(`https://carsua.app/BC9813PX?p=${TOKEN}`)).toBe('https://carsua.app/:query')
    expect(scrubApiUrl('/og/BC9813PX.png')).toBe('/og/:file')
    expect(scrubApiUrl('/api/stats/field/brand')).toBe('/api/stats/field/brand')
    expect(scrubApiUrl('/about')).toBe('/about')
  })
})

describe('scrubApiEvent', () => {
  it('removes body, query, cookies and rewrites url, Referer, transaction and breadcrumbs', () => {
    const event = scrubApiEvent({
      request: {
        url: 'https://carsua.app/api/plate/BC9813PX',
        data: { plate: 'BC9813PX' },
        query_string: `p=${TOKEN}`,
        cookies: { carsua_sid: 'secret' },
        headers: {
          Referer: `https://carsua.app/BC9813PX?p=${TOKEN}`,
          Cookie: 'carsua_sid=secret',
          Authorization: 'Bearer x',
          Accept: 'application/json'
        }
      },
      transaction: 'GET /api/plate/BC9813PX',
      breadcrumbs: [{ data: { url: `/api/shares/${TOKEN}` } }]
    })
    const json = JSON.stringify(event)
    expect(json).not.toContain('BC9813PX')
    expect(json).not.toContain(TOKEN)
    expect(json).not.toContain('secret')
    expect(event.request?.headers?.Accept).toBe('application/json')
  })
})
