import { describe, expect, it } from 'vitest'
import type { JncapRating } from '@carplates/shared'

import { selectApplicableAssessmentId } from './jncap.service.js'

function rating(overrides: Partial<JncapRating>): JncapRating {
  return {
    assessmentId: 'x',
    url: 'https://www.nasva.go.jp/mamoru/en/assessment_car/detail/x',
    vehicleType: null,
    ratingYear: null,
    stars: null,
    overallPct: null,
    preventiveRank: null,
    preventivePct: null,
    collisionRank: null,
    collisionPct: null,
    emergencyCallType: null,
    emergencyCallPct: null,
    testScores: [],
    imageUrl: null,
    youtubeId: null,
    reportPdfUrl: null,
    ...overrides
  }
}

describe('selectApplicableAssessmentId', () => {
  it('picks the newest rating no later than one year after the car', () => {
    const ratings = [
      rating({ assessmentId: 'old', ratingYear: 2015 }),
      rating({ assessmentId: 'mid', ratingYear: 2019 }),
      rating({ assessmentId: 'new', ratingYear: 2024 })
    ]
    expect(selectApplicableAssessmentId(ratings, 2019)).toBe('mid')
  })

  it('allows a rating up to one year newer than the car (early-model-year publication lag)', () => {
    const ratings = [rating({ assessmentId: 'a', ratingYear: 2020 })]
    expect(selectApplicableAssessmentId(ratings, 2019)).toBe('a')
  })

  it('excludes a rating more than one year newer than the car', () => {
    const ratings = [rating({ assessmentId: 'a', ratingYear: 2021 })]
    expect(selectApplicableAssessmentId(ratings, 2019)).toBeNull()
  })

  it('returns null when nothing qualifies, including an empty list', () => {
    expect(selectApplicableAssessmentId([], 2020)).toBeNull()
    expect(selectApplicableAssessmentId([rating({ assessmentId: 'a', ratingYear: null })], 2020)).toBeNull()
  })
})
