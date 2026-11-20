import { describe, expect, it } from 'vitest'

import enDelta from '@/i18n/en.core.delta.pack.json'
import ru from '@/i18n/ru.json'
import ua from '@/i18n/ua.json'
import en from '@/i18n/en.json'
import { CORE, PACK_NAMES, sliceOf } from '@/i18n/packs'

const uaKeys = Object.keys(ua)
const SLICES = [CORE, ...PACK_NAMES]
const DICTS: Record<string, Record<string, string>> = { ua, ru, en }

const sliceOfLang = (lang: string, slice: string): Record<string, string> =>
  Object.fromEntries(Object.entries(DICTS[lang] ?? {}).filter(([key]) => sliceOf(key) === slice))
const fallbackDelta = (lang: string, slice: string): Record<string, string> =>
  Object.fromEntries(Object.entries(sliceOfLang('ua', slice)).filter(([key]) => !(key in (DICTS[lang] ?? {}))))

describe('dictionary slices and fallback', () => {
  it('the slices of a language partition its dictionary', () => {
    for (const [lang, dict] of [
      ['ua', ua],
      ['ru', ru],
      ['en', en]
    ] as const) {
      const keys = SLICES.flatMap(slice => Object.keys(sliceOfLang(lang, slice)))
      expect(keys.length).toBe(new Set(keys).size)
      expect(new Set(keys)).toEqual(new Set(Object.keys(dict)))
    }
  })

  it('every pack has keys in every language', () => {
    for (const lang of ['ua', 'ru', 'en']) {
      for (const pack of PACK_NAMES) expect(Object.keys(sliceOfLang(lang, pack)).length).toBeGreaterThan(0)
    }
  })

  it('en + its core delta covers every core ua key', () => {
    const covered = new Set([...Object.keys(sliceOfLang('en', CORE)), ...Object.keys(enDelta)])
    expect(Object.keys(sliceOfLang('ua', CORE)).filter(key => !covered.has(key))).toEqual([])
  })

  it('the en core delta holds only ua keys en lacks, with the ua text', () => {
    const enKeys = new Set(Object.keys(en))
    for (const [key, text] of Object.entries(enDelta)) {
      expect(enKeys.has(key)).toBe(false)
      expect(text).toBe((ua as Record<string, string>)[key])
    }
    expect(Object.keys(enDelta).length).toBeGreaterThan(0)
  })

  // `DELTAS` in `i18n/index.ts` lists en/core only: a language or pack that gains a gap must get an entry there.
  it('only en/core has gaps, so no other slice needs a delta download', () => {
    for (const lang of ['ru', 'en']) {
      for (const slice of SLICES) {
        if (lang === 'en' && slice === CORE) continue
        expect(Object.keys(fallbackDelta(lang, slice))).toEqual([])
      }
    }
  })

  it('ru has every ua key, so it needs no fallback download', () => {
    const ruKeys = new Set(Object.keys(ru))
    expect(uaKeys.filter(key => !ruKeys.has(key))).toEqual([])
  })
})
