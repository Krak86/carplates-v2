import { describe, expect, it } from 'vitest'

import { frontBodyPath, frontGlassPath, FRONT_PROFILES } from '@/components/size/SizeCarFront'
import { SIZE_SHAPES } from '@/components/size/VehicleSize.helpers'

describe('front profiles', () => {
  it('cover every shape; only the motorcycle has no front view', () => {
    expect(Object.keys(FRONT_PROFILES).sort()).toEqual([...SIZE_SHAPES].sort())
    expect(SIZE_SHAPES.filter(shape => FRONT_PROFILES[shape] == null)).toEqual(['moto'])
  })

  it('keep every fraction inside the unit box and in drawing order', () => {
    for (const p of Object.values(FRONT_PROFILES)) {
      if (!p) continue
      expect(p.roofW).toBeLessThan(p.baseW + 1e-9)
      expect(p.baseW).toBeLessThanOrEqual(1)
      expect(p.glassTop).toBeLessThan(p.belt)
      expect(p.belt).toBeLessThan(p.hood)
      expect(p.lamp[0]).toBeLessThan(p.lamp[1])
      expect(p.grille[1]).toBeLessThan(p.bumper)
      expect(p.bumper).toBeLessThan(1)
    }
  })

  it('build paths without NaN', () => {
    for (const p of Object.values(FRONT_PROFILES)) {
      if (!p) continue
      expect(frontBodyPath(p)).not.toContain('NaN')
      expect(frontGlassPath(p)).not.toContain('NaN')
    }
  })
})
