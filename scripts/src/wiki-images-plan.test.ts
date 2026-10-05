import { describe, expect, it } from 'vitest'

import { planYears, resolveYearImage, titleYears } from './wiki-images-plan.js'

describe('titleYears', () => {
  it('finds standalone years and ignores date stamps and longer numbers', () => {
    expect(titleYears('File:2018 Kia Ceed (CD) 2021 photo (2019-05-04).jpg')).toEqual([2018, 2021])
    expect(titleYears('File:Kia Ceed 12018.jpg')).toEqual([])
  })
})

describe('planYears', () => {
  const titles = [
    'File:2018 Kia Ceed interior.jpg',
    'File:2018 Kia Ceed front.jpg',
    'File:2018 Kia Rio.jpg',
    'File:2012 Kia Ceed.jpg',
    'File:2021 Kia Ceed GT.jpg'
  ]

  it('shortlists the exact year, exterior shots first, and ignores other models', () => {
    const [plan] = planYears(titles, 'Ceed', [2018])
    expect(plan).toEqual({
      year: 2018,
      titles: ['File:2018 Kia Ceed front.jpg', 'File:2018 Kia Ceed interior.jpg'],
      nearest: false,
      fromYear: 2018
    })
  })

  it('borrows the nearest year within the gap, preferring the newer one on a tie', () => {
    const plans = planYears(titles, 'Ceed', [2019, 2014, 2015, 2000])
    expect(plans[0]).toMatchObject({ year: 2019, nearest: true, fromYear: 2018 })
    expect(plans[1]).toMatchObject({ year: 2014, nearest: true, fromYear: 2012 })
    expect(plans[2]).toMatchObject({ year: 2015, nearest: true, fromYear: 2018 }) // 3 years from both: newer wins
    expect(plans[3]).toMatchObject({ year: 2000, nearest: false, titles: [] })
  })
})

describe('resolveYearImage', () => {
  const info = (width: number, height: number) => ({
    thumburl: 'https://upload.wikimedia.org/t.jpg',
    thumbwidth: 1280,
    thumbheight: 853,
    width,
    height,
    mime: 'image/jpeg'
  })

  it('takes the first shortlisted file that passes the size rules', () => {
    const plan = {
      year: 2018,
      titles: ['File:2018 Kia Ceed A.jpg', 'File:2018 Kia Ceed B.jpg'],
      nearest: false,
      fromYear: 2018
    }
    const infoByTitle = new Map([
      ['File:2018 Kia Ceed A.jpg', info(2000, 3000)],
      ['File:2018 Kia Ceed B.jpg', info(3000, 2000)]
    ])
    expect(resolveYearImage(plan, 'Ceed', infoByTitle)?.title).toBe('File:2018 Kia Ceed B.jpg')
  })

  it('returns null when nothing is shortlisted or fetched', () => {
    expect(resolveYearImage({ year: 2000, titles: [], nearest: false, fromYear: 2000 }, 'Ceed', new Map())).toBeNull()
  })
})
