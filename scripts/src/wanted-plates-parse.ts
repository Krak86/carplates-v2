import type { WantedPlateInsert } from '@carplates/db'
import { normalizePlate } from '@carplates/shared'
import { z } from 'zod'

import { feedDate, organUnitRegion } from './wanted-parse.js'

/** One record of the Garpun `LicplateWanted.json` feed. */
export const WantedPlateFeedRowSchema = z.object({
  id: z.coerce.string().nullish(),
  vehiclenumber: z.string().nullish(),
  illegalseizuredate: z.string().nullish(),
  insertdate: z.string().nullish(),
  organunit: z.string().nullish()
})
export type WantedPlateFeedRow = z.infer<typeof WantedPlateFeedRowSchema>

/** Earliest year of a plausible entry: the feed holds placeholder years (1530, 1950) next to real 1998+ ones. */
const MIN_YEAR = 1990

/** `feedDate` that also drops absurd years (before 1990 or later than today). */
export function plateDate(v: string | null | undefined, now = new Date()): string | null {
  const d = feedDate(v)
  if (!d) return null
  const year = Number(d.slice(0, 4))
  return year >= MIN_YEAR && d <= now.toISOString().slice(0, 10) ? d : null
}

const text = (v: string | null | undefined): string | null => {
  const t = v?.trim().replace(/\s+/g, ' ')
  return t ? t : null
}

/** Null for a record without an id or a plate (7 of ~20 000 have no plate). */
export function toWantedPlateInsert(
  row: WantedPlateFeedRow,
  now = new Date()
): Omit<WantedPlateInsert, 'lastSeenAt'> | null {
  const sourceId = text(row.id)
  const raw = text(row.vehiclenumber)
  const plate = raw ? normalizePlate(raw) : ''
  if (!sourceId || !plate) return null
  const organUnit = text(row.organunit)
  return {
    sourceId,
    plate,
    seizedAt: plateDate(row.illegalseizuredate, now),
    insertedAt: plateDate(row.insertdate, now),
    organUnit,
    region: organUnitRegion(organUnit)
  }
}
