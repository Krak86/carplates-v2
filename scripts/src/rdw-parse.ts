import { makeKey, modelKey, type VdbVehicleClass } from '@carplates/shared'
import type { RdwSpecsInsert, RdwTally } from '@carplates/db'

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

/** WLTP where the vehicle has it (plug-in hybrids: the weighted figure), else the older NEDC figure (a text column). */
const CONSUMPTION_L100 =
  'case(@f.brandstof_verbruik_gecombineerd_wltp IS NOT NULL, @f.brandstof_verbruik_gecombineerd_wltp, ' +
  '@f.brandstof_verbruik_gewogen_gecombineerd_wltp IS NOT NULL, @f.brandstof_verbruik_gewogen_gecombineerd_wltp, ' +
  'true, @f.brandstofverbruik_gecombineerd::number)'
/** Wh/km → kWh/100 km (÷10). The WLTP figure where there is one, else the older all-electric one. */
const EV_KWH100 =
  '(case(@f.elektrisch_verbruik_enkel_elektrisch_wltp IS NOT NULL, @f.elektrisch_verbruik_enkel_elektrisch_wltp, ' +
  'true, @f.elektriciteitsverbruik_volledig_elektrisch) / 10)'
const EV_RANGE_KM =
  'case(@f.actie_radius_enkel_elektrisch_wltp IS NOT NULL, @f.actie_radius_enkel_elektrisch_wltp, true, @f.actieradius)'
/** Dutch list price (incl. 21 % VAT and BPM) → ex-tax. No BPM on record = exempt (EVs) or unrecorded; either way not subtracted. */
const PRICE_EX_TAX = '(case(bruto_bpm IS NOT NULL, catalogusprijs / 1.21 - bruto_bpm, true, catalogusprijs / 1.21))'

/** Plausibility window per measure — a typo in one RDW row (1 cc, 0 kg) must not become a group's min or max. */
const bounded = (expr: string, lo: number, hi: number): string => `case(${expr} >= ${lo} AND ${expr} <= ${hi}, ${expr})`
const range = (name: string, expr: string, lo: number, hi: number): string =>
  ['min', 'median', 'max'].map(fn => `${fn}(${bounded(expr, lo, hi)}) as ${name}_${fn}`).join(', ')

/** Count of the vehicles that have the (plausible) value — for the measures RDW fills for only a third of the cars. */
const filled = (name: string, expr: string, lo: number, hi: number): string =>
  `count(${bounded(expr, lo, hi)}) as ${name}_n`

/** Categorical measures: the values worth a conditional count each (the long tail stays uncounted). */
export const COLOURS = [
  'GRIJS',
  'ZWART',
  'WIT',
  'BLAUW',
  'ROOD',
  'GROEN',
  'BRUIN',
  'GEEL',
  'ORANJE',
  'BEIGE',
  'PAARS'
] as const
export const BODY_TYPES = [
  'stationwagen',
  'hatchback',
  'MPV',
  'sedan',
  'cabriolet',
  'coupe',
  'kampeerwagen',
  'terreinvoertuig',
  'pick-up truck',
  'gesloten opbouw',
  'bus'
] as const
export const ENERGY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

const NOT_HYBRID = '@f.klasse_hybride_elektrisch_voertuig IS NULL'
/** Fuel mix classes: a hybrid is its own class whatever its fuel (RDW lists a full hybrid's electricity first). */
export const FUEL_CLASSES = {
  petrol: `@f.brandstof_omschrijving='Benzine' AND ${NOT_HYBRID}`,
  diesel: `@f.brandstof_omschrijving='Diesel' AND ${NOT_HYBRID}`,
  ev: `@f.brandstof_omschrijving='Elektriciteit' AND ${NOT_HYBRID}`,
  hev: "@f.klasse_hybride_elektrisch_voertuig='NOVC-HEV'",
  phev: "@f.klasse_hybride_elektrisch_voertuig='OVC-HEV'",
  gas: `@f.brandstof_omschrijving IN ('LPG','CNG','LNG') AND ${NOT_HYBRID}`
} as const

/** One conditional count per listed value (aliased `<prefix>_<i>`) — SoQL can't group a category into columns. */
const tallyCounts = (prefix: string, column: string, values: readonly string[]): string =>
  values.map((v, i) => `count(case(${column}=${soqlString(v)}, 1)) as ${prefix}_${i}`).join(', ')

/**
 * The one fuel row per vehicle that is joined: the first, except a hybrid whose first row is electricity — its engine
 * data sits on the second row. (Bi-fuel hybrids can match twice; 14 of 788,000 Toyotas, which is noise.)
 */
const FUEL_ROW =
  "(brandstof_volgnummer='1' AND NOT (brandstof_omschrijving='Elektriciteit' AND klasse_hybride_elektrisch_voertuig IS NOT NULL)) " +
  "OR (brandstof_volgnummer='2' AND klasse_hybride_elektrisch_voertuig IS NOT NULL AND brandstof_omschrijving!='Elektriciteit')"

const VOERTUIGSOORT_LIST = Object.keys(KIND_BY_VOERTUIGSOORT).map(soqlString).join(',')

/** Dates before the motor car are data-entry noise. */
export const MIN_YEAR = 1950

/** The make list: every make with at least `minVehicles` vehicles of the kinds we aggregate, largest first. */
export const makesQuery = (minVehicles: number): string =>
  `SELECT merk, count(*) as n WHERE voertuigsoort IN (${VOERTUIGSOORT_LIST}) GROUP BY merk ` +
  `HAVING count(*) >= ${minVehicles} ORDER BY n DESC LIMIT 100000`

/**
 * One make (optionally one first-registration year) grouped by kind/model/year, joined server-side to the fuel and
 * emissions dataset on kenteken — one fuel row per vehicle (see `FUEL_ROW`), so a hybrid is one vehicle.
 * LEFT join: vehicles with no fuel row still count towards displacement and mass.
 */
export function specsQuery(make: string, year?: number): string {
  const yearFilter = year ? ` AND date_extract_y(datum_eerste_toelating_dt) = ${year}` : ''
  return (
    `SELECT voertuigsoort, handelsbenaming, date_extract_y(datum_eerste_toelating_dt) as y, count(*) as n, ` +
    `${range('kw', POWER_KW, 1, 1500)}, ${range('cc', 'cilinderinhoud', 49, 16000)}, ` +
    `${range('kg', 'massa_ledig_voertuig', 50, 60000)}, ${range('co2', CO2_G_KM, 1, 800)}, ` +
    // Stage C2 — same dataset, no join. Dimensions are centimetres. Lengths/speed are partial (30-40 % of cars), so
    // they carry a count of the vehicles that have them; min/median/max skip NULLs.
    `${range('gross', 'toegestane_maximum_massa_voertuig', 100, 60000)}, ${range('wb', 'wielbasis', 100, 1000)}, ` +
    `${range('seats', 'aantal_zitplaatsen', 1, 120)}, ${range('doors', 'aantal_deuren', 1, 6)}, ` +
    `${range('tb', 'maximum_trekken_massa_geremd', 1, 60000)}, ${range('tu', 'maximum_massa_trekken_ongeremd', 1, 5000)}, ` +
    `${range('len', 'lengte', 100, 2500)}, ${filled('len', 'lengte', 100, 2500)}, ` +
    `${range('wid', 'breedte', 40, 300)}, ${filled('wid', 'breedte', 40, 300)}, ` +
    `${range('hgt', 'hoogte_voertuig', 50, 450)}, ${filled('hgt', 'hoogte_voertuig', 50, 450)}, ` +
    `${range('spd', 'maximale_constructiesnelheid', 20, 400)}, ${filled('spd', 'maximale_constructiesnelheid', 20, 400)}, ` +
    // Stage C3 — list price (EUR, incl. VAT and BPM), body, colour, cylinders, kerb mass, label and the open-recall flag
    // come from the main dataset; consumption, EV figures, noise and the fuel mix from the joined fuel row.
    `${range('price', 'catalogusprijs', 1000, 2000000)}, ${filled('price', 'catalogusprijs', 1000, 2000000)}, ` +
    `${range('pxt', PRICE_EX_TAX, 500, 2000000)}, ${range('bpm', 'bruto_bpm', 1, 200000)}, ${filled('bpm', 'bruto_bpm', 1, 200000)}, ` +
    `${range('kerb', 'massa_rijklaar', 50, 60000)}, ${range('cyl', 'aantal_cilinders', 1, 16)}, ${filled('cyl', 'aantal_cilinders', 1, 16)}, ` +
    `${range('cons', CONSUMPTION_L100, 1, 40)}, ${filled('cons', CONSUMPTION_L100, 1, 40)}, ` +
    `${range('evk', EV_KWH100, 5, 60)}, ${filled('evk', EV_KWH100, 5, 60)}, ` +
    `${range('evr', EV_RANGE_KM, 20, 1500)}, ${filled('evr', EV_RANGE_KM, 20, 1500)}, ` +
    `${range('db', '@f.geluidsniveau_rijdend::number', 40, 120)}, ${filled('db', '@f.geluidsniveau_rijdend::number', 40, 120)}, ` +
    `${tallyCounts('col', 'eerste_kleur', COLOURS)}, count(case(eerste_kleur != 'Niet geregistreerd', 1)) as col_n, ` +
    `${tallyCounts('body', 'inrichting', BODY_TYPES)}, count(case(inrichting != 'Niet geregistreerd', 1)) as body_n, ` +
    `${tallyCounts('lbl', 'zuinigheidsclassificatie', ENERGY_LABELS)}, count(zuinigheidsclassificatie) as lbl_n, ` +
    `${Object.entries(FUEL_CLASSES)
      .map(([k, cond]) => `count(case(${cond}, 1)) as fuel_${k}`)
      .join(', ')}, count(@f.brandstof_omschrijving) as fuel_n, ` +
    "count(case(openstaande_terugroepactie_indicator='Ja', 1)) as rc_open, " +
    "count(case(openstaande_terugroepactie_indicator IN ('Ja','Nee'), 1)) as rc_n " +
    `LEFT OUTER JOIN (SELECT * FROM @${FUEL_DATASET} WHERE ${FUEL_ROW}) AS f ON kenteken = @f.kenteken ` +
    `WHERE merk=${soqlString(make)} AND voertuigsoort IN (${VOERTUIGSOORT_LIST})${yearFilter} ` +
    `GROUP BY voertuigsoort, handelsbenaming, y LIMIT 100000`
  )
}

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Top-`limit` values of a conditional-count tally as [value, count] pairs, largest first; null when none counted. */
export function parseTally(
  rec: Record<string, unknown>,
  prefix: string,
  keys: readonly string[],
  limit = keys.length
): RdwTally | null {
  const pairs = keys
    .map((k, i): [string, number] => [k, num(rec[`${prefix}_${i}`]) ?? 0])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
  return pairs.length > 0 ? pairs : null
}

/** The fuel mix is keyed by class name (`fuel_<class>`) rather than by index. */
function parseFuelMix(rec: Record<string, unknown>): RdwTally | null {
  const pairs = Object.keys(FUEL_CLASSES)
    .map((k): [string, number] => [k, num(rec[`fuel_${k}`]) ?? 0])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
  return pairs.length > 0 ? pairs : null
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
    co2GKmMax: num(rec.co2_max),
    grossMassKgMin: num(rec.gross_min),
    grossMassKgMedian: num(rec.gross_median),
    grossMassKgMax: num(rec.gross_max),
    wheelbaseCmMin: num(rec.wb_min),
    wheelbaseCmMedian: num(rec.wb_median),
    wheelbaseCmMax: num(rec.wb_max),
    seatsMin: num(rec.seats_min),
    seatsMedian: num(rec.seats_median),
    seatsMax: num(rec.seats_max),
    doorsMin: num(rec.doors_min),
    doorsMedian: num(rec.doors_median),
    doorsMax: num(rec.doors_max),
    towBrakedKgMin: num(rec.tb_min),
    towBrakedKgMedian: num(rec.tb_median),
    towBrakedKgMax: num(rec.tb_max),
    towUnbrakedKgMin: num(rec.tu_min),
    towUnbrakedKgMedian: num(rec.tu_median),
    towUnbrakedKgMax: num(rec.tu_max),
    lengthCmMin: num(rec.len_min),
    lengthCmMedian: num(rec.len_median),
    lengthCmMax: num(rec.len_max),
    lengthCmN: num(rec.len_n),
    widthCmMin: num(rec.wid_min),
    widthCmMedian: num(rec.wid_median),
    widthCmMax: num(rec.wid_max),
    widthCmN: num(rec.wid_n),
    heightCmMin: num(rec.hgt_min),
    heightCmMedian: num(rec.hgt_median),
    heightCmMax: num(rec.hgt_max),
    heightCmN: num(rec.hgt_n),
    topSpeedKmhMin: num(rec.spd_min),
    topSpeedKmhMedian: num(rec.spd_median),
    topSpeedKmhMax: num(rec.spd_max),
    topSpeedKmhN: num(rec.spd_n),
    priceEurMin: num(rec.price_min),
    priceEurMedian: num(rec.price_median),
    priceEurMax: num(rec.price_max),
    priceEurN: num(rec.price_n),
    priceExTaxEurMin: num(rec.pxt_min),
    priceExTaxEurMedian: num(rec.pxt_median),
    priceExTaxEurMax: num(rec.pxt_max),
    bpmEurMin: num(rec.bpm_min),
    bpmEurMedian: num(rec.bpm_median),
    bpmEurMax: num(rec.bpm_max),
    bpmEurN: num(rec.bpm_n),
    kerbMassKgMin: num(rec.kerb_min),
    kerbMassKgMedian: num(rec.kerb_median),
    kerbMassKgMax: num(rec.kerb_max),
    cylindersMin: num(rec.cyl_min),
    cylindersMedian: num(rec.cyl_median),
    cylindersMax: num(rec.cyl_max),
    cylindersN: num(rec.cyl_n),
    consumptionL100Min: num(rec.cons_min),
    consumptionL100Median: num(rec.cons_median),
    consumptionL100Max: num(rec.cons_max),
    consumptionL100N: num(rec.cons_n),
    evKwh100Min: num(rec.evk_min),
    evKwh100Median: num(rec.evk_median),
    evKwh100Max: num(rec.evk_max),
    evKwh100N: num(rec.evk_n),
    evRangeKmMin: num(rec.evr_min),
    evRangeKmMedian: num(rec.evr_median),
    evRangeKmMax: num(rec.evr_max),
    evRangeKmN: num(rec.evr_n),
    noiseDbMin: num(rec.db_min),
    noiseDbMedian: num(rec.db_median),
    noiseDbMax: num(rec.db_max),
    noiseDbN: num(rec.db_n),
    fuelMix: parseFuelMix(rec),
    fuelMixN: num(rec.fuel_n),
    colours: parseTally(rec, 'col', COLOURS, 3),
    coloursN: num(rec.col_n),
    bodyTypes: parseTally(rec, 'body', BODY_TYPES, 3),
    bodyTypesN: num(rec.body_n),
    energyLabels: parseTally(rec, 'lbl', ENERGY_LABELS, 3),
    energyLabelsN: num(rec.lbl_n),
    recallOpenN: num(rec.rc_open),
    recallN: num(rec.rc_n)
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
