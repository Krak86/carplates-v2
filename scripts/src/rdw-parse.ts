import { makeKey, modelKey, type VdbVehicleClass } from '@carplates/shared'
import type { RdwSpecsInsert } from '@carplates/db'

/** RDW `voertuigsoort` → the vehicle class the matcher speaks (vans are "Bedrijfsauto", like the registry's trucks). */
export const KIND_BY_VOERTUIGSOORT: Readonly<Record<string, VdbVehicleClass>> = {
  Personenauto: 'car',
  Bedrijfsauto: 'truck',
  Motorfiets: 'motorcycle',
  Bus: 'bus'
}

export const FUEL_DATASET = '8ys7-d773'

export const soqlString = (v: string): string => `'${v.replaceAll("'", "''")}'`

/** Electric cars report power in a separate column; everything else in `nettomaximumvermogen` (a text column). */
const POWER_KW =
  "case(@f.brandstof_omschrijving='Elektriciteit', @f.netto_max_vermogen_elektrisch, true, @f.nettomaximumvermogen::number)"
/** WLTP where the vehicle has it (plug-in hybrids: the weighted figure), else the older NEDC figure (a text column). */
const CO2_G_KM =
  'case(@f.emissie_co2_gecombineerd_wltp IS NOT NULL, @f.emissie_co2_gecombineerd_wltp, ' +
  '@f.emis_co2_gewogen_gecombineerd_wltp IS NOT NULL, @f.emis_co2_gewogen_gecombineerd_wltp, ' +
  'true, @f.co2_uitstoot_gecombineerd::number)'

/** Plausibility window per measure — a typo in one RDW row (1 cc, 0 kg) must not become a group's min or max. */
const bounded = (expr: string, lo: number, hi: number): string => `case(${expr} >= ${lo} AND ${expr} <= ${hi}, ${expr})`
const range = (name: string, expr: string, lo: number, hi: number): string =>
  ['min', 'median', 'max'].map(fn => `${fn}(${bounded(expr, lo, hi)}) as ${name}_${fn}`).join(', ')

const VOERTUIGSOORT_LIST = Object.keys(KIND_BY_VOERTUIGSOORT).map(soqlString).join(',')

/** Dates before the motor car are data-entry noise. */
export const MIN_YEAR = 1950

/** The make list: every make with at least `minVehicles` vehicles of the kinds we aggregate, largest first. */
export const makesQuery = (minVehicles: number): string =>
  `SELECT merk, count(*) as n WHERE voertuigsoort IN (${VOERTUIGSOORT_LIST}) GROUP BY merk ` +
  `HAVING count(*) >= ${minVehicles} ORDER BY n DESC LIMIT 100000`

/**
 * One make (optionally one first-registration year) grouped by kind/model/year, joined server-side to the fuel and
 * emissions dataset on kenteken — only its first fuel row (`brandstof_volgnummer = 1`), so a hybrid is one vehicle.
 * LEFT join: vehicles with no fuel row still count towards displacement and mass.
 */
export function specsQuery(make: string, year?: number): string {
  const yearFilter = year ? ` AND date_extract_y(datum_eerste_toelating_dt) = ${year}` : ''
  return (
    `SELECT voertuigsoort, handelsbenaming, date_extract_y(datum_eerste_toelating_dt) as y, count(*) as n, ` +
    `${range('kw', POWER_KW, 1, 1500)}, ${range('cc', 'cilinderinhoud', 49, 16000)}, ` +
    `${range('kg', 'massa_ledig_voertuig', 50, 60000)}, ${range('co2', CO2_G_KM, 1, 800)} ` +
    `LEFT OUTER JOIN (SELECT * FROM @${FUEL_DATASET} WHERE brandstof_volgnummer='1') AS f ON kenteken = @f.kenteken ` +
    `WHERE merk=${soqlString(make)} AND voertuigsoort IN (${VOERTUIGSOORT_LIST})${yearFilter} ` +
    `GROUP BY voertuigsoort, handelsbenaming, y LIMIT 100000`
  )
}

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** SODA row (all values strings, missing = absent) → an insert row, or null when it can't be keyed or is noise. */
export function parseSpecsRecord(
  make: string,
  rec: Record<string, unknown>,
  minN: number,
  maxYear: number
): RdwSpecsInsert | null {
  const kind = KIND_BY_VOERTUIGSOORT[String(rec.voertuigsoort)]
  const model = typeof rec.handelsbenaming === 'string' ? rec.handelsbenaming.trim() : ''
  const year = num(rec.y)
  const n = num(rec.n)
  const mk = makeKey(make)
  const mdk = modelKey(model)
  if (!kind || !mk || !mdk || year == null || n == null) return null
  if (year < MIN_YEAR || year > maxYear || n < minN) return null
  return {
    kind,
    make,
    model,
    makeKey: mk,
    modelKey: mdk,
    modelYear: year,
    n,
    powerKwMin: num(rec.kw_min),
    powerKwMedian: num(rec.kw_median),
    powerKwMax: num(rec.kw_max),
    displacementCcMin: num(rec.cc_min),
    displacementCcMedian: num(rec.cc_median),
    displacementCcMax: num(rec.cc_max),
    massKgMin: num(rec.kg_min),
    massKgMedian: num(rec.kg_median),
    massKgMax: num(rec.kg_max),
    co2GKmMin: num(rec.co2_min),
    co2GKmMedian: num(rec.co2_median),
    co2GKmMax: num(rec.co2_max)
  }
}

/**
 * RDW spells a model several ways that collapse to one key ("GOLF" / "Golf" / "GOL-F"), and two makes can share a key
 * (brand slug aliases). Medians can't be merged, so the group with the most vehicles wins the primary-key slot.
 */
export function dedupeByKey(rows: readonly RdwSpecsInsert[]): RdwSpecsInsert[] {
  const byKey = new Map<string, RdwSpecsInsert>()
  for (const r of rows) {
    const key = `${r.kind}|${r.makeKey}|${r.modelKey}|${r.modelYear}`
    const cur = byKey.get(key)
    if (!cur || r.n > cur.n) byKey.set(key, r)
  }
  return [...byKey.values()]
}
