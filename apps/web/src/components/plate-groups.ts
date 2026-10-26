import type { PlateCandidate } from '@carplates/shared'

import { labelColorVar } from '@/lib/favorite-labels'

/** The reads that belong to one plate in the photo: the best first, then its alternative readings. */
export type PlateGroup = {
  /** Order of the plate in the results, from 0; the label shown beside it in the photo. */
  index: number
  /** CSS color shared by the group's chips and its outline in the photo. */
  color: string
  candidates: PlateCandidate[]
}

// Label hues that stay apart from each other, so neighbouring plates in one photo are easy to tell.
const GROUP_LABELS = [7, 1, 4, 8, 0, 5, 9, 3] as const

const boxKey = (c: PlateCandidate): string | null => (c.box ? `${c.box.x}:${c.box.y}:${c.box.w}:${c.box.h}` : null)

/** Reads of one physical plate come back sharing one box, so equal boxes mean "same plate, other reading". */
export function groupCandidates(candidates: PlateCandidate[]): PlateGroup[] {
  const groups: PlateGroup[] = []
  const byBox = new Map<string, PlateGroup>()
  for (const c of candidates) {
    const key = boxKey(c)
    const existing = key ? byBox.get(key) : undefined
    if (existing) {
      existing.candidates.push(c)
      continue
    }
    const index = groups.length
    const group: PlateGroup = {
      index,
      color: labelColorVar(GROUP_LABELS[index % GROUP_LABELS.length] ?? 0),
      candidates: [c]
    }
    groups.push(group)
    if (key) byBox.set(key, group)
  }
  return groups
}

/** Whether the groups need numbering / chain styling to be told apart: several plates, or one with alternatives. */
export const needsGrouping = (groups: PlateGroup[]): boolean =>
  groups.length > 1 || groups.some(g => g.candidates.length > 1)
