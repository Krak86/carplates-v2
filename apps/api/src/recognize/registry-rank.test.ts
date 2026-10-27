import type { PlateCandidate } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { plateGroupsWithAlternatives, promoteRegistered } from './registry-rank.js'

const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.1 }
const other = { x: 0.6, y: 0.2, w: 0.3, h: 0.1 }
const read = (plate: string, score: number, b = box): PlateCandidate => ({ plate, raw: plate, score, box: b })

describe('promoteRegistered', () => {
  it('puts the registered alternative in place of an unregistered best read', () => {
    const out = promoteRegistered([read('ВХ5215ВО', 0.9), read('ВХ5213ВО', 0.85)], new Set(['ВХ5213ВО']))
    expect(out.map(c => [c.plate, c.score])).toEqual([
      ['ВХ5213ВО', 0.9],
      ['ВХ5215ВО', 0.85]
    ])
  })

  it('keeps the OCR order when the best read is registered, or when none is', () => {
    const reads = [read('ВХ5215ВО', 0.9), read('ВХ5213ВО', 0.85)]
    expect(promoteRegistered(reads, new Set(['ВХ5215ВО', 'ВХ5213ВО']))).toBe(reads)
    expect(promoteRegistered(reads, new Set())).toBe(reads)
  })

  it('only swaps within one plate and leaves other plates alone', () => {
    const out = promoteRegistered(
      [read('ВХ5215ВО', 0.95), read('ВС3064ХС', 0.9, other), read('ВХ5213ВО', 0.85)],
      new Set(['ВХ5213ВО'])
    )
    expect(out.map(c => c.plate)).toEqual(['ВХ5213ВО', 'ВС3064ХС', 'ВХ5215ВО'])
  })

  it('ignores box-less reads', () => {
    const reads = [
      { plate: 'ВХ5215ВО', raw: 'x', score: 0.9 },
      { plate: 'ВХ5213ВО', raw: 'y', score: 0.8 }
    ]
    expect(promoteRegistered(reads, new Set(['ВХ5213ВО']))).toBe(reads)
  })
})

describe('plateGroupsWithAlternatives', () => {
  it('lists only reads that share a box with another read', () => {
    expect(
      plateGroupsWithAlternatives([read('ВХ5215ВО', 0.9), read('ВС3064ХС', 0.9, other), read('ВХ5213ВО', 0.8)])
    ).toEqual(['ВХ5215ВО', 'ВХ5213ВО'])
  })
})
