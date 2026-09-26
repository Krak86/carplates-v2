import { describe, expect, it } from 'vitest'
import type { IihsRating } from '@carplates/shared'

import { selectApplicableAssessmentIds } from './iihs.service.js'

function rating(overrides: Partial<IihsRating>): IihsRating {
  return {
    assessmentId: 'x/x/2020',
    variantType: '4-door sedan',
    vehicleClass: 'midsize car',
    modelYear: 2020,
    award: null,
    tests: [],
    imageUrl: null,
    ...overrides
  }
}

describe('selectApplicableAssessmentIds', () => {
  it('returns every variant rated for the exact model year', () => {
    const ratings = [
      rating({ assessmentId: 'sedan', modelYear: 2020, variantType: '4-door sedan' }),
      rating({ assessmentId: 'hatch', modelYear: 2020, variantType: '4-door hatchback' }),
      rating({ assessmentId: 'old', modelYear: 2015 })
    ]
    expect(selectApplicableAssessmentIds(ratings, 2020)).toEqual(['sedan', 'hatch'])
  })

  it('falls back to model year + 1 when nothing matches the exact year', () => {
    const ratings = [rating({ assessmentId: 'a', modelYear: 2021 })]
    expect(selectApplicableAssessmentIds(ratings, 2020)).toEqual(['a'])
  })

  it('prefers the exact year over the +1 fallback when both exist', () => {
    const ratings = [rating({ assessmentId: 'exact', modelYear: 2020 }), rating({ assessmentId: 'next', modelYear: 2021 })]
    expect(selectApplicableAssessmentIds(ratings, 2020)).toEqual(['exact'])
  })

  it('returns an empty array when nothing qualifies, including an empty list', () => {
    expect(selectApplicableAssessmentIds([], 2020)).toEqual([])
    expect(selectApplicableAssessmentIds([rating({ assessmentId: 'a', modelYear: 2015 })], 2020)).toEqual([])
  })
})
