import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseAssessment } from './jncap-parse.js'

const fixture = (name: string): string => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')

describe('parseAssessment', () => {
  it('parses a current-era ("Vehicle safety performance") assessment with full media', () => {
    const row = parseAssessment(
      fixture('jncap-mini-countryman-269.html'),
      'https://www.nasva.go.jp/mamoru/en/assessment_car/detail/269',
      '269'
    )
    expect(row).toMatchObject({
      assessmentId: '269',
      make: 'MINI',
      model: 'MINI COUNTRYMAN',
      makeKey: 'mini',
      // Stripped of the repeated "MINI " brand prefix JNCAP's own model text carries for this
      // brand, so it prefix-matches a registry car stored as brand "MINI" / model "COUNTRYMAN".
      modelKey: 'countryman',
      vehicleType: 'Passenger Car',
      ratingYear: 2025,
      stars: 4,
      overallPct: 92,
      preventiveRank: 'B',
      preventivePct: 98,
      collisionRank: 'A',
      collisionPct: 86,
      emergencyCallType: 'Advanced',
      emergencyCallPct: 100,
      youtubeId: 'e8vyKqI0bQE',
      imageUrl: 'https://www.nasva.go.jp/mamoru/images/car/269.jpg',
      reportPdfUrl: 'https://www.nasva.go.jp/mamoru/pdf/sv/detail/269.pdf'
    })
    expect(row?.testScores).toEqual([
      { label: 'Autonomous emergency braking system [for Pedestrian at daytime] test', value: 'Level 5 /5' },
      { label: 'Pedal misapplication prevention test', value: 'Level 2 /5' },
      { label: "Full-wrap frontal collision test (Driver's seat)", value: 'Level 5 /5' },
      { label: 'New offset frontal collision test', value: 'Level 4 /5' },
      { label: "Side collision test (Passenger's seat)", value: 'Level 5 /5' }
    ])
  })

  it('parses a legacy pre-2014 assessment (no Preventive program yet, 6-star scale, no lettered rank)', () => {
    const row = parseAssessment(
      fixture('jncap-ad-44.html'),
      'https://www.nasva.go.jp/mamoru/en/assessment_car/detail/44',
      '44'
    )
    expect(row).toMatchObject({
      assessmentId: '44',
      make: 'Nissan',
      model: 'AD',
      makeKey: 'nissan',
      modelKey: 'ad',
      vehicleType: 'Commercial Vehicle',
      ratingYear: 2007,
      stars: 6,
      // No "Overall evaluation" percentage existed in this era — only per-test Levels.
      overallPct: null,
      // Preventive safety testing didn't exist yet ("Not conducted", not a real rank).
      preventiveRank: null,
      preventivePct: null,
      // Legacy Collision section has no `.score_rank` block — a bare "Level N" per seat
      // instead of a lettered rank + percentage — so both are correctly null, not a bug.
      collisionRank: null,
      collisionPct: null,
      emergencyCallType: null,
      emergencyCallPct: null,
      youtubeId: '7pWQ505bfNQ',
      imageUrl: 'https://www.nasva.go.jp/mamoru/images/car/44.jpg',
      reportPdfUrl: 'https://www.nasva.go.jp/mamoru/pdf/psv/detail/en/44.pdf'
    })
    expect(row?.testScores).toEqual([
      { label: "Full-wrap frontal collision test (Driver's seat)", value: 'Level 4 /5' },
      { label: "Offset frontal collision test (Driver's seat)", value: 'Level 4 /5' },
      { label: 'Pedestrian head protection performance test', value: 'Level 3 /5' }
    ])
  })

  it('parses a 2-seat commercial vehicle exempt from a combined rating (bare-year Overall evaluation cell)', () => {
    const row = parseAssessment(
      fixture('jncap-carry-270.html'),
      'https://www.nasva.go.jp/mamoru/en/assessment_car/detail/270',
      '270'
    )
    expect(row).toMatchObject({
      assessmentId: '270',
      make: 'SUZUKI',
      model: 'CARRY',
      makeKey: 'suzuki',
      modelKey: 'carry',
      vehicleType: 'Commercial Vehicle',
      // "2025" with no stars/"FY" prefix — a 2-seat vehicle has no rear seat to assess, so
      // JNCAP explicitly excludes it from a combined rating. The bare-year fallback still
      // recovers the test year for `selectApplicableAssessmentId`'s year-matching.
      ratingYear: 2025,
      stars: null,
      overallPct: null,
      preventiveRank: null,
      collisionRank: null,
      // This entry's PDF link text hadn't been translated to English yet ("結果詳細 PDF"
      // instead of "Detailed results (PDF)") at scrape time — correctly null, not a bug.
      reportPdfUrl: null
    })
  })

  it('parses a transitional 2014-2019 assessment (separate Preventive/Collision programs, points-fraction percentage, "ASV+++" grade)', () => {
    const row = parseAssessment(
      fixture('jncap-cx5-81.html'),
      'https://www.nasva.go.jp/mamoru/en/assessment_car/detail/81',
      '81'
    )
    expect(row).toMatchObject({
      assessmentId: '81',
      make: 'MAZDA',
      model: 'CX-5',
      makeKey: 'mazda',
      modelKey: 'cx5',
      vehicleType: 'Passenger Car',
      ratingYear: 2017,
      stars: 5,
      // No unified "overall" percentage existed in this era — Preventive and Collision were
      // separate, non-combinable programs, so this stays null rather than borrowing Collision's.
      overallPct: null,
      preventiveRank: 'ASV+++',
      // 115.4 / 126 points, computed from the fraction (no literal "%" in the source markup).
      preventivePct: 92,
      // Collision's own "rank" here is itself a star rating, not a letter/text grade — no
      // rank to extract, but the percentage still comes from its own points fraction.
      collisionRank: null,
      collisionPct: 90,
      emergencyCallType: null,
      emergencyCallPct: null,
      youtubeId: 'hGoiKgNUNKc',
      imageUrl: 'https://www.nasva.go.jp/mamoru/images/car/81.jpg',
      reportPdfUrl: 'https://www.nasva.go.jp/mamoru/pdf/psv/detail/en/81.pdf'
    })
    expect(row?.testScores).toEqual([
      { label: "Full-wrap frontal collision test (Driver's seat)", value: 'Level 5 /5' },
      { label: 'Pedestrian head protection performance test', value: 'Level 4 /5' },
      { label: 'Autonomous emergency braking system [car to car] test', value: '32.0 /32.0' },
      { label: 'Pedal misapplication prevention test', value: '1.6 /2.0' }
    ])
  })

  it('strips a brand-name repeat from the model text only for matching, keeping the display value intact', () => {
    // Real MINI quirk: JNCAP lists MINI's own models with the brand baked in ("MINI
    // COUNTRYMAN"), unlike most other brands ("AD", not "Nissan AD") — modelKey must still
    // resolve to what a registry car (brand "MINI", model "COUNTRYMAN") would compute.
    const row = parseAssessment(
      fixture('jncap-mini-countryman-269.html'),
      'https://www.nasva.go.jp/mamoru/en/assessment_car/detail/269',
      '269'
    )
    expect(row?.model).toBe('MINI COUNTRYMAN')
    expect(row?.modelKey).toBe('countryman')
  })

  it('returns null when the page has no vehicle-info table (not a recognizable assessment page)', () => {
    expect(parseAssessment('<html><body>not a real page</body></html>', 'https://example.com/x', 'x')).toBeNull()
  })
})
