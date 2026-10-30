import { describe, expect, it } from 'vitest'

import { isShareAlias, shareAliasOfPath, shareAliasPath, SHARE_ALIASES } from './shareAliases.js'

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
