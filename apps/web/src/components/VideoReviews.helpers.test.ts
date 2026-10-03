import { describe, expect, it } from 'vitest'

import { formatDuration } from '@/components/VideoReviews.helpers'

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(63)).toBe('1:03')
    expect(formatDuration(9)).toBe('0:09')
    expect(formatDuration(3723)).toBe('1:02:03')
  })
})
