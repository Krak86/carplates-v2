import { describe, expect, it } from 'vitest'

import { foldItemRows, labelToLooseSlug, labelToSlug, matchSlugs, mergeBrand } from './brand-origin-parse.js'
import type { SparqlRow } from './brand-origin-parse.js'

const uri = (id: string): { value: string } => ({ value: `http://www.wikidata.org/entity/${id}` })

describe('labelToSlug', () => {
  it('matches the brandSlug scheme', () => {
    expect(labelToSlug('Škoda')).toBe('skoda')
    expect(labelToSlug('Mercedes-Benz')).toBe('mercedes-benz')
    expect(labelToSlug('Land Rover')).toBe('land-rover')
  })

  it('drops company suffixes only in the loose form', () => {
    expect(labelToSlug('Škoda Auto')).toBe('skoda-auto')
    expect(labelToLooseSlug('Škoda Auto')).toBe('skoda')
    expect(labelToLooseSlug('Volvo Cars')).toBe('volvo')
    expect(labelToLooseSlug('Auto')).toBe('auto')
  })
})

describe('matchSlugs', () => {
  const slugs = new Set(['skoda', 'volvo'])

  it('separates exact from suffix-stripped matches and adds aliases', () => {
    const m = matchSlugs(
      [
        { id: 'Q1', labels: ['Škoda'] },
        { id: 'Q2', labels: ['Škoda Auto'] },
        { id: 'Q3', labels: ['Unrelated'] }
      ],
      slugs,
      { volvo: ['Q9'] }
    )
    expect(m.exact.get('skoda')).toEqual(['Q1'])
    expect(m.loose.get('skoda')).toEqual(['Q2'])
    expect(m.exact.get('volvo')).toEqual(['Q9'])
    expect(m.exact.has('unrelated')).toBe(false)
  })
})

describe('foldItemRows + mergeBrand', () => {
  const rows: SparqlRow[] = [
    {
      item: uri('Q1'),
      cc: { value: 'CZ' },
      inception: { value: '1895-01-01T00:00:00Z' },
      hq: { value: 'Mladá Boleslav' }
    },
    {
      item: uri('Q1'),
      cc: { value: 'CZ' },
      owner: { value: 'Volkswagen Group' },
      ownerKind: { value: 'parent' },
      ownerFrom: { value: '1991-01-01T00:00:00Z' },
      ownerCc: { value: 'DE' }
    },
    { item: uri('Q2'), ccHome: { value: 'DE' } }
  ]

  it('folds scalars and owners per item', () => {
    const facts = foldItemRows(rows)
    expect(facts.get('Q1')).toMatchObject({ countryCode: 'CZ', foundedYear: 1895, hqCity: 'Mladá Boleslav' })
    expect(facts.get('Q1')?.owners).toEqual([
      { ownerName: 'Volkswagen Group', ownerCountry: 'DE', fromYear: 1991, toYear: null, parent: true }
    ])
    expect(facts.get('Q2')).toMatchObject({ countryCode: null, homeCountryCode: 'DE' })
  })

  it('prefers the exact item and falls back to the home country', () => {
    const merged = mergeBrand('skoda', ['Q1'], ['Q2'], foldItemRows(rows))
    expect(merged.origin).toMatchObject({ countryCode: 'CZ', foundedYear: 1895, fromYear: 0, toYear: null })
    expect(merged.owners).toHaveLength(1)
    expect(mergeBrand('x', [], ['Q2'], foldItemRows(rows)).origin?.countryCode).toBe('DE')
  })

  it('returns no origin when nothing is known', () => {
    expect(mergeBrand('x', ['Q404'], [], foldItemRows(rows)).origin).toBeNull()
  })
})
