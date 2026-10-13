import { describe, expect, it } from 'vitest'

import { AUCTION_SITES, AUCTION_SITE_IDS, auctionOpenUrl, hasImportOperation } from '@/lib/auction-sites'

const VIN = 'WBA3A5C50CF256985'

describe('auction sites', () => {
  it('lists every id once', () => {
    expect(AUCTION_SITES.map(s => s.id)).toEqual([...AUCTION_SITE_IDS])
  })

  it('puts the VIN into direct search URLs and falls back to the home page', () => {
    for (const site of AUCTION_SITES) {
      const url = auctionOpenUrl(site, VIN, 'en')
      expect(url.startsWith('https://')).toBe(true)
      expect(url.includes(VIN)).toBe(!!site.searchUrl)
    }
  })

  it('picks the language version of the site', () => {
    const [bidfax, bidcars] = AUCTION_SITES
    expect(auctionOpenUrl(bidfax!, VIN, 'ua')).toBe('https://bidfax.info/')
    expect(auctionOpenUrl(bidfax!, VIN, 'ru')).toBe('https://en.bidfax.info/')
    expect(auctionOpenUrl(bidcars!, VIN, 'ua')).toBe('https://bid.cars/ua')
    expect(auctionOpenUrl(bidcars!, VIN, 'ru')).toBe('https://bid.cars/ru')
  })

  it('detects an import by code or by operation name', () => {
    expect(hasImportOperation([{ operCode: 40 }, { operCode: 71 }])).toBe(true)
    expect(
      hasImportOperation([{ operCode: 999, operName: 'РЕЄСТРАЦІЯ ТЗ ПРИВЕЗЕНОГО З-ЗА КОРДОНУ ПО ПОСВІДЧЕННЮ МИТНИЦІ' }])
    ).toBe(true)
    expect(hasImportOperation([{ operCode: 40 }, { operCode: null, operName: 'ПРОДАЖ' }])).toBe(false)
  })
})
