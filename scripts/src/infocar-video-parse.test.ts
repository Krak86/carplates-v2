import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { decodeInfocarHtml } from './infocar-parse.js'
import {
  parseDuration,
  parseLastPage,
  parseTitleYear,
  parseUkDate,
  parseVideoListing,
  parseVideoPage
} from './infocar-video-parse.js'

const page = (name: string): string =>
  decodeInfocarHtml(readFileSync(join(import.meta.dirname, 'fixtures', 'infocar', `${name}.html`)))

describe('parseDuration', () => {
  it('reads mm:ss and h:mm:ss', () => {
    expect(parseDuration('01:03')).toBe(63)
    expect(parseDuration('1:02:03')).toBe(3723)
    expect(parseDuration('soon')).toBeNull()
  })
})

describe('parseUkDate', () => {
  it('reads infocar short Ukrainian dates', () => {
    expect(parseUkDate('8 лип. 2026')).toBe('2026-07-08')
    expect(parseUkDate('21 берез. 2025')).toBe('2025-03-21')
    expect(parseUkDate('')).toBeNull()
  })
})

describe('parseTitleYear', () => {
  it('finds a model year in a title', () => {
    expect(parseTitleYear('KIA Ceed 2018: тест')).toBe(2018)
    expect(parseTitleYear('Kia Stonic: оновлений дизайн')).toBeNull()
  })
})

describe('parseVideoListing', () => {
  const items = parseVideoListing(page('video-kia'))

  it('lists the videos of a brand page', () => {
    expect(items).toHaveLength(10)
    expect(items[0]).toEqual({
      id: 19231,
      title: 'Kia Stonic: оновлений дизайн і технології для міста',
      durationS: 63,
      thumbUrl: 'https://i.infocar.ua/img/video/19231/19231_2.jpg'
    })
  })

  it('reads the last page from the pager', () => {
    expect(parseLastPage(page('video-kia'))).toBeGreaterThan(10)
  })
})

describe('parseVideoPage', () => {
  it('reads the YouTube id, brand, model and date', () => {
    expect(parseVideoPage(page('video-19231'))).toEqual({
      youtubeId: 'o1aOohTtV4Y',
      title: 'Kia Stonic: оновлений дизайн і технології для міста',
      modelSlug: 'stonic',
      generationId: 7412,
      publishedAt: '2026-07-08'
    })
  })

  it('returns null without a YouTube embed', () => {
    expect(parseVideoPage('<html><h1>x</h1></html>')).toBeNull()
  })
})
