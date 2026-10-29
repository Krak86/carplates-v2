import { describe, expect, it } from 'vitest'

import { cleanVin, EXAMPLE_VIN, readVin, vinIssue, yearCodeRows } from '@/routes/read/vin/helpers'

describe('readVin', () => {
  it('reads maker, country, year and check digit off a VIN', () => {
    expect(readVin(EXAMPLE_VIN, 2026)).toMatchObject({ make: 'Hyundai', country: 'KR', year: 2016, checkOk: true })
  })

  it('ignores case, spaces and dashes', () => {
    expect(readVin('kmhd350h-6gu 123456')?.vin).toBe(EXAMPLE_VIN)
  })

  it('returns null until the input is a 17-character VIN without I, O, Q', () => {
    expect(readVin('KMHD350H6GU12345')).toBeNull()
    expect(readVin('KMHD350H6GU12345O')).toBeNull()
  })

  it('flags a wrong check digit', () => {
    expect(readVin('KMHD350H0GU123456')?.checkOk).toBe(false)
  })

  it('takes the latest cycle year that is not in the future', () => {
    expect(readVin('KMHD350H6AU123456', 2026)?.year).toBe(2010)
    expect(readVin('KMHD350H6AU123456', 2008)?.year).toBe(1980)
  })
})

describe('cleanVin', () => {
  it('strips separators', () => {
    expect(cleanVin(' ab-c 1 ')).toBe('ABC1')
  })
})

describe('yearCodeRows', () => {
  it('runs A = 2010 to 9 = 2039 and skips the unused characters', () => {
    const rows = yearCodeRows()
    expect(rows).toHaveLength(30)
    expect(rows[0]).toEqual({ code: 'A', year: 2010 })
    expect(rows.at(-1)).toEqual({ code: '9', year: 2039 })
    expect(rows.map(r => r.code)).not.toContain('U')
  })
})

describe('vinIssue', () => {
  it('names why a typed VIN is not readable', () => {
    expect(vinIssue('')).toBeNull()
    expect(vinIssue(EXAMPLE_VIN)).toBeNull()
    expect(vinIssue('1M8GDM9AOKP042788')).toBe('letters')
    expect(vinIssue('KMHD350H6GU1234567')).toBe('long')
    expect(vinIssue('KMHD350H6GU12345')).toBe('short')
  })
})

describe('VIN examples', () => {
  it('every chip behaves as its label says', async () => {
    const { VIN_EXAMPLES } = await import('@/routes/read/vin/content')
    const [valid, european, letter, unknown, short] = VIN_EXAMPLES.map(e => e.vin)
    expect(readVin(valid ?? '')?.checkOk).toBe(true)
    expect(readVin(european ?? '')).toMatchObject({ make: 'Volkswagen', checkOk: false })
    expect(vinIssue(letter ?? '')).toBe('letters')
    expect(readVin(unknown ?? '')?.make).toBeNull()
    expect(vinIssue(short ?? '')).toBe('short')
  })
})
