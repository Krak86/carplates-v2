import { isUaPlate, normalizePlate, repairOcrPlate } from '@carplates/shared'
import type { PlateCandidate } from '@carplates/shared'

import type { PlateReaderResult } from './recognize.types.js'

const MAX_CANDIDATES = 5

/** Normalizes, drops anything that is not a complete UA plate (signs, foreign or partial reads), dedupes (keeping the higher score) and sorts raw ALPR results, best first. */
export function mapPlateReaderResults(results: PlateReaderResult[]): PlateCandidate[] {
  const byPlate = new Map<string, PlateCandidate>()
  for (const r of results) {
    const raw = (r.plate ?? '').trim().toUpperCase()
    if (!raw) continue
    const plate = normalizePlate(repairOcrPlate(raw))
    if (!isUaPlate(plate)) continue
    const score = r.score ?? 0
    const seen = byPlate.get(plate)
    if (!seen || score > seen.score) byPlate.set(plate, { plate, raw, score, ...(r.box && { box: r.box }) })
  }
  return [...byPlate.values()].sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES)
}
