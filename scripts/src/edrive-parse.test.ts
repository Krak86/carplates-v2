import { describe, expect, it } from 'vitest'

import { displayName, generationRanges, postToRow } from './edrive-parse.js'

const gen = (id: number, defaultName: string, year: string) => ({ id, defaultName, name: '', year: { name: year } })

describe('generationRanges', () => {
  it('ends each generation the year before the next starts; the last is open', () => {
    const ranges = generationRanges([
      gen(3147, 'III', '2018'),
      gen(3145, 'II', '2012'),
      gen(3148, 'III Restyling', '2021')
    ])
    const byId = Object.fromEntries(ranges.map(r => [r.generation.id, [r.yearFrom, r.yearTo]]))
    expect(byId).toEqual({ 3145: [2012, 2017], 3147: [2018, 2020], 3148: [2021, null] })
  })

  it('keeps an undated generation unbounded', () => {
    expect(generationRanges([gen(1, 'I', '')])).toEqual([{ generation: gen(1, 'I', ''), yearFrom: null, yearTo: null }])
  })
})

describe('displayName', () => {
  it("prefers the site's own name over the default", () => {
    expect(displayName({ defaultName: 'Cee’d', name: 'Ceed' })).toBe('Ceed')
    expect(displayName({ defaultName: 'Cee’d', name: '' })).toBe('Cee’d')
  })
})

describe('postToRow', () => {
  it('builds the table row with the post link and the model slug', () => {
    const [range] = generationRanges([gen(3145, 'II', '2012')])
    const row = postToRow(
      {
        id: 80077,
        title: ' Oil ',
        createdAt: '2025-07-01T11:33:18.000000Z',
        coverUrl: null,
        category: { name: 'Сервіс' }
      },
      'kia',
      "Cee'd",
      range!
    )
    expect(row).toMatchObject({
      postId: 80077,
      url: 'https://e-drive.com.ua/post/80077',
      title: 'Oil',
      category: 'Сервіс',
      createdAt: '2025-07-01',
      brandSlug: 'kia',
      modelSlug: 'ceed',
      generationName: 'II',
      yearFrom: 2012,
      yearTo: null
    })
  })
})
