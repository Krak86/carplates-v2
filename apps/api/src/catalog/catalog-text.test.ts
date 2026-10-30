import { describe, expect, it } from 'vitest'
import type { CatalogModel } from '@carplates/shared'

import { catalogPageText, catalogSeoBlock, injectRoot } from './catalog-text.js'

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
    expect(html).toContain('The most common fuel: дизельне паливо.')
    expect(html).toContain('<th scope="row">ДИЗЕЛЬНЕ ПАЛИВО</th>')
    expect(html).toContain('55%')
    expect(html).toContain('<a href="/cars/bmw/x5?lang=en">BMW X5</a>')
  })

  it('keeps the default language links bare and escapes text', () => {
    const html = catalogSeoBlock({ ...MODEL, modelName: 'A<b>' }, 'ua')
    expect(html).toContain('<a href="/cars/bmw/x5">')
    expect(html).toContain('A&lt;b&gt;')
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
