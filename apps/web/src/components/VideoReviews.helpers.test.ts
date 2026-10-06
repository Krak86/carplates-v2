import { describe, it, expect } from 'vitest'

import { formatDuration, youtubeIdOf } from '@/components/VideoReviews.helpers'

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(63)).toBe('1:03')
    expect(formatDuration(3723)).toBe('1:02:03')
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
