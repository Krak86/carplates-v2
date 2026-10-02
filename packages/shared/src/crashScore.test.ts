import { describe, expect, it } from 'vitest'

import {
  applicableCrashScore,
  cncapScore,
  combineCrashScores,
  crashBand,
  euroncapScore,
  iihsScore,
  jncapScore,
  kncapScore,
  matchRatingRows
} from './crashScore.js'

describe('per-source normalization', () => {
  it('maps Euro NCAP stars linearly and ignores missing stars', () => {
    expect(euroncapScore(5)).toBe(100)
    expect(euroncapScore(3)).toBe(60)
    expect(euroncapScore(null)).toBeNull()
  })

  it('prefers the JNCAP percentage, else stars capped at 5', () => {
    expect(jncapScore(87, 5)).toBe(87)
    expect(jncapScore(null, 6)).toBe(100)
    expect(jncapScore(null, null)).toBeNull()
  })

  it('only uses C-NCAP percentage scores, never raw points', () => {
    expect(cncapScore('pct', 82.5)).toBe(82.5)
    expect(cncapScore('points', 52)).toBeNull()
  })

  it('uses the KNCAP score, falling back to the overall class', () => {
    expect(kncapScore(88.6, 1)).toBe(88.6)
    expect(kncapScore(null, 2)).toBe(85)
    expect(kncapScore(null, null)).toBeNull()
  })

  it('averages only IIHS crashworthiness tests', () => {
    const tests = [
      { key: 'small-overlap-front', rating: 'Good' },
      { key: 'side-updated-test', rating: 'Acceptable' },
      { key: 'headlights', rating: 'Poor' },
      { key: 'roof-strength', rating: null }
    ]
    expect(iihsScore(tests)).toBeCloseTo(83.5)
    expect(iihsScore([{ key: 'headlights', rating: 'Good' }])).toBeNull()
  })
})

describe('matchRatingRows', () => {
  const rows = [{ modelKey: 'i' }, { modelKey: 'i30' }, { modelKey: 'i3' }, { modelKey: 'golf' }]

  it('keeps only the longest stored key that prefixes the registry key', () => {
    expect(matchRatingRows(rows, 'i30n')).toEqual([{ modelKey: 'i30' }])
  })

  it('never matches one-letter stored keys or unrelated models', () => {
    expect(matchRatingRows(rows, 'ix35')).toEqual([])
  })
})

describe('applicableCrashScore', () => {
  const rows = [
    { modelKey: 'golf', year: 2012, score: 80 },
    { modelKey: 'golf', year: 2020, score: 100 },
    { modelKey: 'golf', year: 2020, score: 60 }
  ]

  it('takes the newest rating no later than a year after the car, averaged over that year', () => {
    expect(applicableCrashScore(rows, 2021)).toBe(80)
    expect(applicableCrashScore(rows, 2019)).toBe(80)
    expect(applicableCrashScore(rows, 2015)).toBe(80)
  })

  it('is null when every rating is newer than the car', () => {
    expect(applicableCrashScore(rows, 2005)).toBeNull()
  })
})

describe('combineCrashScores', () => {
  it('averages the sources that have a score', () => {
    expect(combineCrashScores({ euroncap: 100, iihs: 50, jncap: null })).toEqual({ score: 75, sources: 2 })
  })

  it('reports no score when no source rated the car', () => {
    expect(combineCrashScores({ euroncap: null })).toEqual({ score: null, sources: 0 })
  })
})

describe('crashBand', () => {
  it('bands a score, higher is safer', () => {
    expect([90, 70, 55, 20].map(crashBand)).toEqual(['green', 'yellow', 'orange', 'red'])
  })
})
