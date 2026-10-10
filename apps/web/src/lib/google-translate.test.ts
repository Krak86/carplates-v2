import { describe, it, expect } from 'vitest'

import { googleTranslateUrl, needsTranslation } from './google-translate'

describe('googleTranslateUrl', () => {
  it('maps the app language ua to Google uk and encodes the text', () => {
    const url = new URL(googleTranslateUrl('Door de ABS-unit, kan', 'nl', 'ua'))
    expect(url.origin + url.pathname).toBe('https://translate.google.com/')
    expect(url.searchParams.get('sl')).toBe('nl')
    expect(url.searchParams.get('tl')).toBe('uk')
    expect(url.searchParams.get('text')).toBe('Door de ABS-unit, kan')
    expect(url.searchParams.get('op')).toBe('translate')
  })

  it('caps very long text', () => {
    const url = new URL(googleTranslateUrl('a'.repeat(5000), 'en', 'ru'))
    expect(url.searchParams.get('text')).toHaveLength(2000)
  })
})

describe('needsTranslation', () => {
  it('is false for the same language, with ua = uk', () => {
    expect(needsTranslation('en', 'en')).toBe(false)
    expect(needsTranslation('uk', 'ua')).toBe(false)
    expect(needsTranslation('nl', 'en')).toBe(true)
  })
})
