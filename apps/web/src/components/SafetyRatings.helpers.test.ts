import { describe, expect, it } from 'vitest'
import type { IihsRating } from '@carplates/shared'

import {
  filterByBodyStyle,
  groupIihsRatings,
  iihsBodyBucket,
  nhtsaBodyBucket,
  registryBodyBucket
} from './SafetyRatings.helpers'

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
    expect(nhtsaBodyBucket('2014 Honda Odyssey VAN FWD')).toBe('van')
  })

  it('returns null for a description with no recognizable body token', () => {
    expect(nhtsaBodyBucket('2015 Some Model AWD')).toBeNull()
  })
})

describe('iihsBodyBucket', () => {
  it('maps a plain-English IIHS variantType to a bucket', () => {
    expect(iihsBodyBucket('4-door sedan')).toBe('fourDoor')
    expect(iihsBodyBucket('4-door SUV')).toBe('fourDoor')
    expect(iihsBodyBucket('2-door coupe')).toBe('twoDoor')
    expect(iihsBodyBucket('2-door convertible')).toBe('twoDoor')
    expect(iihsBodyBucket('crew cab pickup')).toBe('pickup')
    expect(iihsBodyBucket('extended cab pickup')).toBe('pickup')
    expect(iihsBodyBucket('minivan')).toBe('van')
    expect(iihsBodyBucket('station wagon')).toBe('wagon')
  })

  it('returns null for a variantType with no recognizable body token', () => {
    expect(iihsBodyBucket('roadster')).toBeNull()
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
  const byDescription = (r: { description: string }): ReturnType<typeof nhtsaBodyBucket> => nhtsaBodyBucket(r.description)

  it('keeps only the matching body style for a real wagon (СЕ5992ЕМ, E 200, УНІВЕРСАЛ)', () => {
    const result = filterByBodyStyle(variants, 'УНІВЕРСАЛ', byDescription)
    expect(result).toEqual([
      { description: '2016 Mercedes-Benz E-CLASS SW RWD' },
      { description: '2016 Mercedes-Benz E-CLASS SW 4WD' }
    ])
  })

  it('does not filter when the registry body is unclassifiable', () => {
    expect(filterByBodyStyle(variants, 'ПАСАЖИРСЬКИЙ', byDescription)).toHaveLength(6)
    expect(filterByBodyStyle(variants, null, byDescription)).toHaveLength(6)
  })

  it('falls back to the unfiltered list when nothing survives the filter', () => {
    // A pickup-bodied registry car, but none of NHTSA's returned variants are a pickup —
    // filtering would zero everything out, so the original list is returned instead.
    const sedanOnly = [{ description: '2016 Mercedes-Benz E-Class 4 DR RWD' }]
    expect(filterByBodyStyle(sedanOnly, 'ПІКАП', byDescription)).toEqual(sedanOnly)
  })

  it('drops a same-name US-market minivan match for a wagon-bodied JDM car (11ІО2081, Honda Odyssey, УНІВЕРСАЛ-B)', () => {
    const odyssey = [{ description: '2014 Honda Odyssey VAN FWD' }]
    expect(filterByBodyStyle(odyssey, 'УНІВЕРСАЛ-B', byDescription)).toEqual([])
  })
})

describe('groupIihsRatings', () => {
  function rating(overrides: Partial<IihsRating>): IihsRating {
    return {
      assessmentId: `x/x/${overrides.modelYear ?? 2020}`,
      variantType: '4-door sedan',
      vehicleClass: 'midsize car',
      modelYear: 2020,
      award: null,
      tests: [{ key: 'headlights', label: 'Headlights', rating: 'Good', qualifier: null }],
      imageUrl: null,
      ...overrides
    }
  }

  it('collapses consecutive identical years into one group with a year range (real Civic 2006-2008 shape)', () => {
    const ratings = [2006, 2007, 2008].map(modelYear => rating({ modelYear, assessmentId: `honda/civic/${modelYear}` }))
    const groups = groupIihsRatings(ratings, [])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ yearFrom: 2006, yearTo: 2008, primaryAssessmentId: 'honda/civic/2008' })
    expect(groups[0]?.assessmentIds).toEqual(['honda/civic/2006', 'honda/civic/2007', 'honda/civic/2008'])
  })

  it('starts a new group when the test content actually changes, even across consecutive years', () => {
    const ratings = [
      rating({ modelYear: 2015, assessmentId: 'a/2015' }),
      rating({
        modelYear: 2016,
        assessmentId: 'a/2016',
        tests: [{ key: 'headlights', label: 'Headlights', rating: 'Poor', qualifier: null }]
      })
    ]
    const groups = groupIihsRatings(ratings, [])
    expect(groups).toHaveLength(2)
    expect(groups.map(g => [g.yearFrom, g.yearTo])).toEqual([
      [2015, 2015],
      [2016, 2016]
    ])
  })

  it('never bridges a gap year, even if the content coincidentally matches again later', () => {
    const ratings = [
      rating({ modelYear: 2010, assessmentId: 'a/2010' }),
      rating({ modelYear: 2012, assessmentId: 'a/2012' }) // same content, but 2011 is missing
    ]
    const groups = groupIihsRatings(ratings, [])
    expect(groups).toHaveLength(2)
  })

  it('keeps different variantTypes as separate groups even for the same year', () => {
    const ratings = [
      rating({ modelYear: 2020, variantType: '4-door sedan', assessmentId: 'a/sedan/2020' }),
      rating({ modelYear: 2020, variantType: '4-door hatchback', assessmentId: 'a/hatch/2020' })
    ]
    const groups = groupIihsRatings(ratings, [])
    expect(groups).toHaveLength(2)
  })

  it('marks a group applicable if any of its folded-in years is in the applicable set', () => {
    const ratings = [2020, 2021].map(modelYear => rating({ modelYear, assessmentId: `a/${modelYear}` }))
    const groups = groupIihsRatings(ratings, ['a/2020'])
    expect(groups[0]?.applicable).toBe(true)
  })
})
