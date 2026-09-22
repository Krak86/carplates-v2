import { describe, expect, it } from 'vitest'

import { mapPlateReaderResults } from './recognize.mapper.js'

describe('mapPlateReaderResults', () => {
  it('normalizes and repairs the OCR quirk', () => {
    const candidates = mapPlateReaderResults([{ plate: 'BH01791C', score: 0.9 }])
    expect(candidates).toEqual([{ plate: 'ВН0179ІС', raw: 'BH01791C', score: 0.9 }])
  })

  it('dedupes by normalized plate, keeping the higher score', () => {
    const candidates = mapPlateReaderResults([
      { plate: 'BE7116AA', score: 0.4 },
      { plate: 'be7116aa', score: 0.8 }
    ])
    expect(candidates).toEqual([{ plate: 'ВЕ7116АА', raw: 'BE7116AA', score: 0.8 }])
  })

  it('sorts by score descending and caps at 5 candidates', () => {
    const results = Array.from({ length: 7 }, (_, i) => ({ plate: `AA000${i}BC`, score: i / 10 }))
    const candidates = mapPlateReaderResults(results)
    expect(candidates).toHaveLength(5)
    expect(candidates[0]?.score).toBe(0.6)
    expect(candidates.at(-1)?.score).toBe(0.2)
  })

  it('skips results with no plate string', () => {
    expect(mapPlateReaderResults([{ score: 0.5 }, { plate: '', score: 0.9 }])).toEqual([])
  })

  it('defaults a missing score to 0', () => {
    expect(mapPlateReaderResults([{ plate: 'AA1234BC' }])).toEqual([{ plate: 'АА1234ВС', raw: 'AA1234BC', score: 0 }])
  })
})
