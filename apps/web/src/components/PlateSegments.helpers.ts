import { normalizePlate, plateSeries } from '@carplates/shared'

export type PlateSegmentId = 'region' | 'service' | 'series' | 'number'

export type PlateSegment = { id: PlateSegmentId; text: string; positions: string }

// After normalizePlate every letter is a non-digit, so the two 8-char shapes are told apart by where the digits sit.
const CURRENT_RE = /^\D{2}\d{4}\D{2}$/
const LEGACY_RE = /^\d{2}\D{2}\d{4}$/

/**
 * A plate split into its meaningful parts, or `null` for any other shape (diplomatic, stacked, …).
 * Current `AA1234BB`: region letters · number · series letters (`DІ`/`ЕD` lead with a service series instead of a region).
 * Legacy `11AA1234`: region digits · series letters · number.
 */
export function splitPlate(input: string): PlateSegment[] | null {
  const plate = normalizePlate(input)
  if (CURRENT_RE.test(plate)) {
    return [
      { id: plateSeries(plate) ? 'service' : 'region', text: plate.slice(0, 2), positions: '1–2' },
      { id: 'number', text: plate.slice(2, 6), positions: '3–6' },
      { id: 'series', text: plate.slice(6, 8), positions: '7–8' }
    ]
  }
  if (LEGACY_RE.test(plate)) {
    return [
      { id: 'region', text: plate.slice(0, 2), positions: '1–2' },
      { id: 'series', text: plate.slice(2, 4), positions: '3–4' },
      { id: 'number', text: plate.slice(4, 8), positions: '5–8' }
    ]
  }
  return null
}
