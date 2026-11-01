import { describe, expect, it } from 'vitest'
import { CUSTOMS_PRESETS, parseCustomsQuery } from '@carplates/shared'

import {
  customsLotHref,
  customsPrefillHref,
  formToInput,
  initialForm,
  parsePositive,
  presetHref
} from '@/routes/customs/helpers'

describe('customs helpers', () => {
  it('defaults to the petrol preset without params', () => {
    expect(initialForm({}, false)).toMatchObject({ fuel: 'petrol', value: '10000', cc: '1600', year: '2020' })
  })

  it('uses only what the link carried when there are params', () => {
    const { query, hasParams } = parseCustomsQuery(new URLSearchParams('cc=1998&year=2016'))
    expect(initialForm(query, hasParams)).toMatchObject({ fuel: '', value: '', cc: '1998', year: '2016' })
  })

  it('parses comma decimals and rejects junk', () => {
    expect(parsePositive('12,5')).toBe(12.5)
    expect(parsePositive('')).toBeNull()
    expect(parsePositive('-3')).toBeNull()
    expect(parsePositive('abc')).toBeNull()
  })

  it('needs a value and a sane year; ignores cc for an EV and kwh otherwise', () => {
    const form = initialForm({}, false)
    expect(formToInput({ ...form, value: '' }, 2026, 50)).toBeNull()
    expect(formToInput({ ...form, year: '1850' }, 2026, 50)).toBeNull()
    expect(formToInput({ ...form, kwh: '60' }, 2026, 50)).toMatchObject({ cc: 1600, kwh: null })
    expect(formToInput({ ...form, fuel: 'ev', kwh: '60' }, 2026, 50)).toMatchObject({ cc: null, kwh: 60 })
  })

  it('turns a duty percent into a rate and drops an out-of-range one', () => {
    const form = initialForm({}, false)
    expect(formToInput({ ...form, duty: '5' }, 2026, 50)?.dutyRate).toBe(0.05)
    expect(formToInput({ ...form, duty: '500' }, 2026, 50)?.dutyRate).toBeNull()
  })

  it('builds preset links that parse back to the preset', () => {
    for (const preset of CUSTOMS_PRESETS) {
      const search = presetHref(preset).split('?')[1]!
      const { query } = parseCustomsQuery(new URLSearchParams(search))
      expect(query).toMatchObject({ fuel: preset.fuel, value: preset.value, year: preset.year })
    }
  })

  it('waits for a fuel choice before it calculates', () => {
    const form = initialForm({}, false)
    expect(formToInput({ ...form, fuel: '' }, 2026, 50)).toBeNull()
  })
})

describe('prefill links', () => {
  it('needs the engine size and the year', () => {
    expect(customsPrefillHref({ cc: 1600 })).toBeNull()
    expect(customsPrefillHref({ year: 2019 })).toBeNull()
    expect(customsPrefillHref({ cc: 1600, year: 2019, fuelText: 'Gasoline' })).toBe(
      '/customs?fuel=petrol&cc=1600&year=2019'
    )
  })

  it('leaves the fuel empty for a hybrid or unclassified text', () => {
    expect(customsPrefillHref({ cc: 1800, year: 2019, fuelText: 'Hybrid' })).toBe('/customs?cc=1800&year=2019')
    expect(customsPrefillHref({ cc: 1800, year: 2019, fuelText: 'Gasoline Electric' })).toBe(
      '/customs?cc=1800&year=2019'
    )
    expect(customsPrefillHref({ cc: 1800, year: 2019, fuelText: null })).toBe('/customs?cc=1800&year=2019')
  })

  it('turns the lot price into euros at the NBU rate, sale price first', () => {
    const lot = { year: 2018, engineCc: 2000, fuel: 'diesel', startPrice: 200_000, salePrice: 400_000 }
    expect(customsLotHref(lot, { eurUah: 50 })).toBe('/customs?fuel=diesel&value=8000&cc=2000&year=2018')
    expect(customsLotHref({ ...lot, salePrice: null }, { eurUah: 50 })).toContain('value=4000')
    expect(customsLotHref(lot, null)).toBe('/customs?fuel=diesel&cc=2000&year=2018')
    expect(customsLotHref({ ...lot, engineCc: null }, { eurUah: 50 })).toBeNull()
  })
})
