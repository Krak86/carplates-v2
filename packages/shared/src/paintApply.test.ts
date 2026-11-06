import { describe, expect, it } from 'vitest'

import { SHADE_SCALE, applyPaint, paintTargetLinear, paintTone } from './paintApply.js'

describe('paintApply', () => {
  it('a target is the same by name and by its hex', () => {
    expect(paintTargetLinear('#2e7d32')).toEqual(paintTargetLinear('green'))
  })

  it('shade 1 gives the target tone, darker shade is darker, highlights go to white', () => {
    const red = paintTargetLinear('red')
    const mid = paintTone(SHADE_SCALE, red, 0)
    expect(paintTone(SHADE_SCALE * 0.4, red, 0)).toBeLessThan(mid)
    expect(paintTone(SHADE_SCALE * 3, red, 2)).toBeGreaterThan(200)
  })

  it('applyPaint equals compositing paintTone over the photo with the mask alpha, and skips transparent pixels', () => {
    const rgb = Uint8Array.from([10, 20, 30, 200, 100, 50])
    const mask = Uint8Array.from([SHADE_SCALE, SHADE_SCALE, SHADE_SCALE, 128, 0, 0, 0, 0])
    const out = applyPaint(rgb, mask, 'blue')
    const t = paintTargetLinear('blue')
    const a = 128 / 255
    expect(out[0]).toBe(Math.round(10 * (1 - a) + paintTone(SHADE_SCALE, t, 0) * a))
    expect([...out.slice(3)]).toEqual([200, 100, 50])
  })
})
