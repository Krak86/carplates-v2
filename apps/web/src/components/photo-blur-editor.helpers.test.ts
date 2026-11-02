import { SHARE_RETOUCH_MAX_STROKES } from '@carplates/shared'
import type { RetouchStroke } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { BRUSH_STEPS, canAddStroke, clamp01, extendStroke } from '@/components/photo-blur-editor.helpers'

const stroke = (points = 1): RetouchStroke => ({
  mode: 'add',
  radius: 0.05,
  points: Array.from({ length: points }, () => [0.5, 0.5] as [number, number])
})

describe('photo blur editor helpers', () => {
  it('keeps brush steps ascending', () => {
    expect([...BRUSH_STEPS]).toEqual([...BRUSH_STEPS].sort((a, b) => a - b))
  })

  it('clamps pointer positions to the photo', () => {
    expect([clamp01(-0.2), clamp01(0.4), clamp01(3)]).toEqual([0, 0.4, 1])
  })

  it('skips points that barely moved and caps a stroke', () => {
    const a = extendStroke([], 0.5, 0.5)
    expect(extendStroke(a, 0.5005, 0.5)).toBe(a)
    expect(extendStroke(a, 0.6, 0.5)).toHaveLength(2)
    const full = Array.from({ length: 2000 }, (_, i) => [i / 2000, 0] as [number, number])
    expect(extendStroke(full, 0.9999, 0.9)).toBe(full)
  })

  it('stops accepting strokes at the server caps', () => {
    expect(canAddStroke([stroke()])).toBe(true)
    expect(canAddStroke(Array.from({ length: SHARE_RETOUCH_MAX_STROKES }, () => stroke()))).toBe(false)
    expect(canAddStroke(Array.from({ length: 10 }, () => stroke(1900)))).toBe(false)
  })
})
