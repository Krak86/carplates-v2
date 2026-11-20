import { describe, expect, it } from 'vitest'

import { commonsThumbUrl } from '@/lib/commons-thumb'

describe('commonsThumbUrl', () => {
  it('swaps the width of a Commons thumbnail', () => {
    expect(
      commonsThumbUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/2019_Kia_Ceed.jpg/1280px-2019_Kia_Ceed.jpg'
      )
    ).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/2019_Kia_Ceed.jpg/250px-2019_Kia_Ceed.jpg')
  })

  it('takes an explicit width', () => {
    expect(commonsThumbUrl('https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Car.png/960px-Car.png', 120)).toBe(
      'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Car.png/120px-Car.png'
    )
  })

  it('handles the thumb.wikimedia.org host and a trailing query string', () => {
    expect(
      commonsThumbUrl(
        'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Kia_Front.jpg/1280px-Kia_Front.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo'
      )
    ).toBe(
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Kia_Front.jpg/250px-Kia_Front.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo'
    )
  })

  it('leaves other URLs untouched', () => {
    const own = 'https://carsua.app/photos/abc.avif'
    expect(commonsThumbUrl(own)).toBe(own)
    const original = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Car.jpg'
    expect(commonsThumbUrl(original)).toBe(original)
  })
})
