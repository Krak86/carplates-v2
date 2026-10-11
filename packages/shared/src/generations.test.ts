import { describe, expect, it } from 'vitest'

import { generationSpan, pickGeneration } from './generations.js'

const list = [
  { yearFrom: 1996, yearTo: 2001 },
  { yearFrom: 2001, yearTo: 2006 },
  { yearFrom: 2006, yearTo: null }
]

describe('pickGeneration', () => {
  it('picks the span containing the year, the newest on a boundary', () => {
    expect(pickGeneration(list, 1999)).toBe(list[0])
    expect(pickGeneration(list, 2001)).toBe(list[1])
    expect(pickGeneration(list, 2030)).toBe(list[2])
    expect(pickGeneration(list, 1980)).toBeNull()
  })

  it('leaves a hole uncovered', () => {
    expect(
      pickGeneration(
        [
          { yearFrom: 2000, yearTo: 2005 },
          { yearFrom: 2009, yearTo: null }
        ],
        2007
      )
    ).toBeNull()
  })
})

describe('generationSpan', () => {
  it('writes closed, one-year and open spans', () => {
    expect(generationSpan({ yearFrom: 2006, yearTo: 2011 })).toBe('2006–2011')
    expect(generationSpan({ yearFrom: 2006, yearTo: 2006 })).toBe('2006')
    expect(generationSpan({ yearFrom: 2020, yearTo: null })).toBe('2020–')
  })
})
