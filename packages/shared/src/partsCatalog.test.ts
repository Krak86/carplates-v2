import { describe, expect, it } from 'vitest'

import { bmwSerial, realoemBrandUrl, realoemLink, realoemUrl } from './partsCatalog.js'

describe('realoemBrandUrl / realoemLink', () => {
  it('links the make page for a BMW brand, tolerating a model suffix', () => {
    expect(realoemBrandUrl('BMW')).toBe('https://www.realoem.com/bmw/enUS/select')
    expect(realoemBrandUrl('BMW  X5')).toBe('https://www.realoem.com/bmw/enUS/select')
  })

  it('returns null for other brands', () => {
    expect(realoemBrandUrl('MINI')).toBeNull()
    expect(realoemBrandUrl('AUDI')).toBeNull()
    expect(realoemBrandUrl(null)).toBeNull()
  })

  it('prefers the VIN page, falls back to the make page', () => {
    expect(realoemLink('WBA11DT0009L22375', 'BMW')).toContain('vin=9L22375')
    expect(realoemLink(null, 'BMW')).toBe('https://www.realoem.com/bmw/enUS/select')
    expect(realoemLink(null, 'AUDI')).toBeNull()
  })
})

describe('realoemUrl', () => {
  it('opens the catalog with the last 7 VIN characters', () => {
    expect(realoemUrl('WBA11DT0009L22375')).toBe('https://www.realoem.com/bmw/enUS/select?vin=9L22375')
    expect(bmwSerial('WBA11DT0009L22375')).toBe('9L22375')
  })

  it('tolerates case and spaces', () => {
    expect(realoemUrl(' wba11dt0009l22375 ')).toBe('https://www.realoem.com/bmw/enUS/select?vin=9L22375')
  })

  it('covers BMW M, BMW i and US-built BMWs', () => {
    expect(realoemUrl('WBS11AB0000A12345')).toContain('vin=0A12345')
    expect(realoemUrl('WBY11AB0000A12345')).toContain('vin=0A12345')
    expect(realoemUrl('5UXWX9C50H0A12345')).toContain('vin=0A12345')
  })

  it('returns null for other makes, malformed VINs and empty input', () => {
    expect(realoemUrl('WMWXU71010T123456')).toBeNull()
    expect(realoemUrl('WVWZZZ1KZAW123456')).toBeNull()
    expect(realoemUrl('WBA11DT0009L2237')).toBeNull()
    expect(realoemUrl('WBA11DT0009L2237I')).toBeNull()
    expect(realoemUrl(null)).toBeNull()
    expect(realoemUrl('')).toBeNull()
  })
})
