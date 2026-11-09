import { describe, expect, it } from 'vitest'

import {
  candidatePhotoYear,
  candidateQuality,
  candidateTitleScore,
  qualifyingCandidates,
  type CandidateHit
} from './wiki-candidates-core.js'

const hit = (title: string, over: Partial<CandidateHit['info']> = {}): CandidateHit => ({
  title,
  info: { thumburl: `https://upload.example/${title}`, mime: 'image/jpeg', width: 3000, height: 2000, ...over }
})

describe('candidatePhotoYear', () => {
  it('reads the model year, not a photo date or a place', () => {
    expect(candidatePhotoYear('File:2019 Kia Ceed front.jpg')).toBe(2019)
    expect(candidatePhotoYear('File:Kia Ceed (CD7, 2021) front.jpg')).toBe(2021)
    expect(candidatePhotoYear('File:Kia Ceed 2019-05-12.jpg')).toBeNull()
    expect(candidatePhotoYear('File:Kia Ceed Autoschau 2019.jpg')).toBeNull()
  })
})

describe('candidateTitleScore', () => {
  it('rejects detail shots, other models and non-road cars', () => {
    expect(candidateTitleScore('File:Kia Ceed interior.jpg', 'Ceed')).toBeNull()
    expect(candidateTitleScore('File:Kia Rio front.jpg', 'Ceed')).toBeNull()
    expect(candidateTitleScore('File:Kia Ceed rally car.jpg', 'Ceed')).toBeNull()
    expect(candidateTitleScore('File:Kia Ceed concept.jpg', 'Ceed')).toBeNull()
  })

  it('ranks front views above rear ones', () => {
    const front = candidateTitleScore('File:Kia Ceed front.jpg', 'Ceed')!
    const rear = candidateTitleScore('File:Kia Ceed rear.jpg', 'Ceed')!
    expect(front).toBeGreaterThan(rear)
  })
})

describe('qualifyingCandidates', () => {
  it('keeps wide landscape jpegs of the model, drops small, portrait, non-jpeg and duplicate hits', () => {
    const hits = [
      hit('File:Kia Ceed rear.jpg'),
      hit('File:Kia Ceed front.jpg'),
      hit('File:Kia Ceed small.jpg', { width: 800, height: 500 }),
      hit('File:Kia Ceed portrait.jpg', { width: 1200, height: 1800 }),
      hit('File:Kia Ceed scan.png', { mime: 'image/png' }),
      hit('File:Kia Ceed front.jpg'),
      hit('File:Kia Ceed nothumb.jpg', { thumburl: undefined })
    ]
    expect(qualifyingCandidates(hits, 'Ceed').map(c => c.title)).toEqual([
      'File:Kia Ceed front.jpg',
      'File:Kia Ceed rear.jpg'
    ])
  })

  it('carries the licence from the Commons metadata', () => {
    const [c] = qualifyingCandidates(
      [
        hit('File:Kia Ceed front.jpg', {
          extmetadata: {
            Artist: { value: '<a href="x">Jane</a>' },
            LicenseShortName: { value: 'CC BY-SA 4.0' },
            LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' }
          }
        })
      ],
      'Ceed'
    )
    expect(c).toMatchObject({ author: 'Jane', license: 'CC BY-SA 4.0' })
  })
})

describe('candidateQuality', () => {
  it('prefers a car that fills about half the frame', () => {
    expect(candidateQuality(8, 0.45)).toBeGreaterThan(candidateQuality(8, 0.1))
    expect(candidateQuality(8, null)).toBe(8)
  })
})
