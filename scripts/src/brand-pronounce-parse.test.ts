import { describe, expect, it } from 'vitest'

import {
  cleanIpa,
  parseEnLead,
  parseIpaCEn,
  parseIpaTemplate,
  parseRuLead,
  parseUkLead,
  splitArgs,
  templates
} from './brand-pronounce-parse.js'

const VW =
  "'''Volkswagen''' ({{IPA|de|ˈfɔlksˌvaːɡŋ̍|German|de-Volkswagen.ogg}}),{{efn |English: {{IPA" +
  'c-en|UK|ˈ|f|ɒ|l|k|s|v|ɑː|ɡ|ən|,_|ˈ|v|ɒ|l|-}}, {{IPAc-en|US|ˈ|f|ɔː|l|k|s|v|ɑː|ɡ|ən}}}} is a German company'

describe('templates / splitArgs', () => {
  it('balances nested braces and finds templates inside an efn', () => {
    expect(templates(VW, 'IPAc-en')).toHaveLength(2)
    expect(templates(VW, 'efn')).toHaveLength(1)
    expect(templates('{{IPAx|a}}', 'IPA')).toHaveLength(0)
  })
  it('splits on top-level pipes only', () => {
    expect(splitArgs('IPA|a|{{x|y}}|[[p|q]]')).toEqual(['IPA', 'a', '{{x|y}}', '[[p|q]]'])
  })
})

describe('cleanIpa', () => {
  it('drops brackets, slashes and markup', () => {
    expect(cleanIpa('[pø.ʒo]')).toBe('pø.ʒo')
    expect(cleanIpa('/ˈlada/')).toBe('ˈlada')
    expect(cleanIpa('  ')).toBeNull()
  })
})

describe('parseIpaTemplate', () => {
  it('reads language, IPA and the positional audio file', () => {
    expect(parseIpaTemplate('IPA|de|ˈfɔlksˌvaːɡŋ̍|German|de-Volkswagen.ogg')).toEqual({
      lang: 'de',
      ipa: 'ˈfɔlksˌvaːɡŋ̍',
      audio: 'de-Volkswagen.ogg'
    })
  })
  it('reads audio= and an empty label', () => {
    expect(parseIpaTemplate('IPA|ru|ˈladə||audio=LL-Q7737 (rus)-Svetlov Artem-Lada.wav')).toMatchObject({
      lang: 'ru',
      audio: 'LL-Q7737 (rus)-Svetlov Artem-Lada.wav'
    })
  })
  it('handles the language-less ru form and a "-" placeholder', () => {
    expect(parseIpaTemplate('IPA|[pø.ʒo]')).toEqual({ lang: null, ipa: 'pø.ʒo', audio: null })
    expect(parseIpaTemplate('IPA|de|ˈpɔʁʃə|-|de-Porsche.ogg').audio).toBe('de-Porsche.ogg')
  })
  it('does not take a non-audio label as a file', () => {
    expect(parseIpaTemplate('IPA|ja|toꜜjota|IPA').audio).toBeNull()
  })
})

describe('parseIpaCEn', () => {
  it('joins tokens, maps _ to space and reads the region', () => {
    expect(parseIpaCEn('IPAc-en|UK|ˈ|f|ɒ|l|k|s|v|ɑː|ɡ|ən|,_|ˈ|v|ɒ|l|-')).toMatchObject({
      region: 'uk',
      ipa: 'ˈfɒlksvɑːɡən, ˈvɒl-'
    })
  })
  it('defaults to uk, accepts "lang" and audio=', () => {
    expect(parseIpaCEn('IPAc-en|lang|t|ɔɪ|ˈ|oʊ|t|ə')).toMatchObject({ region: 'uk', ipa: 'tɔɪˈoʊtə' })
    expect(parseIpaCEn('IPAc-en|us|p|(|j|)|uː|ˈ|ʒ|oʊ|audio=en-us-Peugeot.ogg')).toMatchObject({
      region: 'us',
      audio: 'en-us-Peugeot.ogg'
    })
  })
})

describe('parseEnLead', () => {
  it('Volkswagen: native IPA + audio + UK/US readings', () => {
    expect(parseEnLead(VW)).toEqual({
      ipa: 'ˈfɔlksˌvaːɡŋ̍',
      ipaLang: 'de',
      enIpa: { uk: 'ˈfɒlksvɑːɡən, ˈvɒl-', us: 'ˈfɔːlksvɑːɡən' },
      respell: null,
      audio: 'de-Volkswagen.ogg'
    })
  })
  it('Honda: IPA inside efn, English reading without region, no audio from a label', () => {
    const wt = "{{efn|{{IPA|ja|honda ɡikẽŋ koːɡʲoː|IPA|honda_giken_kougyou.ogg}}; {{IPAc-en|ˈ|h|ɒ|n|d|ə}}}} '''Honda'''"
    expect(parseEnLead(wt)).toMatchObject({
      ipa: 'honda ɡikẽŋ koːɡʲoː',
      ipaLang: 'ja',
      audio: 'honda_giken_kougyou.ogg'
    })
  })
  it('English-only brand: the IPAc-en audio is the fallback', () => {
    const wt = '{{IPAc-en|UK|ˈ|v|ɒ|k|s|h|ɔː|l|audio=En-Vauxhall.ogg}}'
    expect(parseEnLead(wt)).toMatchObject({ ipa: null, audio: 'En-Vauxhall.ogg', enIpa: { uk: 'ˈvɒkshɔːl' } })
  })
  it('a lead with no pronunciation gives all nulls', () => {
    expect(parseEnLead("'''Toyota''' is a company")).toEqual({
      ipa: null,
      ipaLang: null,
      enIpa: { uk: null, us: null },
      respell: null,
      audio: null
    })
  })
})

describe('parseUkLead', () => {
  it('takes the respelling from {{lang-uk}}', () => {
    expect(
      parseUkLead("'''Volkswagen''' (вимова: {{lang-uk|Фольксваґен}}, переклад: ''«народний автомобіль»'')")
    ).toMatchObject({ respell: 'Фольксваґен', ipa: null })
  })
  it('returns nulls without the template', () => {
    expect(parseUkLead("'''Ford''' — американська компанія").respell).toBeNull()
  })
})

describe('parseRuLead', () => {
  it('Peugeot: IPA from the language-less template, respelling from «…»', () => {
    const wt =
      "'''Peugeot''' (<small>МФА{{ref|fr}}:</small> {{IPA|[pø.ʒo]}}; произношение названия близко к ''«пёжо́»'', однако в русском языке закрепилась [[транскрипция]] ''«пежо́»'') — [[Франция|французский]]"
    expect(parseRuLead(wt)).toMatchObject({ ipa: 'pø.ʒo', respell: 'пёжо́' })
  })
  it('Opel: IPA only', () => {
    expect(parseRuLead("'''Opel''' ({{IPA|ˈ´oːpəl}}) — [[Германия|немецкий]]")).toMatchObject({
      ipa: 'ˈ´oːpəl',
      respell: null
    })
  })
})
