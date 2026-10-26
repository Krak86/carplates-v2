import { join } from 'node:path'

import { brandSlug } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { readCsv } from './csv-io.js'
import { parseModelPlants } from './model-plants-parse.js'

const record = (over: Record<string, string> = {}): Record<string, string> => ({
  brand_slug: 'skoda',
  models: 'OCTAVIA|OCTAVIA A5',
  country_code: 'CZ',
  city: 'Mladá Boleslav',
  from_year: '1996',
  to_year: '',
  source_url: 'https://en.wikipedia.org/wiki/%C5%A0koda_Octavia',
  ...over
})

/** Slugs whose registry spelling is not the slug itself. */
const REGISTRY_SPELLING: Record<string, string> = { zaz: 'ЗАЗ' }

describe('parseModelPlants', () => {
  it('expands the model list into one row per modelKey', () => {
    const { rows, errors } = parseModelPlants([record()])
    expect(errors).toEqual([])
    expect(rows.map(r => r.modelSlug)).toEqual(['octavia', 'octaviaa5'])
    expect(rows[0]).toMatchObject({ brandSlug: 'skoda', countryCode: 'CZ', fromYear: 1996, toYear: null })
  })

  it('rejects a missing source, a non-Wikipedia source, a bad country and an inverted range', () => {
    const bad = [
      record({ source_url: '' }),
      record({ source_url: 'https://example.com/octavia' }),
      record({ country_code: 'cz' }),
      record({ from_year: '2010', to_year: '2000' })
    ]
    const { rows, errors } = parseModelPlants(bad)
    expect(rows).toEqual([])
    expect(errors).toHaveLength(4)
  })
})

it('drops spellings that collapse to the same key', () => {
  const { rows } = parseModelPlants([record({ models: 'RAV4|RAV-4' })])
  expect(rows.map(r => r.modelSlug)).toEqual(['rav4'])
})

describe('seed-data/model-plants.csv', () => {
  it('is valid, cites a source per row and uses known brand slugs', async () => {
    const csv = await readCsv(join(import.meta.dirname, '..', 'seed-data', 'model-plants.csv'))
    expect(csv).not.toBeNull()
    const { rows, errors } = parseModelPlants(csv!.records)
    expect(errors).toEqual([])
    expect(rows.length).toBeGreaterThan(100)
    for (const slug of new Set(rows.map(r => r.brandSlug)))
      expect(brandSlug(REGISTRY_SPELLING[slug] ?? slug), slug).toBe(slug)
  })
})
