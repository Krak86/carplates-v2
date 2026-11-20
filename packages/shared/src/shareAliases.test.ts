import { describe, expect, it } from 'vitest'

import {
  isShareAlias,
  sectionAliasOfPath,
  sectionAliasPath,
  shareAliasOfPath,
  shareAliasPath,
  SHARE_ALIASES
} from './shareAliases.js'

describe('sectionAlias', () => {
  it('round-trips a plate and a page target', () => {
    expect(sectionAliasPath('BC6743PH', 'vin')).toBe('/s/BC6743PH/vin')
    expect(sectionAliasOfPath('/s/BC6743PH/vin')).toEqual({ target: 'BC6743PH', section: 'vin' })
    expect(sectionAliasOfPath('/s/alarms/losses/')).toEqual({ target: 'alarms', section: 'losses' })
    expect(sectionAliasOfPath(sectionAliasPath('ВС6743РН', 'ua-auctions'))).toEqual({
      target: 'ВС6743РН',
      section: 'ua-auctions'
    })
  })

  it('rejects other prefixes, missing or extra segments and odd section ids', () => {
    for (const p of [
      '/s',
      '/s/AA1234BB',
      '/x/AA1234BB/vin',
      '/s/AA1234BB/vin/x',
      '/s/AA1234BB/V!N',
      '/s/%E0%A4%A/vin'
    ]) {
      expect(sectionAliasOfPath(p)).toBeNull()
    }
    expect(sectionAliasOfPath('/s/a%2Fb/vin')).toBeNull()
  })
})

describe('shareAliases', () => {
  it('builds a /go path for every alias and reads it back', () => {
    for (const alias of SHARE_ALIASES) expect(shareAliasOfPath(shareAliasPath(alias))).toBe(alias)
  })

  it('tolerates a trailing slash', () => {
    expect(shareAliasOfPath('/go/ar/')).toBe('ar')
  })

  it('rejects unknown aliases, other prefixes and extra segments', () => {
    expect(shareAliasOfPath('/go/nope')).toBeNull()
    expect(shareAliasOfPath('/go')).toBeNull()
    expect(shareAliasOfPath('/x/ar')).toBeNull()
    expect(shareAliasOfPath('/go/ar/extra')).toBeNull()
    expect(isShareAlias('constructor')).toBe(false)
    expect(isShareAlias(undefined)).toBe(false)
  })
})
