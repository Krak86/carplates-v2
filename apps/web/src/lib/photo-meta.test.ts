import { describe, expect, it } from 'vitest'

import { isBeforeRegistry, photoAgeYears } from './photo-meta'

describe('photoAgeYears', () => {
  const now = new Date('2026-09-30T12:00:00Z')

  it('counts whole years since the photo was taken', () => {
    expect(photoAgeYears({ takenAt: new Date('2015-08-15T10:00:00Z'), latitude: null, longitude: null }, now)).toBe(11)
  })

  it('is 0 for an unknown or future date', () => {
    expect(photoAgeYears({ takenAt: null, latitude: 1, longitude: 1 }, now)).toBe(0)
    expect(photoAgeYears({ takenAt: new Date('2027-01-01T00:00:00Z'), latitude: null, longitude: null }, now)).toBe(0)
  })
})
describe('isBeforeRegistry', () => {
  it('flags photos taken before 2013 only', () => {
    const meta = (iso: string | null) => ({ takenAt: iso ? new Date(iso) : null, latitude: null, longitude: null })
    expect(isBeforeRegistry(meta('2012-06-01T00:00:00'))).toBe(true)
    expect(isBeforeRegistry(meta('2013-06-01T00:00:00'))).toBe(false)
    expect(isBeforeRegistry(meta(null))).toBe(false)
  })
})
