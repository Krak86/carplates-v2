import { describe, it, expect } from 'vitest'

import { parseSearch, parseTitleYear, titleMatches, words } from './sketchfab-parse.js'

const hit = (name: string, extra: object = {}): object => ({
  uid: name.replace(/\W/g, ''),
  name,
  viewCount: 10,
  likeCount: 3,
  publishedAt: '2025-10-06T10:56:04.628378',
  thumbnails: {
    images: [
      { url: 'big', width: 1920 },
      { url: 'mid', width: 1024 },
      { url: 'want', width: 720 },
      { url: 'small', width: 256 }
    ]
  },
  user: { displayName: 'Ddiaz Design', username: 'ddiaz-design', profileUrl: 'https://sketchfab.com/ddiaz-design' },
  license: { label: 'CC Attribution' },
  ...extra
})

describe('words', () => {
  it('drops apostrophes and splits on punctuation', () => {
    expect(words("Kia Cee'd 1.6-CRDi")).toEqual(['kia', 'ceed', '1', '6', 'crdi'])
  })
})

describe('parseTitleYear', () => {
  it('reads a year from the title', () => {
    expect(parseTitleYear("2011 Kia Cee'd 1.6 CRDi 3")).toBe(2011)
    expect(parseTitleYear('Kia Ceed GT-line 2019')).toBe(2019)
  })
  it('ignores non-year numbers', () => {
    expect(parseTitleYear('Kia Ceed 1.6 CRDi')).toBeNull()
    expect(parseTitleYear('Kia Ceed 12345')).toBeNull()
  })
})

describe('titleMatches', () => {
  it('needs the brand and every model word in the title', () => {
    expect(titleMatches("2011 Kia Cee'd 1.6 CRDi 3", 'kia', 'Ceed')).toBe(true)
    expect(titleMatches('Kia Ceed Sportswagon', 'kia', 'Ceed')).toBe(true)
    expect(titleMatches('Jeep Grand Cherokee', 'jeep', 'Grand Cherokee')).toBe(true)
    expect(titleMatches('Jeep Cherokee', 'jeep', 'Grand Cherokee')).toBe(false)
    expect(titleMatches('Land Rover Defender', 'land-rover', 'Defender')).toBe(true)
  })
  it('rejects neighbours and packs', () => {
    expect(titleMatches('Traffic Rider NPC Vehicles', 'kia', 'Ceed')).toBe(false)
    expect(titleMatches('Ceed', 'kia', 'Ceed')).toBe(false)
    expect(titleMatches('Kia Cerato', 'kia', 'Ceed')).toBe(false)
  })
})

describe('parseSearch', () => {
  it('keeps matching, non-restricted hits and trims them', () => {
    const json = {
      results: [
        hit('Kia Ceed 2019'),
        hit('Traffic Rider NPC Vehicles'),
        hit('Kia Ceed hidden', { isAgeRestricted: true })
      ]
    }
    const out = parseSearch(json, 'kia', 'Ceed')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      name: 'Kia Ceed 2019',
      year: 2019,
      authorName: 'Ddiaz Design',
      thumbUrl: 'want',
      license: 'CC Attribution',
      publishedAt: '2025-10-06'
    })
  })
  it('tolerates a missing license and user display name', () => {
    const json = {
      results: [hit('Kia Ceed', { license: null, user: { displayName: null, username: 'bob', profileUrl: 'u' } })]
    }
    expect(parseSearch(json, 'kia', 'Ceed')[0]).toMatchObject({ authorName: 'bob', license: null })
  })
})
