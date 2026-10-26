import { describe, expect, it } from 'vitest'
import type { OriginResponse } from '@carplates/shared'

import { buildOriginChip, buildOriginView, plantCity, yearRange } from '@/components/OriginSection.helpers'

const SKODA: OriginResponse = {
  brand: {
    slug: 'skoda',
    periods: [
      { countryCode: 'CZ', fromYear: 0, toYear: null, foundedYear: 1895, hqCity: 'Mladá Boleslav', source: 'wd' }
    ],
    ownership: [{ ownerName: 'Volkswagen Group', fromYear: 1991, toYear: null, source: 'wd' }],
    asOf: '2026-10-26'
  },
  plant: { countryCode: 'CZ', city: null, source: 'wmi' }
}

describe('buildOriginView', () => {
  it('lists brand, ownership, assembly, Ukraine in order', () => {
    const view = buildOriginView(SKODA, 2018, { date: '01.02.2020', imported: true })

    expect(view.steps.map(s => s.kind)).toEqual(['brand', 'ownership', 'assembly', 'ukraine'])
    expect(view.asOf).toBe('2026-10-26')
  })

  it('shows former states by the car year', () => {
    const view = buildOriginView(SKODA, 1985, null)

    expect(view.steps[0]).toMatchObject({ kind: 'brand', country: 'CSHH', foundedYear: 1895 })
    expect(view.steps[2]).toMatchObject({ kind: 'assembly', country: 'CSHH' })
  })

  it('keeps the modern country without a year', () => {
    expect(buildOriginView(SKODA, null, null).steps[0]).toMatchObject({ country: 'CZ' })
  })

  it('maps year 0 to "no date" in ownership', () => {
    const data: OriginResponse = {
      brand: { slug: 'x', periods: [], ownership: [{ ownerName: 'Acme', fromYear: 0, toYear: 2005, source: 's' }] }
    }

    expect(buildOriginView(data, 2000, null).steps[0]).toMatchObject({
      kind: 'ownership',
      owners: [{ name: 'Acme', from: null, to: 2005 }]
    })
  })

  it('picks the brand period in force that year', () => {
    const data: OriginResponse = {
      brand: {
        slug: 'zaz',
        periods: [
          { countryCode: 'SU', fromYear: 0, toYear: 1991, source: 's' },
          { countryCode: 'UA', fromYear: 1992, toYear: null, source: 's' }
        ],
        ownership: []
      }
    }

    expect(buildOriginView(data, 1985, null).steps[0]).toMatchObject({ country: 'SU' })
    expect(buildOriginView(data, 2005, null).steps[0]).toMatchObject({ country: 'UA' })
  })

  it('adds no Ukraine step when no origin fact is known', () => {
    expect(buildOriginView({}, 2018, { date: null, imported: false }).steps).toEqual([])
    expect(buildOriginView(undefined, 2018, { date: null, imported: false }).steps).toEqual([])
  })

  it('carries the hints', () => {
    const view = buildOriginView(
      { hints: { northAmericaVin: true, makerMismatch: { wmiMaker: 'Ford' }, assemblyDiffers: null } },
      2018,
      null
    )

    expect(view).toMatchObject({ makerMismatch: 'Ford', northAmericaVin: true, assemblyDiffers: false })
  })

  describe('buildOriginChip', () => {
    it('brand only', () => {
      const data: OriginResponse = { brand: { slug: 'toyota', periods: [SKODA.brand!.periods[0]!], ownership: [] } }

      expect(buildOriginChip(data, 2018)).toEqual({
        brand: { country: 'CZ', ukrainianSsr: false },
        owner: null,
        plant: null
      })
    })

    it('brand + owner from another country', () => {
      const data: OriginResponse = {
        brand: {
          ...SKODA.brand!,
          ownership: [{ ownerName: 'Volkswagen Group', ownerCountry: 'DE', fromYear: 1991, toYear: null, source: 'wd' }]
        }
      }

      expect(buildOriginChip(data, 2018)?.owner).toEqual({ name: 'Volkswagen Group', country: 'DE' })
    })

    it('hides an owner from the brand country, of unknown country or gone before the car year', () => {
      const owned = (ownerCountry: string | null, toYear: number | null): OriginResponse => ({
        brand: { ...SKODA.brand!, ownership: [{ ownerName: 'X', ownerCountry, fromYear: 1991, toYear, source: 'wd' }] }
      })

      expect(buildOriginChip(owned('CZ', null), 2018)?.owner).toBeNull()
      expect(buildOriginChip(owned(null, null), 2018)?.owner).toBeNull()
      expect(buildOriginChip(owned('DE', 2000), 2018)?.owner).toBeNull()
    })

    it('brand + plant, with the former state by year', () => {
      expect(buildOriginChip(SKODA, 1985)).toMatchObject({
        brand: { country: 'CSHH' },
        plant: { country: 'CSHH', city: null }
      })
    })

    it('nothing known', () => {
      expect(buildOriginChip(undefined, 2018)).toBeNull()
      expect(buildOriginChip({}, 2018)).toBeNull()
    })
  })

  it('lists model plants under the assembly step', () => {
    const data: OriginResponse = {
      plant: { countryCode: 'MX', source: 'nhtsa', city: 'Puebla' },
      modelPlants: [{ countryCode: 'DE', city: 'Wolfsburg', fromYear: 2010, toYear: null, sourceUrl: 'u' }]
    }

    expect(buildOriginView(data, 2018, null).steps[0]).toMatchObject({
      kind: 'assembly',
      city: 'Puebla',
      alsoBuiltIn: [{ country: 'DE', city: 'Wolfsburg', from: 2010, to: null }]
    })
  })
})

describe('model plants (also built in)', () => {
  const plants: OriginResponse['modelPlants'] = [
    { countryCode: 'CZ', city: 'Mladá Boleslav', fromYear: 1996, toYear: null, sourceUrl: 'u' },
    { countryCode: 'CZ', city: 'Kvasiny', fromYear: 2001, toYear: null, sourceUrl: 'u' },
    { countryCode: 'IN', city: 'Aurangabad', fromYear: 2001, toYear: null, sourceUrl: 'u' },
    { countryCode: 'CN', city: 'Shanghai', fromYear: 2007, toYear: 2012, sourceUrl: 'u' }
  ]
  const alt = (data: OriginResponse, year: number | null): string[] => {
    const step = buildOriginView(data, year, null).steps.find(s => s.kind === 'assembly')
    return step?.kind === 'assembly' ? step.alsoBuiltIn.map(a => `${a.country}/${a.city}`) : []
  }

  it('drops plants not yet open or already closed in the car year', () => {
    const data = { plant: { countryCode: 'CZ', source: 'wmi' as const }, modelPlants: plants }
    expect(alt(data, 2000)).toEqual([])
    expect(alt(data, 2010)).toEqual(['IN/Aurangabad', 'CN/Shanghai'])
    expect(alt(data, 2015)).toEqual(['IN/Aurangabad'])
    expect(alt(data, null)).toEqual(['IN/Aurangabad', 'CN/Shanghai'])
  })

  it("drops the car's own plant, matching the NHTSA capitals and diacritics", () => {
    const own = { countryCode: 'CZ', source: 'nhtsa' as const, city: 'MLADA BOLESLAV' }
    expect(alt({ plant: own, modelPlants: plants }, 2010)).toEqual(['CZ/Kvasiny', 'IN/Aurangabad', 'CN/Shanghai'])
  })
})

describe('yearRange', () => {
  it('formats open, closed and unknown ranges', () => {
    expect(yearRange(2005, 2012)).toBe('2005-2012')
    expect(yearRange(2008, null)).toBe('2008+')
    expect(yearRange(null, 2022)).toBe('-2022')
    expect(yearRange(null, null)).toBeNull()
  })
})

describe('plantCity', () => {
  it('title-cases NHTSA capitals, keeps mixed case, drops empty', () => {
    expect(plantCity('GEORGETOWN')).toBe('Georgetown')
    expect(plantCity('MLADÁ BOLESLAV')).toBe('Mladá Boleslav')
    expect(plantCity('Kvasiny')).toBe('Kvasiny')
    expect(plantCity('')).toBeNull()
  })
})
