import { describe, expect, it } from 'vitest'
import type { EuroNcapRating } from '@carplates/shared'

import { selectApplicableAssessmentId } from './euroncap.service.js'

function rating(overrides: Partial<EuroNcapRating>): EuroNcapRating {
  return {
    assessmentId: 'x',
    url: 'https://www.euroncap.com/assessments/x/x/x/',
    testedVariant: null,
    bodyType: null,
    ratingYear: null,
    stars: null,
    adultOccupantPct: null,
    childOccupantPct: null,
    vulnerableRoadUsersPct: null,
    safetyAssistPct: null,
    safetyPack: false,
    frontImageUrl: null,
    images: [],
    youtubeIds: [],
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

  it('never picks a Safety Pack variant as the applicable generation', () => {
    const ratings = [
      rating({ assessmentId: 'sp', ratingYear: 2020, safetyPack: true }),
      rating({ assessmentId: 'standard', ratingYear: 2019, safetyPack: false })
    ]
    expect(selectApplicableAssessmentId(ratings, 2020)).toBe('standard')
  })

  it('returns null when nothing qualifies, including an empty list', () => {
    expect(selectApplicableAssessmentId([], 2020)).toBeNull()
    expect(selectApplicableAssessmentId([rating({ assessmentId: 'a', ratingYear: null })], 2020)).toBeNull()
  })
})
