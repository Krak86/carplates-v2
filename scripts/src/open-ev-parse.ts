import { makeKey, modelKey } from '@carplates/shared'
import type { OpenEvInsert } from '@carplates/db'
import { z } from 'zod'

const num = z.number().finite()

/** The parts of an `ev-data.json` entry we keep; everything else (charging curves, power per charging point …) is ignored. */
const entrySchema = z.object({
  id: z.string().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  type: z.enum(['bev', 'phev']),
  variant: z.string().trim().nullish(),
  release_year: num.nullish(),
  usable_battery_size: num.nullish(),
  ac_charger: z
    .object({ usable_phases: num.nullish(), ports: z.array(z.string()).nullish(), max_power: num.nullish() })
    .nullish(),
  dc_charger: z.object({ ports: z.array(z.string()).nullish(), max_power: num.nullish() }).nullish(),
  energy_consumption: z.object({ average_consumption: num.nullish() }).nullish()
})

export const evFileSchema = z.object({ data: z.array(z.unknown()) })

/** Positive figure or null: the file uses 0 / missing for "not recorded". */
const positive = (v: number | null | undefined): number | null => (v != null && v > 0 ? v : null)

/** One `ev-data.json` entry → a table row; null for an entry that is malformed or whose make / model has no usable key. */
export function parseEvEntry(raw: unknown): OpenEvInsert | null {
  const parsed = entrySchema.safeParse(raw)
  if (!parsed.success) return null
  const e = parsed.data
  const mk = makeKey(e.brand)
  const mdk = modelKey(e.model)
  if (!mk || !mdk) return null
  const year = e.release_year != null && e.release_year >= 2000 && e.release_year <= 2100 ? e.release_year : null
  return {
    id: e.id,
    make: e.brand,
    model: e.model,
    variant: e.variant ?? '',
    makeKey: mk,
    modelKey: mdk,
    powertrain: e.type,
    releaseYear: year,
    batteryKwh: positive(e.usable_battery_size),
    consumptionKwh100: positive(e.energy_consumption?.average_consumption),
    acMaxKw: positive(e.ac_charger?.max_power),
    acPhases: positive(e.ac_charger?.usable_phases),
    acPorts: e.ac_charger?.ports ?? [],
    dcMaxKw: positive(e.dc_charger?.max_power),
    dcPorts: e.dc_charger?.ports ?? []
  }
}
