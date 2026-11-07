import { describe, expect, it } from 'vitest'

import type { Lead } from './brand-pronounce-parse.js'
import { buildRows, overrideKey, parseOverrides } from './brand-pronounce-rows.js'

const lead = (p: Partial<Lead> = {}): Lead => ({
  ipa: null,
  ipaLang: null,
  enIpa: { uk: null, us: null },
  respell: null,
  audio: null,
  ...p
})

const VW_EN = lead({
  ipa: 'ˈfɔlksˌvaːɡŋ̍',
  ipaLang: 'de',
  enIpa: { uk: 'ˈfɒlksvɑːɡən', us: null },
  audio: 'de-Volkswagen.ogg'
})

describe('buildRows', () => {
  it('Volkswagen: en prefers the English reading, ua gets the respelling plus native IPA', () => {
    const rows = buildRows('volkswagen', {
      en: { lead: VW_EN, revid: 10 },
      uk: { lead: lead({ respell: 'Фольксваґен' }), revid: 20 },
      ru: { lead: lead(), revid: 30 }
    })
    expect(rows).toEqual([
      {
        brandSlug: 'volkswagen',
        lang: 'ua',
        ipa: 'ˈfɔlksˌvaːɡŋ̍',
        ipaLang: 'de',
        respell: 'Фольксваґен',
        source: 'wikipedia:uk',
        rev: 20
      },
      {
        brandSlug: 'volkswagen',
        lang: 'ru',
        ipa: 'ˈfɔlksˌvaːɡŋ̍',
        ipaLang: 'de',
        respell: null,
        source: 'wikipedia:en',
        rev: 10
      },
      {
        brandSlug: 'volkswagen',
        lang: 'en',
        ipa: 'ˈfɒlksvɑːɡən',
        ipaLang: 'en',
        respell: null,
        source: 'wikipedia:en',
        rev: 10
      }
    ])
  })
  it('ru lead IPA and respelling win over the native fallback', () => {
    const rows = buildRows('peugeot', {
      ru: { lead: lead({ ipa: 'pø.ʒo', respell: 'пёжо́' }), revid: 5 }
    })
    expect(rows).toEqual([
      { brandSlug: 'peugeot', lang: 'ru', ipa: 'pø.ʒo', ipaLang: null, respell: 'пёжо́', source: 'wikipedia:ru', rev: 5 }
    ])
  })
  it('drops a make with nothing and tolerates missing leads', () => {
    expect(buildRows('x', { en: { lead: lead(), revid: 1 } })).toEqual([])
    expect(buildRows('x', {})).toEqual([])
  })
})

describe('overrides', () => {
  const csv = [
    '# comment',
    'brand_slug,lang,ipa,ipa_lang,respell',
    'toyota,ua,,,Тойота',
    'toyota,en,"toꜜjota, x",ja,',
    ''
  ].join('\n')

  it('parses cells, quotes and empty = keep', () => {
    const o = parseOverrides(csv)
    expect(o.get(overrideKey('toyota', 'ua'))).toEqual({ ipa: null, ipaLang: null, respell: 'Тойота' })
    expect(o.get(overrideKey('toyota', 'en'))).toEqual({ ipa: 'toꜜjota, x', ipaLang: 'ja', respell: null })
  })
  it('rejects an unknown language', () => {
    expect(() => parseOverrides('brand_slug,lang,ipa,ipa_lang,respell\ntoyota,de,a,,')).toThrow(/bad row/)
  })
  it('replaces only the given cell and marks the row as an override', () => {
    const rows = buildRows(
      'toyota',
      { en: { lead: lead({ enIpa: { uk: 'tɔɪˈoʊtə', us: null } }), revid: 7 } },
      parseOverrides(csv)
    )
    expect(rows.find(r => r.lang === 'en')).toMatchObject({
      ipa: 'toꜜjota, x',
      ipaLang: 'ja',
      source: 'override',
      rev: null
    })
    expect(rows.find(r => r.lang === 'ua')).toMatchObject({ ipa: null, respell: 'Тойота', source: 'override' })
  })
})
