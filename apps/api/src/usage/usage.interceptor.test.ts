import { describe, it, expect } from 'vitest'

import { langFromHeader } from './usage.interceptor.js'

describe('langFromHeader', () => {
  it('maps uk to the ua UI code', () => expect(langFromHeader('uk-UA,ru;q=0.8')).toBe('ua'))
  it('keeps ru and en', () => {
    expect(langFromHeader('ru')).toBe('ru')
    expect(langFromHeader('en-GB,en;q=0.9')).toBe('en')
  })
  it('buckets everything else', () => expect(langFromHeader('de-DE')).toBe('other'))
  it('is null without a header', () => expect(langFromHeader(undefined)).toBeNull())
})
