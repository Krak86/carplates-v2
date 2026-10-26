import type { PlateCandidate } from '@carplates/shared'

const boxKey = (c: PlateCandidate): string | null => (c.box ? `${c.box.x}:${c.box.y}:${c.box.w}:${c.box.h}` : null)

/**
 * Candidates sharing one box are alternative readings of one plate (see `components/plate-groups.ts`). OCR cannot
 * settle an ambiguous glyph (3 vs 5), the registry can: when a plate's best read is not registered but another
 * reading is, the registered one takes the best read's place by swapping scores within the group (the web opens the
 * top candidate). Otherwise (both or neither registered) the OCR order stays.
 */
export function promoteRegistered(candidates: PlateCandidate[], registered: ReadonlySet<string>): PlateCandidate[] {
  const groups = new Map<string, PlateCandidate[]>()
  for (const c of candidates) {
    const key = boxKey(c)
    if (key) groups.set(key, [...(groups.get(key) ?? []), c])
  }

  const rescored = new Map<string, number>()
  for (const group of groups.values()) {
    const [primary] = group
    if (!primary || registered.has(primary.plate)) continue
    const promoted = group.find(c => registered.has(c.plate))
    if (!promoted) continue
    rescored.set(promoted.plate, primary.score)
    rescored.set(primary.plate, promoted.score)
  }
  if (rescored.size === 0) return candidates

  return candidates.map(c => ({ ...c, score: rescored.get(c.plate) ?? c.score })).sort((a, b) => b.score - a.score)
}

/** The candidates in a group of alternatives: only those are worth a registry lookup. */
export function plateGroupsWithAlternatives(candidates: PlateCandidate[]): string[] {
  const counts = new Map<string, number>()
  for (const c of candidates) {
    const key = boxKey(c)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return candidates.filter(c => (counts.get(boxKey(c) ?? '') ?? 0) > 1).map(c => c.plate)
}
