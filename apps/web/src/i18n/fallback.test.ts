import { describe, expect, it } from 'vitest'

import en from '@/i18n/en.json'
import enFallback from '@/i18n/en.fallback.json'
import ru from '@/i18n/ru.json'
import ua from '@/i18n/ua.json'

const uaKeys = Object.keys(ua)

describe('dictionary fallback', () => {
  it('en + its delta covers every ua key', () => {
    const covered = new Set([...Object.keys(en), ...Object.keys(enFallback)])
    expect(uaKeys.filter(key => !covered.has(key))).toEqual([])
  })

  it('the en delta holds only ua keys en lacks, with the ua text', () => {
    const enKeys = new Set(Object.keys(en))
    for (const [key, text] of Object.entries(enFallback)) {
      expect(enKeys.has(key)).toBe(false)
      expect(text).toBe((ua as Record<string, string>)[key])
    }
    expect(Object.keys(enFallback).length).toBeGreaterThan(0)
  })

  it('ru has every ua key, so it needs no fallback download', () => {
    const ruKeys = new Set(Object.keys(ru))
    expect(uaKeys.filter(key => !ruKeys.has(key))).toEqual([])
  })
})
