import { describe, it, expect } from 'vitest'

import { MOT_BAND_EDGES_KM, MOT_KINDS, MOT_MAX_BANDS, motBandOf } from './mot.js'

describe('motBandOf', () => {
  it('puts a car on the band whose lower edge it has passed', () => {
    expect(motBandOf('car', 0)).toBe(0)
    expect(motBandOf('car', 24_999)).toBe(0)
    expect(motBandOf('car', 25_000)).toBe(1)
    expect(motBandOf('car', 149_999)).toBe(4)
    expect(motBandOf('car', 150_000)).toBe(5)
    expect(motBandOf('car', 900_000)).toBe(7)
  })

  it('uses its own, lower edges for motorcycles', () => {
    expect(motBandOf('motorcycle', 4_000)).toBe(0)
    expect(motBandOf('motorcycle', 12_000)).toBe(2)
    expect(motBandOf('motorcycle', 80_000)).toBe(5)
  })
})

describe('band edges', () => {
  it('start at zero, rise strictly and fit the per-band arrays', () => {
    for (const kind of MOT_KINDS) {
      const edges = MOT_BAND_EDGES_KM[kind]
      expect(edges[0]).toBe(0)
      expect(edges.length).toBeLessThanOrEqual(MOT_MAX_BANDS)
      edges.slice(1).forEach((e, i) => expect(e).toBeGreaterThan(edges[i]!))
    }
  })
})
