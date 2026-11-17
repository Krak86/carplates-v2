import { describe, expect, it } from 'vitest'

import { routeTitleKey, stripTrailingSlash } from '@/hooks/useDocumentTitle'

describe('stripTrailingSlash', () => {
  it('drops trailing slashes but keeps the root', () => {
    expect(stripTrailingSlash('/cars/')).toBe('/cars')
    expect(stripTrailingSlash('/cars')).toBe('/cars')
    expect(stripTrailingSlash('/')).toBe('/')
  })
})

describe('routeTitleKey', () => {
  it('finds a static route with or without a trailing slash', () => {
    expect(routeTitleKey('/cars')).toBe('catalog.browseTitle')
    expect(routeTitleKey('/cars/')).toBe('catalog.browseTitle')
    expect(routeTitleKey('/read/vin/')).toBe('nav.readVin')
  })

  it('returns undefined for a plate or an unknown path', () => {
    expect(routeTitleKey('/AA1234BB')).toBeUndefined()
    expect(routeTitleKey('/AA1234BB/')).toBeUndefined()
  })
})
