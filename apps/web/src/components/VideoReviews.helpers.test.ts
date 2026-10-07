import { describe, it, expect } from 'vitest'

import { formatDuration, preferLanguage, youtubeIdOf } from '@/components/VideoReviews.helpers'

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(63)).toBe('1:03')
    expect(formatDuration(3723)).toBe('1:02:03')
  })
})

describe('preferLanguage', () => {
  it('puts the UI language first and keeps the API order within each group', () => {
    const videos = [
      { id: 'a', lang: 'ru' },
      { id: 'b', lang: 'ua' },
      { id: 'c', lang: null },
      { id: 'd', lang: 'ua' }
    ]
    expect(preferLanguage(videos, 'ua').map(v => v.id)).toEqual(['b', 'd', 'a', 'c'])
    expect(preferLanguage(videos, 'en').map(v => v.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('youtubeIdOf', () => {
  it('reads the v param of a watch link', () => {
    expect(youtubeIdOf('https://www.youtube.com/watch?v=8GElvLxSxfI')).toBe('8GElvLxSxfI')
  })

  it('is null for other links and garbage', () => {
    expect(youtubeIdOf('https://www.youtube.com/channel/UCx')).toBeNull()
    expect(youtubeIdOf('nope')).toBeNull()
  })
})
