import { describe, expect, it } from 'vitest'

import { generationSpan, pickGeneration, splitWikiTitle, wikiTitleUrl } from './generations.js'

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

describe('splitWikiTitle / wikiTitleUrl', () => {
  it('reads a plain title as en', () => {
    expect(splitWikiTitle('Toyota Camry (XV40)')).toEqual({ lang: 'en', title: 'Toyota Camry (XV40)' })
    expect(wikiTitleUrl('Honda CBR600RR')).toBe('https://en.wikipedia.org/wiki/Honda_CBR600RR')
  })

  it('reads a `lang:` prefix as that edition', () => {
    expect(splitWikiTitle('de:Neoplan Cityliner')).toEqual({ lang: 'de', title: 'Neoplan Cityliner' })
    expect(wikiTitleUrl('de:Neoplan Cityliner')).toBe('https://de.wikipedia.org/wiki/Neoplan_Cityliner')
    expect(wikiTitleUrl('ua:Ява-350')).toContain('https://uk.wikipedia.org/wiki/')
  })

  it('keeps colons inside an en title', () => {
    expect(splitWikiTitle('Fiat 500: Nuova')).toEqual({ lang: 'en', title: 'Fiat 500: Nuova' })
  })
})
