import { regionName } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import {
  buildChain,
  buildLogoRounds,
  buildRegionRounds,
  isHigher,
  plateForRegion,
  ROUND_COUNT,
  shuffle
} from './helpers'

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('region rounds', () => {
  it('builds plates that the shared plate logic maps back to the asked region', () => {
    const rounds = buildRegionRounds(ROUND_COUNT, seeded(7))
    expect(rounds).toHaveLength(ROUND_COUNT)
    expect(new Set(rounds.map(r => r.region)).size).toBe(ROUND_COUNT)
    for (const { plate, region } of rounds) expect(regionName(plate)).toBe(region)
  })

  it('works for every region', () => {
    const rng = seeded(3)
    for (const { region } of buildRegionRounds(100, rng)) {
      expect(regionName(plateForRegion(region, rng))).toBe(region)
    }
  })
})

describe('logo rounds', () => {
  it('has the answer among four distinct options', () => {
    const brands = ['Toyota', 'Skoda', 'Audi', 'BMW', 'Ford', 'Opel']
    for (const round of buildLogoRounds(brands, 5, seeded(1))) {
      expect(round.options).toHaveLength(4)
      expect(new Set(round.options).size).toBe(4)
      expect(round.options).toContain(round.answer)
    }
  })

  it('shrinks the option list for a short brand list', () => {
    expect(buildLogoRounds(['Toyota', 'Audi'], 5, seeded(1))[0]?.options).toHaveLength(2)
  })
})

describe('higher or lower chain', () => {
  const item = (n: number) => ({ key: String(n), label: String(n), brand: null, n })

  it('never puts equal counts next to each other', () => {
    const chain = buildChain([1, 1, 2, 2, 3, 3, 4].map(item), seeded(5))
    for (let i = 1; i < chain.length; i++) expect(chain[i]?.n).not.toBe(chain[i - 1]?.n)
  })

  it('compares the next count with the current one', () => {
    expect(isHigher(item(1), item(2))).toBe(true)
    expect(isHigher(item(2), item(1))).toBe(false)
  })
})

describe('shuffle', () => {
  it('keeps every element and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5]
    expect([...shuffle(input, seeded(2))].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})
