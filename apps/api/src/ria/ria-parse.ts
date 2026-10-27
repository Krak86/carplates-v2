import { RIA_CHECK_URL } from '@carplates/shared'
import type { RiaCheckResponse } from '@carplates/shared'
import { z } from 'zod'

/** The slice of AUTO.RIA's `vin-verifyings` answer we read; every field optional since the shape is not ours. */
export const upstreamRiaSchema = z.object({
  auto: z.object({ year: z.number().nullish(), vin: z.string().nullish() }).nullish(),
  verifyings: z
    .object({
      infotech: z
        .object({
          title: z.string().nullish(),
          vin: z.string().nullish(),
          engine: z.string().nullish(),
          lastOperation: z.string().nullish(),
          color: z.string().nullish(),
          ownersCount: z.string().nullish()
        })
        .nullish()
    })
    .nullish()
})

const LAST_OPERATION = /(\d{2})\.(\d{2})\.(\d{4})\s*[•·]?\s*(.*)$/s

/** "Остання операція 21.04.2012 • Реєстрація ТЗ …" -> ISO date + operation name. */
function parseLastOperation(text: string | null | undefined): { date: string | null; name: string | null } {
  const match = text ? LAST_OPERATION.exec(text) : null
  if (!match) return { date: null, name: null }
  const [, dd, mm, yyyy, name] = match
  return { date: `${yyyy}-${mm}-${dd}`, name: name?.trim() || null }
}

/** RIA words these as "VIN-код XTA…" and "2 власники". */
const cleanVin = (text: string | null | undefined): string | null =>
  text
    ?.replace(/^VIN-код\s*/i, '')
    .trim()
    .toUpperCase() || null
const parseOwners = (text: string | null | undefined): number | null => {
  const n = Number.parseInt(text ?? '', 10)
  return Number.isFinite(n) ? n : null
}

/** Null when RIA has no registry record for the plate (no `infotech` block). */
export function mapRiaCheck(plate: string, payload: z.infer<typeof upstreamRiaSchema>): RiaCheckResponse | null {
  const info = payload.verifyings?.infotech
  if (!info) return null
  const operation = parseLastOperation(info.lastOperation)
  return {
    plate,
    vin: cleanVin(info.vin) ?? cleanVin(payload.auto?.vin),
    title: info.title?.trim() || null,
    year: payload.auto?.year ?? null,
    engine: info.engine?.trim() || null,
    color: info.color?.trim() || null,
    ownersCount: parseOwners(info.ownersCount),
    lastOperationDate: operation.date,
    lastOperationName: operation.name,
    sourceUrl: RIA_CHECK_URL
  }
}
