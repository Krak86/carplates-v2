import { describe, expect, it } from 'vitest'

import { filterByBodyStyle, nhtsaBodyBucket, registryBodyBucket } from './SafetyRatings.helpers'

describe('registryBodyBucket', () => {
  it('maps a registry body to a bucket, ignoring a trailing "-B"/"-В"/" В" suffix', () => {
    expect(registryBodyBucket('УНІВЕРСАЛ')).toBe('wagon')
    expect(registryBodyBucket('УНІВЕРСАЛ-B')).toBe('wagon')
    expect(registryBodyBucket('КОМБІ-B')).toBe('wagon')
    expect(registryBodyBucket('СЕДАН')).toBe('fourDoor')
    expect(registryBodyBucket('СЕДАН-B')).toBe('fourDoor')
    expect(registryBodyBucket('СЕДАН В')).toBe('fourDoor')
    expect(registryBodyBucket('КУПЕ')).toBe('twoDoor')
    expect(registryBodyBucket('КАБРІОЛЕТ-B')).toBe('twoDoor')
    expect(registryBodyBucket('ПІКАП-В')).toBe('pickup')
  })

  it('returns null for a body it cannot classify confidently, including hatchback', () => {
    expect(registryBodyBucket('ХЕТЧБЕК')).toBeNull()
    expect(registryBodyBucket('ПАСАЖИРСЬКИЙ-B')).toBeNull()
    expect(registryBodyBucket('ЛІМУЗИН-B')).toBeNull()
    expect(registryBodyBucket(null)).toBeNull()
  })
})

describe('nhtsaBodyBucket', () => {
  it('maps a real NHTSA VehicleDescription to a bucket', () => {
    expect(nhtsaBodyBucket('2016 Mercedes-Benz E-CLASS SW RWD')).toBe('wagon')
    expect(nhtsaBodyBucket('2015 Toyota Tacoma PU/CC 4WD')).toBe('pickup')
    expect(nhtsaBodyBucket('2015 Honda Civic 2 DR FWD')).toBe('twoDoor')
    expect(nhtsaBodyBucket('2015 Honda Civic 4 DR FWD')).toBe('fourDoor')
  })

  it('returns null for a description with no recognizable body token', () => {
    expect(nhtsaBodyBucket('2015 Some Model AWD')).toBeNull()
  })
})

describe('filterByBodyStyle', () => {
  const variants = [
    { description: '2016 Mercedes-Benz E-Class 2 DR 4WD' }, // coupe — wrong body
    { description: '2016 Mercedes-Benz E-Class 2 DR RWD' }, // coupe — wrong body
    { description: '2016 Mercedes-Benz E-CLASS SW RWD' }, // wagon — correct body
    { description: '2016 Mercedes-Benz E-CLASS SW 4WD' }, // wagon — correct body
    { description: '2016 Mercedes-Benz E-Class 4 DR RWD' }, // sedan — wrong body
    { description: '2016 Mercedes-Benz E-Class 4 DR 4WD' } // sedan — wrong body
  ]

  it('keeps only the matching body style for a real wagon (СЕ5992ЕМ, E 200, УНІВЕРСАЛ)', () => {
    const result = filterByBodyStyle(variants, 'УНІВЕРСАЛ')
    expect(result).toEqual([
      { description: '2016 Mercedes-Benz E-CLASS SW RWD' },
      { description: '2016 Mercedes-Benz E-CLASS SW 4WD' }
    ])
  })

  it('does not filter when the registry body is unclassifiable', () => {
    expect(filterByBodyStyle(variants, 'ПАСАЖИРСЬКИЙ')).toHaveLength(6)
    expect(filterByBodyStyle(variants, null)).toHaveLength(6)
  })

  it('falls back to the unfiltered list when nothing survives the filter', () => {
    // A pickup-bodied registry car, but none of NHTSA's returned variants are a pickup —
    // filtering would zero everything out, so the original list is returned instead.
    const sedanOnly = [{ description: '2016 Mercedes-Benz E-Class 4 DR RWD' }]
    expect(filterByBodyStyle(sedanOnly, 'ПІКАП')).toEqual(sedanOnly)
  })
})
