import { describe, expect, it } from 'vitest'

import { ELECTRIC_PATH, FUEL_PATH, SAFETY_PATH } from '@/routes/read/links'

import { guidesByGroup } from './guides'

describe('guidesByGroup', () => {
  it('lists an article once and skips groups that are not shown', () => {
    const result = guidesByGroup(['economy', 'safety', 'economy'], false)
    expect(result.economy).toEqual([FUEL_PATH])
    expect(result.safety).toEqual([SAFETY_PATH])
    expect(result.price).toBeUndefined()
  })

  it('links the EV article only for an electric car', () => {
    expect(guidesByGroup(['economy'], true).economy).toContain(ELECTRIC_PATH)
    expect(guidesByGroup(['economy'], false).economy).not.toContain(ELECTRIC_PATH)
  })
})
