import { normalizePlate, repairOcrPlate } from '@carplates/shared'
import type { PlateCandidate } from '@carplates/shared'

import type { PlateReaderResult } from './recognize.types.js'

const MAX_CANDIDATES = 5

/** Normalizes, dedupes (keeping the higher score) and sorts raw ALPR results, best first. */
export function mapPlateReaderResults(results: PlateReaderResult[]): PlateCandidate[] {
  const byPlate = new Map<string, PlateCandidate>()
  for (const r of results) {
    const raw = (r.plate ?? '').trim().toUpperCase()
    if (!raw) continue
    const plate = normalizePlate(repairOcrPlate(raw))
    const score = r.score ?? 0
    const seen = byPlate.get(plate)
    if (!seen || score > seen.score) byPlate.set(plate, { plate, raw, score })
  }
  return [...byPlate.values()].sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES)
}
