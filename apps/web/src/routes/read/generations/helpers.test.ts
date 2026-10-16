import type { GenerationGrowthItem } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { barPercent, generationName, growthSummary, hasSize, mmToCm } from '@/routes/read/generations/helpers'

const gen = (yearFrom: number, lengthMm: number | null, wheelbaseMm: number | null = null): GenerationGrowthItem => ({
  code: '',
  label: `G${yearFrom}`,
  yearFrom,
  yearTo: null,
  lengthMm,
  widthMm: null,
  wheelbaseMm
})

describe('growthSummary', () => {
  it('compares the oldest and newest generation that have a length', () => {
    const growth = growthSummary([gen(1990, null), gen(1996, 4500, 2500), gen(2004, 4600), gen(2020, 4700, 2670)])
    expect(growth).toMatchObject({ lengthDeltaMm: 200, lengthPct: 4, wheelbaseDeltaMm: 170 })
    expect(growth?.from.yearFrom).toBe(1996)
    expect(growth?.to.yearFrom).toBe(2020)
  })

  it('has no wheelbase delta when an end lacks one', () => {
    expect(growthSummary([gen(1996, 4500), gen(2020, 4700, 2670)])?.wheelbaseDeltaMm).toBeNull()
  })

  it('is null for a single measured generation or a model that did not grow', () => {
    expect(growthSummary([gen(1996, null), gen(2020, 4700)])).toBeNull()
    expect(growthSummary([gen(1996, 4300), gen(2020, 4100)])).toBeNull()
  })
})

describe('generation helpers', () => {
  it('names a generation by code, else by label', () => {
    expect(generationName({ code: 'Mk8', label: 'Eighth generation' })).toBe('Mk8')
    expect(generationName({ code: '', label: 'Eighth generation' })).toBe('Eighth generation')
  })

  it('drops a generation with no figure at all', () => {
    expect(hasSize(gen(1990, null))).toBe(false)
    expect(hasSize(gen(1990, null, 2500))).toBe(true)
  })

  it('scales a bar to the longest generation', () => {
    expect(barPercent(2350, 4700)).toBe(50)
    expect(barPercent(null, 4700)).toBe(0)
  })

  it('formats centimetres without a needless decimal', () => {
    expect(mmToCm(180)).toBe('18')
    expect(mmToCm(175)).toBe('17.5')
  })
})
