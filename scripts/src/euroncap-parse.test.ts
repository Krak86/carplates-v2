import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseAssessment } from './euroncap-parse.js'

const fixture = (name: string): string => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')

describe('parseAssessment', () => {
  it('parses a current 5-star rating with full media', () => {
    const row = parseAssessment(
      fixture('euroncap-cla-1108.html'),
      'https://www.euroncap.com/assessments/mercedes-benz/cla/1108/'
    )
    expect(row).toMatchObject({
      assessmentId: '1108',
      makeKey: 'mercedesbenz',
      modelKey: 'cla',
      testedVariant: 'Mercedes-Benz CLA 250+ AMG Line',
      bodyType: 'Sedan',
      ratingYear: 2025,
      stars: 5,
      adultOccupantPct: 94,
      childOccupantPct: 89,
      vulnerableRoadUsersPct: 93,
      safetyAssistPct: 85,
      safetyPack: false,
      frontImageUrl:
        'https://data-cdn.euroncap.com/media/assessment-media/08c28122-8d72-4a88-a25b-82d265957eb6/mercedes-benz-cla-2025-1108_0__0325e0a78959ad5e_xl.webp',
      youtubeIds: ['uwm44li8Tqo'],
      reportPdfUrl: null
    })
    // The page repeats the whole vehicle-info block for print (with a fake 1-star copy
    // planted in the fixture) — the parser must key off the FIRST safety scope only.
    expect(row?.images).toHaveLength(4)
  })

  it('parses an expired older-protocol rating (same markup shape, no youtube/pdf)', () => {
    const row = parseAssessment(
      fixture('euroncap-golf-0805.html'),
      'https://www.euroncap.com/assessments/volkswagen/golf/0805/'
    )
    expect(row).toMatchObject({
      assessmentId: '0805',
      makeKey: 'volkswagen',
      modelKey: 'golf',
      testedVariant: "VW Golf, 1.5 petrol 'Comfortline', LHD",
      bodyType: 'Hatchback',
      ratingYear: 2019,
      stars: 5,
      adultOccupantPct: 95,
      childOccupantPct: 89,
      vulnerableRoadUsersPct: 76,
      safetyAssistPct: 78,
      safetyPack: false,
      youtubeIds: [],
      reportPdfUrl: null
    })
  })

  it('reads partial star fill (bg-primary-yellow vs bg-dark-grey) correctly', () => {
    const row = parseAssessment(
      fixture('euroncap-dacia-spring-0910.html'),
      'https://www.euroncap.com/assessments/dacia/spring/0910/'
    )
    expect(row?.stars).toBe(1)
    expect(row?.images).toEqual([])
    expect(row?.frontImageUrl).toBeNull()
    expect(row?.youtubeIds).toEqual([])
  })

  it('flags a Safety Pack variant from the assessment id suffix, not page content', () => {
    const row = parseAssessment(
      fixture('euroncap-k4-1238sp.html'),
      'https://www.euroncap.com/assessments/kia/k4/1238sp/'
    )
    expect(row?.assessmentId).toBe('1238sp')
    expect(row?.safetyPack).toBe(true)
    expect(row?.stars).toBe(5)
  })

  it('derives model_key with the same shared modelKey() the API uses for registry models', () => {
    const row = parseAssessment(
      fixture('euroncap-cla-1108.html'),
      'https://www.euroncap.com/assessments/mercedes-benz/cla/1108/'
    )
    // Registry model "CLA 250" -> modelKey("CLA 250") = "cla250", which must prefix-match
    // this row's stored model_key "cla".
    expect('cla250'.startsWith(row!.modelKey)).toBe(true)
  })

  it('normalizes make_key regardless of whether Euro NCAP\'s URL uses "-" or "+" as a separator', () => {
    // Real Euro NCAP URLs: mercedes-benz uses "-", but land+rover and alfa+romeo use "+" —
    // both must collapse to the same alphanumeric-only key the API computes from a
    // registry brand string ("LAND ROVER" -> brandSlug 'land-rover' -> makeKey 'landrover').
    const row = parseAssessment(
      '<html><body></body></html>',
      'https://www.euroncap.com/assessments/land+rover/defender/0811/'
    )
    expect(row?.makeKey).toBe('landrover')
  })

  it('returns null for a URL that is not an assessment page', () => {
    expect(parseAssessment('<html></html>', 'https://www.euroncap.com/en/ratings-rewards/')).toBeNull()
  })
})
