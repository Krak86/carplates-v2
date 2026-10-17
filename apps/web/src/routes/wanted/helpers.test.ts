import { describe, expect, it } from 'vitest'

import { displayLabel, foundPercent, groupYears, mapRows } from '@/routes/wanted/helpers'

describe('foundPercent', () => {
  it('is the found share of stolen', () => {
    expect(foundPercent({ stolen: 200, found: 50 })).toBe(25)
  })

  it('is 0 for an empty row', () => {
    expect(foundPercent({ stolen: 0, found: 0 })).toBe(0)
  })
})

describe('groupYears', () => {
  const rows = [
    { label: '1928', stolen: 1, found: 0, wanted: 1 },
    { label: '2019', stolen: 10, found: 1, wanted: 9 },
    { label: '2020', stolen: 5, found: 3, wanted: 2 },
    { label: '2021', stolen: 7, found: 4, wanted: 3 }
  ]

  it('sums years before 2020 into one leading row', () => {
    expect(groupYears(rows, '≤ 2019')).toEqual([
      { label: '≤ 2019', stolen: 11, found: 1, wanted: 10 },
      { label: '2020', stolen: 5, found: 3, wanted: 2 },
      { label: '2021', stolen: 7, found: 4, wanted: 3 }
    ])
  })

  it('adds no leading row when there is nothing earlier', () => {
    expect(groupYears(rows.slice(2), '≤ 2019').map(r => r.label)).toEqual(['2020', '2021'])
  })
})

describe('mapRows', () => {
  it('picks one metric per region', () => {
    expect(mapRows([{ label: 'Київ', stolen: 9, found: 4, wanted: 5 }], 'found')).toEqual([{ label: 'Київ', value: 4 }])
  })
})

describe('displayLabel', () => {
  it('sentence-cases colours and keeps short acronyms', () => {
    expect(displayLabel('color', 'БІЛИЙ', 'ua')).toBe('Білий')
    expect(displayLabel('model', 'ВАЗ', 'ua')).toBe('ВАЗ')
  })

  it('localizes regions', () => {
    expect(displayLabel('region', 'Львівська область', 'en')).toBe('Lviv Oblast')
  })
})
