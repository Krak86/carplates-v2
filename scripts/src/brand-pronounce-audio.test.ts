import { describe, expect, it } from 'vitest'

import { cleanAuthor, fileLang, isFreeLicense, matchesMake, originLang } from './brand-pronounce-audio.js'

describe('fileLang', () => {
  it('reads the language from the file name forms', () => {
    expect(fileLang('De-Volkswagen.ogg')).toBe('de')
    expect(fileLang('En-us-Tesla.ogg')).toBe('en')
    expect(fileLang('Pronunciation "Skoda" cs.ogg')).toBe('cs')
    expect(fileLang('LL-Q188 (deu)-Name-Volkswagen.wav')).toBe('de')
    expect(fileLang('LL-Q1860 (eng)-Someone-Tesla.wav')).toBe('en')
  })
  it('is null when unclear', () => {
    expect(fileLang('Volkswagen.ogg')).toBeNull()
  })
})

describe('originLang', () => {
  it('maps countries', () => {
    expect(originLang('DE')).toBe('de')
    expect(originLang('us')).toBe('en')
    expect(originLang('XX')).toBeNull()
    expect(originLang(null)).toBeNull()
  })
})

describe('matchesMake', () => {
  it('requires the make name and an audio extension', () => {
    expect(matchesMake('De-Volkswagen.ogg', 'Volkswagen')).toBe(true)
    expect(matchesMake('Pronunciation "Škoda" cs.ogg', 'Skoda')).toBe(true)
    expect(matchesMake('LL-Q1860 (eng)-Flame, not lame-Tesla, Inc..wav', 'Tesla')).toBe(true)
    expect(matchesMake('En-us-Gabrielle_Giffords_from_U.S._pronunciation_(Voice_of_America).ogg', 'Ford')).toBe(false)
    expect(matchesMake('En-au-dodge_a_bullet.ogg', 'Dodge')).toBe(false)
    expect(matchesMake('LL-Q1860 (eng)-Vealhurl-Cadillac_converter.wav', 'Cadillac')).toBe(false)
    expect(matchesMake('De-Audi.ogg', 'Volkswagen')).toBe(false)
    expect(matchesMake('Volkswagen logo.svg', 'Volkswagen')).toBe(false)
  })
})

describe('credit clean-up', () => {
  it('strips HTML from the author', () => {
    expect(cleanAuthor('<a href="//x">Jane &amp; Co</a>')).toBe('Jane & Co')
    expect(cleanAuthor('Speaker: Flame Recorder: Flame')).toBe('Flame')
    expect(cleanAuthor(undefined)).toBeNull()
  })
  it('accepts free licences only', () => {
    expect(isFreeLicense('CC BY-SA 3.0')).toBe(true)
    expect(isFreeLicense('CC0')).toBe(true)
    expect(isFreeLicense('Public domain')).toBe(true)
    expect(isFreeLicense('All rights reserved')).toBe(false)
    expect(isFreeLicense(null)).toBe(false)
  })
})
