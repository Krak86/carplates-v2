import { describe, expect, it } from 'vitest'
import type { Generation } from '@carplates/shared'

import { generationGrowth, type RdwYearSizes } from './growth.js'

const gen = (yearFrom: number, yearTo: number | null, code = ''): Generation => ({
  code,
  label: code || `${yearFrom}`,
  yearFrom,
  yearTo,
  bodyStyles: '',
  platform: '',
  wikiTitle: ''
})

const year = (modelYear: number, lengthCm: number | null, lengthN = 20): RdwYearSizes => ({
  modelYear,
  lengthCm,
  lengthN,
  widthCm: null,
  widthN: null,
  wheelbaseCm: null
})

describe('generationGrowth', () => {
  it('takes the median of the years inside each span and converts cm to mm', () => {
    const [a, b] = generationGrowth(
      [gen(2000, 2005), gen(2006, null)],
      [year(2000, 440), year(2002, 450), year(2004, 460), year(2007, 470)],
      []
    )
    expect(a?.lengthMm).toBe(4500)
    expect(b?.lengthMm).toBe(4700)
  })

  it('gives a shared boundary year to the newer generation only', () => {
    const [a, b] = generationGrowth([gen(2000, 2006), gen(2006, null)], [year(2003, 440), year(2006, 480)], [])
    expect(a?.lengthMm).toBe(4400)
    expect(b?.lengthMm).toBe(4800)
  })

  it('prefers well-sampled years and falls back to thin ones', () => {
    const [a, b] = generationGrowth(
      [gen(2000, 2001), gen(2002, null)],
      [year(2000, 400, 3), year(2001, 440, 30), year(2002, 460, 2)],
      []
    )
    expect(a?.lengthMm).toBe(4400)
    expect(b?.lengthMm).toBe(4600)
  })

  it('fills a missing figure from Wikipedia and leaves the rest null', () => {
    const [a, b] = generationGrowth(
      [gen(1990, 1999), gen(2000, null)],
      [],
      [{ yearFrom: 1990, lengthMm: 4100, widthMm: null, wheelbaseMm: 2500 }]
    )
    expect(a).toMatchObject({ lengthMm: 4100, widthMm: null, wheelbaseMm: 2500 })
    expect(b).toMatchObject({ lengthMm: null, wheelbaseMm: null })
  })
})
