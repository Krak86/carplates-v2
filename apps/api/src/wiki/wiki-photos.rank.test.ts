import { PAINT_HEX, labOf } from '@carplates/shared'
import type { VehicleColor } from '@carplates/shared'
import type { WikiCandidateInfo } from '@carplates/db'
import { describe, expect, it } from 'vitest'

import { rankWikiPhotos } from './wiki-photos.rank.js'

const photo = (title: string, bucket: VehicleColor, over: Partial<WikiCandidateInfo> = {}): WikiCandidateInfo => ({
  title,
  imageUrl: `https://upload.example/${title}.jpg`,
  imageWidth: 1280,
  imageHeight: 853,
  photoYear: null,
  attrAuthor: 'Jane',
  attrLicense: 'CC BY-SA 4.0',
  attrLicenseUrl: null,
  bucket,
  lab: [...labOf(PAINT_HEX[bucket])],
  quality: 10,
  ...over
})

const titles = (p: ReturnType<typeof rankWikiPhotos>): string[] => p.map(x => x.title)

describe('rankWikiPhotos', () => {
  it('puts a photo that already has the car colour first and flags it', () => {
    const out = rankWikiPhotos([photo('white', 'white', { quality: 15 }), photo('red', 'red')], {
      color: 'red',
      span: null
    })
    expect(titles(out)).toEqual(['red', 'white'])
    expect(out.map(p => p.colorMatch)).toEqual([true, false])
  })

  it('has no colour match without a colour, then ranks by quality', () => {
    const out = rankWikiPhotos([photo('low', 'red', { quality: 5 }), photo('high', 'white', { quality: 9 })], {
      color: null,
      span: null
    })
    expect(titles(out)).toEqual(['high', 'low'])
    expect(out.every(p => !p.colorMatch)).toBe(true)
  })

  it('drops photos dated outside the generation, keeps undated ones below the dated ones', () => {
    const rows = [
      photo('old', 'white', { photoYear: 2008, quality: 20 }),
      photo('undated', 'white', { quality: 12 }),
      photo('dated', 'white', { photoYear: 2019, quality: 8 })
    ]
    const out = rankWikiPhotos(rows, { color: null, span: { yearFrom: 2018, yearTo: 2024 } })
    expect(titles(out)).toEqual(['dated', 'undated'])
  })

  it('treats a generation with no end year as still produced and allows one year of slack', () => {
    const rows = [
      photo('a', 'gray', { photoYear: 2017 }),
      photo('b', 'gray', { photoYear: 2030 }),
      photo('c', 'gray', { photoYear: 2016 })
    ]
    expect(titles(rankWikiPhotos(rows, { color: null, span: { yearFrom: 2018, yearTo: null } })).sort()).toEqual([
      'a',
      'b'
    ])
  })

  it('drops the attribution when the row has neither author nor licence, and caps the list', () => {
    const [bare] = rankWikiPhotos([photo('x', 'gray', { attrAuthor: null, attrLicense: null })], {
      color: null,
      span: null
    })
    expect(bare!.attribution).toBeNull()
    const many = Array.from({ length: 30 }, (_, i) => photo(`p${i}`, 'gray'))
    expect(rankWikiPhotos(many, { color: null, span: null })).toHaveLength(12)
  })
})
