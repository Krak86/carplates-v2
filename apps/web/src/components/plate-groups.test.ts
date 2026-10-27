import { describe, expect, it } from 'vitest'
import type { PlateCandidate } from '@carplates/shared'

import { groupCandidates, needsGrouping } from '@/components/plate-groups'

const candidate = (plate: string, score: number, box?: PlateCandidate['box']): PlateCandidate => ({
  plate,
  raw: plate,
  score,
  ...(box ? { box } : {})
})

const boxA = { x: 0.1, y: 0.2, w: 0.3, h: 0.1 }
const boxB = { x: 0.6, y: 0.5, w: 0.2, h: 0.08 }

describe('groupCandidates', () => {
  it('puts reads that share a box in one group, best first', () => {
    const groups = groupCandidates([
      candidate('BX5215BO', 0.9, boxA),
      candidate('AA1111AA', 0.8, boxB),
      candidate('BX5213BO', 0.7, boxA)
    ])
    expect(groups.map(g => g.candidates.map(c => c.plate))).toEqual([['BX5215BO', 'BX5213BO'], ['AA1111AA']])
    expect(groups.map(g => g.index)).toEqual([0, 1])
  })

  it('gives each box-less read its own group and each group its own color', () => {
    const groups = groupCandidates([candidate('AA1111AA', 0.9), candidate('BB2222BB', 0.8)])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.color).not.toBe(groups[1]?.color)
  })

  it('needs grouping for several plates or for one plate with alternatives, not for a lone read', () => {
    expect(needsGrouping(groupCandidates([candidate('AA1111AA', 0.9, boxA)]))).toBe(false)
    expect(needsGrouping(groupCandidates([candidate('AA1111AA', 0.9, boxA), candidate('AA1113AA', 0.6, boxA)]))).toBe(
      true
    )
    expect(needsGrouping(groupCandidates([candidate('AA1111AA', 0.9, boxA), candidate('BB2222BB', 0.8, boxB)]))).toBe(
      true
    )
  })
})
