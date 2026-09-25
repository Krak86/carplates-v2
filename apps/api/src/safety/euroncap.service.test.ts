import { describe, expect, it } from 'vitest'
import type { EuroNcapRating } from '@carplates/shared'

import { brandCandidateKey, selectApplicableAssessmentId } from './euroncap.service.js'

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

describe('brandCandidateKey', () => {
  it('maps a Mazda numeric model to its Euro NCAP "mazdaN" slug', () => {
    expect(brandCandidateKey('mazda', '3')).toBe('mazda3')
    expect(brandCandidateKey('mazda', '6')).toBe('mazda6')
    expect(brandCandidateKey('mazda', 'cx5')).toBeNull()
  })

  it('maps a BMW trim code to its series, for series with a bare Euro NCAP entry', () => {
    expect(brandCandidateKey('bmw', '320d')).toBe('3series')
    expect(brandCandidateKey('bmw', '520i')).toBe('5series')
    expect(brandCandidateKey('bmw', '116i')).toBe('1series')
    expect(brandCandidateKey('bmw', '520')).toBe('5series')
  })

  it('returns null for a BMW model with no leading series digit', () => {
    expect(brandCandidateKey('bmw', 'x5')).toBeNull()
    expect(brandCandidateKey('bmw', 'i3')).toBeNull()
  })

  it('maps a Mercedes-Benz single-letter trim code to its class', () => {
    expect(brandCandidateKey('mercedesbenz', 'e200')).toBe('eclass')
    expect(brandCandidateKey('mercedesbenz', 'c180')).toBe('cclass')
    expect(brandCandidateKey('mercedesbenz', 'g500')).toBe('gclass')
    expect(brandCandidateKey('mercedesbenz', 'b250e')).toBe('bclass')
  })

  it('maps a legacy Mercedes-Benz nameplate to its renamed SUV class', () => {
    expect(brandCandidateKey('mercedesbenz', 'ml350')).toBe('gle')
    expect(brandCandidateKey('mercedesbenz', 'glk220')).toBe('glc')
    expect(brandCandidateKey('mercedesbenz', 'gl450')).toBe('gls')
  })

  it('does not let a short legacy alias swallow a longer current-class run (GLE/GLS vs GL)', () => {
    expect(brandCandidateKey('mercedesbenz', 'gle350d')).toBeNull()
    expect(brandCandidateKey('mercedesbenz', 'gls350')).toBeNull()
    expect(brandCandidateKey('mercedesbenz', 'gla200')).toBeNull()
  })

  it('returns null for a Mercedes-Benz model with no known class run', () => {
    expect(brandCandidateKey('mercedesbenz', 'vito111cdi')).toBeNull()
    expect(brandCandidateKey('mercedesbenz', 'sprinter316cdi')).toBeNull()
    expect(brandCandidateKey('mercedesbenz', '190')).toBeNull()
  })

  it('returns null for an unrelated brand', () => {
    expect(brandCandidateKey('toyota', 'corolla')).toBeNull()
  })
})
