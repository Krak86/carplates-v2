import { describe, expect, it } from 'vitest'

import { isSmallRdwSample, matchRdwModel, pickRdwYear, type RdwReferenceRow } from './rdwMatch.js'

const row = (kind: string, makeKey: string, modelKey: string): RdwReferenceRow => ({
  kind,
  makeKey,
  modelKey,
  aliases: [],
  make: makeKey.toUpperCase(),
  model: modelKey.toUpperCase()
})

const ROWS = [
  row('car', 'volkswagen', 'golf'),
  row('car', 'volkswagen', 'golfvariant'),
  row('car', 'bmw', '3series'),
  row('car', 'dacia', 'dokker'),
  row('car', 'dacia', 'logan'),
  row('truck', 'ford', 'transit'),
  row('car', 'ford', 'transit'),
  row('motorcycle', 'honda', 'cbr600rr')
]

describe('matchRdwModel', () => {
  it('matches the exact model key', () => {
    expect(matchRdwModel(ROWS, 'volkswagen', 'GOLF', 'car')?.row.modelKey).toBe('golf')
  })

  it('maps BMW trim codes to the series key', () => {
    const found = matchRdwModel(ROWS, 'bmw', '320D', 'car')
    expect(found?.row.modelKey).toBe('3series')
    expect(found?.how).toBe('series')
  })

  it('follows the Renault Dokker to Dacia', () => {
    expect(matchRdwModel(ROWS, 'renault', 'DOKKER', 'car')?.row.makeKey).toBe('dacia')
  })

  it('follows the Renault Logan to Dacia', () => {
    expect(matchRdwModel(ROWS, 'renault', 'LOGAN', 'car')?.row.makeKey).toBe('dacia')
  })

  it('prefers the kind of the registry class', () => {
    expect(matchRdwModel(ROWS, 'ford', 'TRANSIT', 'truck')?.row.kind).toBe('truck')
    expect(matchRdwModel(ROWS, 'ford', 'TRANSIT', 'car')?.row.kind).toBe('car')
  })

  it('does not let a motorcycle match a car', () => {
    expect(matchRdwModel(ROWS, 'honda', 'CBR600RR', 'car')).toBeNull()
    expect(matchRdwModel(ROWS, 'honda', 'CBR600RR', 'motorcycle')?.row.kind).toBe('motorcycle')
  })

  it('misses on an unknown model', () => {
    expect(matchRdwModel(ROWS, 'volkswagen', 'NOPE', 'car')).toBeNull()
  })
})

describe('pickRdwYear', () => {
  const years = [
    { year: 2010, n: 50 },
    { year: 2013, n: 50 },
    { year: 2020, n: 50 }
  ]

  it('takes the exact year', () => {
    expect(pickRdwYear(years, 2013)?.year).toBe(2013)
  })

  it('takes the nearest year within the gap, the later one on a tie', () => {
    expect(pickRdwYear(years, 2011)?.year).toBe(2010)
    expect(
      pickRdwYear(
        [
          { year: 2010, n: 50 },
          { year: 2012, n: 50 }
        ],
        2011
      )?.year
    ).toBe(2012)
  })

  it('returns null when every year is too far', () => {
    expect(pickRdwYear(years, 2025)).toBeNull()
  })

  it('keeps a thin year when it is the closest, and flags it', () => {
    const mazda = [
      { year: 2015, n: 400 },
      { year: 2016, n: 6 },
      { year: 2017, n: 300 }
    ]
    expect(pickRdwYear(mazda, 2016)?.year).toBe(2016)
    expect(pickRdwYear([{ year: 2016, n: 3 }], 2016)?.year).toBe(2016)
    expect(isSmallRdwSample(6)).toBe(true)
    expect(isSmallRdwSample(10)).toBe(false)
  })

  it('prefers a well-sampled year over a thin one at the same distance', () => {
    expect(
      pickRdwYear(
        [
          { year: 2015, n: 4 },
          { year: 2017, n: 80 }
        ],
        2016
      )?.year
    ).toBe(2017)
  })
})
