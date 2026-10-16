import { describe, expect, it } from 'vitest'

import { sizeModelsResponseSchema } from './sizeModels.js'

describe('sizeModelsResponseSchema', () => {
  it('accepts a model with and without catalogue figures', () => {
    const parsed = sizeModelsResponseSchema.parse({
      models: [
        { brand: 'SKODA', model: 'OCTAVIA', n: 259728, body: 'УНІВЕРСАЛ', rdwBody: 'stationwagen', lengthMm: 4670 },
        { brand: 'TOYOTA', model: 'CAMRY', n: 137770, body: null, rdwBody: null, lengthMm: null }
      ]
    })
    expect(parsed.models).toHaveLength(2)
  })

  it('stays valid when a newer API adds nothing and an older one omits optional fields', () => {
    expect(sizeModelsResponseSchema.safeParse({ models: [{ brand: 'KIA', model: 'RIO', n: 10 }] }).success).toBe(true)
  })

  it('rejects a negative count and non-integer sizes', () => {
    expect(sizeModelsResponseSchema.safeParse({ models: [{ brand: 'KIA', model: 'RIO', n: -1 }] }).success).toBe(false)
    expect(
      sizeModelsResponseSchema.safeParse({ models: [{ brand: 'KIA', model: 'RIO', n: 1, lengthMm: 4.5 }] }).success
    ).toBe(false)
  })
})
