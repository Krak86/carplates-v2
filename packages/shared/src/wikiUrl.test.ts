import { describe, expect, it } from 'vitest'

import { wikiUrl } from './wikiUrl.js'

describe('wikiUrl', () => {
  it('builds a go=Go search link on the language-specific Wikipedia domain', () => {
    expect(wikiUrl('SKODA', 'OCTAVIA', 'en')).toBe(
      'https://en.wikipedia.org/wiki/Special:Search?search=SKODA%20OCTAVIA&go=Go'
    )
  })

  it("maps this app's 'ua' language code to Wikipedia's 'uk' subdomain", () => {
    expect(wikiUrl('SKODA', 'OCTAVIA', 'ua')).toBe(
      'https://uk.wikipedia.org/wiki/Special:Search?search=SKODA%20OCTAVIA&go=Go'
    )
  })

  it('maps ru straight through', () => {
    expect(wikiUrl('SKODA', 'OCTAVIA', 'ru')).toBe(
      'https://ru.wikipedia.org/wiki/Special:Search?search=SKODA%20OCTAVIA&go=Go'
    )
  })

  it('falls back to en for an unknown language code', () => {
    expect(wikiUrl('SKODA', 'OCTAVIA', 'de')).toBe(
      'https://en.wikipedia.org/wiki/Special:Search?search=SKODA%20OCTAVIA&go=Go'
    )
  })

  it('builds a brand-only link when no model is known', () => {
    expect(wikiUrl('TOYOTA', null, 'en')).toBe('https://en.wikipedia.org/wiki/Special:Search?search=TOYOTA&go=Go')
  })

  it('returns null when neither brand nor model is known', () => {
    expect(wikiUrl(null, null, 'en')).toBeNull()
    expect(wikiUrl('', '', 'en')).toBeNull()
  })
})
