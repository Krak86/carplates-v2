import { describe, it, expect } from 'vitest'

import {
  MAX_EN,
  MAX_KEPT,
  aliasesFor,
  baseModel,
  collapseModel,
  pacificDayStart,
  parseIsoDuration,
  pickTop,
  rejection,
  titleLang,
  titleYear
} from './youtube-videos-filter.js'

describe('collapseModel', () => {
  it('collapses a doubled spelling', () => {
    expect(collapseModel('LANOS LANOS')).toBe('LANOS')
    expect(collapseModel('Land Cruiser Land Cruiser')).toBe('Land Cruiser')
  })
  it('leaves other models alone', () => {
    expect(collapseModel('  Land  Cruiser ')).toBe('Land Cruiser')
    expect(collapseModel('A4 A6')).toBe('A4 A6')
  })
})

describe('baseModel', () => {
  it('folds ВАЗ trim codes into the base model', () => {
    expect(baseModel('vaz', '21063')).toBe('2106')
    expect(baseModel('vaz', '210700-20')).toBe('2107')
    expect(baseModel('vaz', '211540')).toBe('2115')
    expect(baseModel('vaz', '217030')).toBe('2170')
  })
  it('keeps 21099 and its 210994 as 21099', () => {
    expect(baseModel('vaz', '21099')).toBe('21099')
    expect(baseModel('vaz', '210994-20')).toBe('21099')
  })
  it('leaves short codes and other brands alone', () => {
    expect(baseModel('vaz', '2107')).toBe('2107')
    expect(baseModel('zaz', '110307')).toBe('110307')
    expect(baseModel('vaz', 'Kalina')).toBe('Kalina')
  })
})

describe('aliasesFor', () => {
  it('needs the brand for common words', () => {
    expect(aliasesFor('nissan', 'note', 'Nissan', 'NOTE')).toContain('nissan note')
    expect(aliasesFor('nissan', 'note', 'Nissan', 'NOTE')).not.toContain('note')
  })
  it('adds the curated Cyrillic spellings', () => {
    expect(aliasesFor('volkswagen', 'touran', 'Volkswagen', 'TOURAN')).toEqual(['touran', 'туран'])
  })
})

describe('rejection', () => {
  const aliases = ['touran', 'туран']
  it('keeps a plain review', () => {
    expect(rejection({ title: 'VW Touran: огляд', durationS: 600, embeddable: true }, aliases)).toBeNull()
  })
  it.each([
    [{ title: 'VW Touran', durationS: 600, embeddable: false }, 'not embeddable'],
    [{ title: 'Skoda Octavia', durationS: 600, embeddable: true }, 'no model in title'],
    [{ title: 'Touran автопідбір під замовлення', durationS: 600, embeddable: true }, 'dealer'],
    [{ title: 'Touran', durationS: 60, embeddable: true }, 'short']
  ] as const)('drops %j', (candidate, why) => {
    expect(rejection(candidate, aliases)).toBe(why)
  })
})

describe('title helpers', () => {
  it('detects the language by script', () => {
    expect(titleLang('Огляд Туран їздить')).toBe('ua')
    expect(titleLang('Обзор Туран, ёмко')).toBe('ru')
    expect(titleLang('Обзор Туран')).toBe('ru')
    expect(titleLang('Touran review')).toBe('en')
  })
  it('finds a standalone model year', () => {
    expect(titleYear('Touran 2008 review')).toBe(2008)
    expect(titleYear('Recorded 2020-11-12')).toBeNull()
    expect(titleYear('Touran 12008')).toBeNull()
  })
  it('parses ISO durations', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723)
    expect(parseIsoDuration('PT45S')).toBe(45)
    expect(parseIsoDuration('P1D')).toBe(0)
  })
})

describe('pickTop', () => {
  it('caps the list and English ones, best views first', () => {
    const videos = [
      ...Array.from({ length: 6 }, (_, i) => ({ lang: 'en' as const, views: 1000 - i })),
      ...Array.from({ length: 10 }, (_, i) => ({ lang: 'ru' as const, views: 100 - i }))
    ]
    const top = pickTop(videos)
    expect(top).toHaveLength(MAX_KEPT)
    expect(top.filter(v => v.lang === 'en')).toHaveLength(MAX_EN)
    expect(top[0]?.views).toBe(1000)
  })
})

describe('pacificDayStart', () => {
  it('is at most a day before now and not in the future', () => {
    const now = new Date('2026-10-05T12:00:00Z')
    const start = pacificDayStart(now)
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(now.getTime() - start.getTime()).toBeLessThan(24 * 3600 * 1000)
    // 12:00 UTC is 05:00 PDT -> the Pacific day started 5 h earlier.
    expect(start.toISOString()).toBe('2026-10-05T07:00:00.000Z')
  })
})
