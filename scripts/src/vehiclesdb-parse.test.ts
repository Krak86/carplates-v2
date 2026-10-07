import { describe, expect, it } from 'vitest'

import { parseDecile, parseVehiclesDbRow, splitList } from './vehiclesdb-parse.js'

const base = {
  kind: 'car',
  make_slug: 'acura',
  make_name: 'Acura',
  model_slug: 'mdx-2wd',
  model_name: 'Mdx 2WD',
  body_types: 'hatchback|wagon',
  countries: 'es|us',
  regions: 'eu|na',
  global_popularity_decile: '7',
  aliases: '',
  former_ids: ''
}

describe('parseVehiclesDbRow', () => {
  it('splits list columns and computes the matching keys', () => {
    const row = parseVehiclesDbRow(base)!
    expect(row.id).toBe('car:acura:mdx-2wd')
    expect(row.makeKey).toBe('acura')
    expect(row.modelKey).toBe('mdx2wd')
    expect(row.bodyTypes).toEqual(['hatchback', 'wagon'])
    expect(row.countries).toEqual(['es', 'us'])
    expect(row.globalDecile).toBe(7)
    expect(row.aliases).toEqual([])
  })

  it('keys the make through brandSlug, so spellings collapse', () => {
    const row = parseVehiclesDbRow({ ...base, make_slug: 'mercedes-benz', make_name: 'Mercedes-Benz' })!
    expect(row.makeKey).toBe('mercedesbenz')
  })

  it('keeps an unranked model (empty decile) with a null decile', () => {
    expect(parseVehiclesDbRow({ ...base, global_popularity_decile: '' })!.globalDecile).toBeNull()
  })

  it('drops rows missing a required column or with no usable key', () => {
    expect(parseVehiclesDbRow({ ...base, model_name: '' })).toBeNull()
    expect(parseVehiclesDbRow({ ...base, model_name: '---', model_slug: '--' })).toBeNull()
  })
})

describe('parseDecile / splitList', () => {
  it('accepts only integers 1..10', () => {
    expect(parseDecile('1')).toBe(1)
    expect(parseDecile('10')).toBe(10)
    expect(parseDecile('0')).toBeNull()
    expect(parseDecile('11')).toBeNull()
    expect(parseDecile('5.5')).toBeNull()
    expect(parseDecile('')).toBeNull()
  })

  it('splits on | and drops blanks', () => {
    expect(splitList('a| b ||c')).toEqual(['a', 'b', 'c'])
    expect(splitList('')).toEqual([])
  })
})
