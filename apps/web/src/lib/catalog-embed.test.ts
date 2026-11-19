import { CATALOG_EMBED_ID } from '@carplates/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const MODEL = {
  make: 'honda',
  model: 'civic',
  makeName: 'Honda',
  modelName: 'Civic',
  n: 10,
  yearMin: 2000,
  yearMax: 2020,
  topBrand: 'HONDA',
  topModel: 'CIVIC',
  kind: 'ЛЕГКОВИЙ',
  indexable: true,
  stats: { years: [], registered: [], fuel: [], body: [], color: [], regions: [] },
  siblings: []
}

const mount = (json: string): void => {
  document.body.innerHTML = `<script type="application/json" id="${CATALOG_EMBED_ID}">${json}</script>`
}

// The embed is read once per page load, so each test gets a fresh module.
const load = async () => {
  vi.resetModules()
  return import('./catalog-embed')
}

describe('catalog embed', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('seeds only the model the server rendered', async () => {
    mount(JSON.stringify({ kind: 'model', data: MODEL }))
    const { embeddedCatalogMake, embeddedCatalogMakes, embeddedCatalogModel } = await load()
    expect(embeddedCatalogModel('honda', 'civic')?.modelName).toBe('Civic')
    expect(embeddedCatalogModel('honda', 'accord')).toBeUndefined()
    expect(embeddedCatalogMake('honda')).toBeUndefined()
    expect(embeddedCatalogMakes()).toBeUndefined()
  })

  it('seeds the make index', async () => {
    mount(
      JSON.stringify({
        kind: 'makes',
        data: { makes: [{ make: 'bmw', makeName: 'BMW', n: 1, modelCount: 1, topBrand: 'BMW', indexable: true }] }
      })
    )
    const { embeddedCatalogMakes } = await load()
    expect(embeddedCatalogMakes()?.makes[0]?.make).toBe('bmw')
  })

  it('ignores a malformed or schema-invalid embed (the page then fetches)', async () => {
    mount('{not json')
    expect((await load()).embeddedCatalogModel('honda', 'civic')).toBeUndefined()
    mount(JSON.stringify({ kind: 'model', data: { make: 'honda' } }))
    expect((await load()).embeddedCatalogModel('honda', 'civic')).toBeUndefined()
  })

  it('returns nothing when the page has no embed', async () => {
    expect((await load()).embeddedCatalogMakes()).toBeUndefined()
  })
})
