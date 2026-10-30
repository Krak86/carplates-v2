import { describe, expect, it } from 'vitest'
import type { CatalogMake, CatalogModel } from '@carplates/shared'

import {
  breadcrumbJsonLd,
  catalogCarJsonLd,
  catalogCrumbs,
  catalogIndexSeoBlock,
  catalogMakePageText,
  catalogMakeSeoBlock,
  catalogPageText,
  catalogSeoBlock,
  injectRoot
} from './catalog-text.js'

const MODEL: CatalogModel = {
  make: 'bmw',
  model: '3series',
  makeName: 'BMW',
  modelName: '3 Series',
  n: 110055,
  yearMin: 1995,
  yearMax: 2024,
  topBrand: 'BMW',
  topModel: '320D',
  kind: 'ЛЕГКОВИЙ',
  indexable: true,
  stats: {
    years: [
      ['2005', 9000],
      ['2010', 7000]
    ],
    registered: [],
    fuel: [
      ['ДИЗЕЛЬНЕ ПАЛИВО', 60000],
      ['БЕНЗИН', 40000]
    ],
    body: [['СЕДАН', 80000]],
    color: [],
    regions: [['М.КИЇВ', 20000]]
  },
  siblings: [{ model: 'x5', modelName: 'X5', n: 96119 }]
}

describe('catalogPageText', () => {
  it('names the model, count and year range in each language', () => {
    expect(catalogPageText(MODEL, 'en').title).toBe('BMW 3 Series in Ukraine: cars registered, years, fuel | Cars UA')
    expect(catalogPageText(MODEL, 'en').description).toContain('built 1995-2024')
    expect(catalogPageText(MODEL, 'ua').description).toContain('роки випуску 1995-2024')
    expect(catalogPageText(MODEL, 'ru').title).toContain('в Украине')
  })

  it('has no em dash in user-visible text', () => {
    for (const lang of ['ua', 'ru', 'en'] as const) {
      const { title, description } = catalogPageText(MODEL, lang)
      expect(title + description + catalogSeoBlock(MODEL, lang)).not.toContain('—')
    }
  })
})

describe('catalogSeoBlock', () => {
  it('renders h1, summary, tables and plain sibling links', () => {
    const html = catalogSeoBlock(MODEL, 'en')
    expect(html).toContain('<h1>BMW 3 Series in Ukraine</h1>')
    expect(html).toContain('The most common fuel: diesel.')
    expect(html).toContain('<th scope="row">diesel</th>')
    expect(catalogSeoBlock({ ...MODEL, stats: { ...MODEL.stats, regions: [['Київ', 20000]] } }, 'en')).toContain(
      '<th scope="row">Kyiv</th>'
    )
    expect(html).toContain('55%')
    expect(html).toContain('<a href="/cars/bmw/x5?lang=en">BMW X5</a>')
  })

  it('shows the registry words in Ukrainian and merges body variants', () => {
    const html = catalogSeoBlock(
      {
        ...MODEL,
        stats: {
          ...MODEL.stats,
          body: [
            ['СЕДАН-B', 50],
            ['СЕДАН', 30]
          ]
        }
      },
      'ua'
    )
    expect(html).toContain('<th scope="row">дизельне паливо</th>')
    expect(html).toContain('<th scope="row">седан</th><td>80</td>')
  })

  it('keeps the default language links bare and escapes text', () => {
    const html = catalogSeoBlock({ ...MODEL, modelName: 'A<b>' }, 'ua')
    expect(html).toContain('<a href="/cars/bmw/x5">')
    expect(html).toContain('A&lt;b&gt;')
  })
})

describe('engine line and Car JSON-LD', () => {
  const withEngine: CatalogModel = { ...MODEL, stats: { ...MODEL.stats, capacityP50: 2993, powerP50: 210 } }

  it('adds the typical engine line to the block in each language, and nothing when unknown', () => {
    expect(catalogSeoBlock(withEngine, 'en')).toContain('<p>Typical engine size: 2,993 cc · Typical power: 210 kW</p>')
    expect(catalogSeoBlock(withEngine, 'ua')).toContain("Типовий об'єм двигуна: 2")
    expect(catalogSeoBlock(withEngine, 'ru')).toContain('Типичный объём двигателя: 2')
    expect(catalogSeoBlock(MODEL, 'en')).not.toContain('Typical')
    expect(catalogSeoBlock({ ...MODEL, stats: { ...MODEL.stats, powerP50: 150 } }, 'en')).toContain(
      '<p>Typical power: 150 kW</p>'
    )
  })

  it('describes the model as a Car with localized fuel/body and the typical engine', () => {
    const ld = catalogCarJsonLd('https://carsua.app', withEngine, 'en') as Record<string, unknown>
    expect(ld).toMatchObject({
      '@type': 'Car',
      name: 'BMW 3 Series',
      url: 'https://carsua.app/cars/bmw/3series?lang=en',
      brand: { '@type': 'Brand', name: 'BMW' },
      fuelType: 'diesel',
      bodyType: 'sedan',
      vehicleEngine: {
        engineDisplacement: { value: 2993, unitCode: 'CMQ' },
        enginePower: { value: 210, unitCode: 'KWT' }
      }
    })
    expect(catalogCarJsonLd('https://carsua.app', MODEL, 'ua')).not.toHaveProperty('vehicleEngine')
  })
})

describe('injectRoot', () => {
  it('fills the empty root only', () => {
    expect(injectRoot('<body><div id="root"></div></body>', '<main/>')).toBe(
      '<body><div id="root"><main/></div></body>'
    )
    expect(injectRoot('<div id="root" data-x="1"></div>', '<main/>')).toBe('<div id="root" data-x="1"></div>')
  })
})

const MAKE: CatalogMake = {
  make: 'bmw',
  makeName: 'BMW',
  n: 480666,
  modelCount: 2,
  topBrand: 'BMW',
  indexable: true,
  models: [
    { model: '5series', modelName: '5 Series', n: 132203, yearMin: 1984, yearMax: 2025 },
    { model: 'x5', modelName: 'X5', n: 96119, yearMin: 2000, yearMax: null }
  ]
}

describe('catalog breadcrumbs', () => {
  it('builds Home > Cars > make > model and numbers the JSON-LD items from 1', () => {
    const crumbs = catalogCrumbs('en', { slug: 'bmw', name: 'BMW' }, { name: 'X5', path: '/cars/bmw/x5' })
    expect(crumbs.map(c => c.name)).toEqual(['Home', 'Cars', 'BMW', 'X5'])
    const ld = breadcrumbJsonLd('https://carsua.app', crumbs, 'en') as { itemListElement: Record<string, unknown>[] }
    expect(ld.itemListElement.map(i => i.position)).toEqual([1, 2, 3, 4])
    expect(ld.itemListElement[0]?.item).toBe('https://carsua.app/?lang=en')
    expect(ld.itemListElement[3]?.item).toBe('https://carsua.app/cars/bmw/x5?lang=en')
  })

  it('puts the trail and the make link in the model block, in the page language', () => {
    const html = catalogSeoBlock(MODEL, 'en')
    expect(html).toContain('<nav aria-label="Breadcrumb"><ol><li><a href="/?lang=en">Home</a></li>')
    expect(html).toContain('<li><a href="/cars/bmw?lang=en">BMW</a></li><li>3 Series</li>')
    expect(html).toContain('<a href="/cars/bmw?lang=en">All BMW models</a>')
  })
})

describe('make and index blocks', () => {
  it('lists every model of the make with count and years', () => {
    const html = catalogMakeSeoBlock(MAKE, 'en')
    expect(html).toContain('<h1>BMW in Ukraine</h1>')
    expect(html).toContain('<a href="/cars/bmw/5series?lang=en">BMW 5 Series</a> - 132,203 cars (1984-2025)')
    expect(html).toContain('<a href="/cars/bmw/x5?lang=en">BMW X5</a> - 96,119 cars</li>')
    expect(catalogMakePageText(MAKE, 'ua').title).toBe('BMW в Україні: моделі та кількість авто | Cars UA')
  })

  it('lists every make on the index', () => {
    const { models: _models, ...summary } = MAKE
    const html = catalogIndexSeoBlock([summary], 'ua')
    expect(html).toContain('<h1>Авто в Україні за марками</h1>')
    expect(html).toContain('<a href="/cars/bmw">BMW</a>')
  })

  it('has no em dash in any language', () => {
    const { models: _models, ...summary } = MAKE
    for (const lang of ['ua', 'ru', 'en'] as const) {
      expect(catalogMakeSeoBlock(MAKE, lang) + catalogIndexSeoBlock([summary], lang)).not.toContain('—')
      expect(catalogMakePageText(MAKE, lang).description).not.toContain('—')
    }
  })
})
