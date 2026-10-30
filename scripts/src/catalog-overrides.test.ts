import { describe, it, expect } from 'vitest'

import { parseCatalogOverrides } from './catalog-overrides.js'

describe('parseCatalogOverrides', () => {
  it('reads known, alias and drop rows and skips comments and the header', () => {
    const o = parseCatalogOverrides(
      ['# note', 'kind,a,b,c,d', 'known,toyota,landcruiserprado', 'alias,ВАЗ,2107,lada,2107', 'drop,krone,sd', ''].join(
        '\n'
      )
    )
    expect(o.known).toEqual(['toyota|landcruiserprado'])
    expect(o.alias.get('ВАЗ|2107')).toEqual({ make: 'lada', model: '2107' })
    expect(o.drop.has('krone/sd')).toBe(true)
  })

  it('rejects a malformed row', () => {
    expect(() => parseCatalogOverrides('kind,a,b,c,d\nalias,x,y')).toThrow(/bad row/)
  })
})
