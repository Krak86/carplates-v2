import { describe, expect, it } from 'vitest'
import { REGIONS } from '@carplates/shared'

import { REGION_NAME_BY_SHAPE_ISO } from './region-geography'

describe('REGION_NAME_BY_SHAPE_ISO', () => {
  it('covers exactly the 27 distinct region names REGIONS produces', () => {
    const fromRegions = new Set(Object.values(REGIONS))
    const fromGeography = new Set(Object.values(REGION_NAME_BY_SHAPE_ISO))
    expect(fromGeography).toEqual(fromRegions)
    expect(fromGeography.size).toBe(27)
  })

  it('has no duplicate region name across shapeISO keys', () => {
    const values = Object.values(REGION_NAME_BY_SHAPE_ISO)
    expect(new Set(values).size).toBe(values.length)
  })
})
