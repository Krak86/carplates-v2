import { describe, it, expect } from 'vitest'

import { hasKnownWmi, lookupWmi } from './wmi.js'

describe('lookupWmi', () => {
  it('reads make + country from a listed WMI', () => {
    expect(lookupWmi('KMHD35LH5HU000001')).toEqual({ make: 'Hyundai', country: 'KR' })
    expect(lookupWmi('lfv3a23c8d3000001')).toEqual({ make: 'Volkswagen (FAW-VW)', country: 'CN' })
  })

  it('falls back to the country block for an unlisted WMI', () => {
    expect(lookupWmi('JZZ00000000000001')).toEqual({ make: null, country: 'JP' })
    expect(lookupWmi('Y6Z00000000000001')).toEqual({ make: null, country: 'UA' })
  })

  it('returns null for an unknown block', () => {
    expect(lookupWmi('00000000000000001')).toBeNull()
  })
})

describe('hasKnownWmi', () => {
  it('is true only for a listed 3-character WMI', () => {
    expect(hasKnownWmi('mncLSFE405W491230')).toBe(true)
    expect(hasKnownWmi('NNCLSFE405W491230')).toBe(false)
    expect(hasKnownWmi('JZZ00000000000001')).toBe(false)
  })
})
