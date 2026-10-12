import { describe, expect, it } from 'vitest'

import { isCuratedSource, wikiSourceUrl } from './wikiSpecsApi.js'

describe('wikiSourceUrl', () => {
  it('builds a Wikipedia URL, mapping ua to uk', () => {
    expect(wikiSourceUrl({ lang: 'ua', title: 'Lada Niva' })).toBe('https://uk.wikipedia.org/wiki/Lada_Niva')
  })
  it('returns the cited page of a curated source', () => {
    const source = { lang: 'curated', title: 'Bajaj Auto', url: 'https://www.bajajauto.com/x', accessed: '2026-10-12' }
    expect(isCuratedSource(source)).toBe(true)
    expect(wikiSourceUrl(source)).toBe('https://www.bajajauto.com/x')
  })
})
