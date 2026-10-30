import { describe, expect, it } from 'vitest'

import { aliasCardPath, buildAliasUrl, sanitizeSource } from '@/routes/share/share-links'

describe('share links', () => {
  it('builds the alias URL with language and an optional source', () => {
    expect(buildAliasUrl('https://carsua.app', 'ar', 'en', '')).toBe('https://carsua.app/go/ar?lang=en')
    expect(buildAliasUrl('https://carsua.app', 'plate-photo', 'ua', 'FB Ad!')).toBe(
      'https://carsua.app/go/plate-photo?lang=ua&src=fbad'
    )
  })

  it('keeps the source URL-safe and short', () => {
    expect(sanitizeSource(' Tele gram_1 ')).toBe('telegram_1')
    expect(sanitizeSource('x'.repeat(50))).toHaveLength(32)
  })

  it('points at the alias card', () => {
    expect(aliasCardPath('vin', 'ru')).toBe('/og/page/go--vin.png?lang=ru')
  })
})
