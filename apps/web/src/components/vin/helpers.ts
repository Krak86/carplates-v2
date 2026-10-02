import type { VinDecodeResponse } from '@carplates/shared'

import { VIN_GROUPS } from '@/components/vin/types'
import type {
  AirbagCoverage,
  DriveType,
  EngineLayout,
  FieldRow,
  GroupedFields,
  SchematicModel,
  VinGroup,
  VinSegment,
  VinSegmentId
} from '@/components/vin/types'

type Results = VinDecodeResponse['results']
export type FieldMap = ReadonlyMap<string, string>

export function toFieldMap(results: Results): FieldMap {
  return new Map(results.map(r => [r.variable, r.value]))
}

/** NHTSA fills non-applicable fields with this placeholder — a row with nothing to say. */
export function isNoiseValue(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === 'not applicable' || v === 'n/a'
}

// Decoder bookkeeping, shown as a banner (or not at all) rather than as spec rows.
const META_VARIABLES: ReadonlySet<string> = new Set([
  'Error Code',
  'Error Text',
  'Additional Error Text',
  'Suggested VIN',
  'Possible Values'
])

const IDENTITY = new Set([
  'Make',
  'Manufacturer Name',
  'Model',
  'Model Year',
  'Trim',
  'Trim2',
  'Series',
  'Series2',
  'Vehicle Type',
  'Body Class',
  'Vehicle Descriptor',
  'Base Price ($)'
])
const MANUFACTURING = /^Plant /
const SAFETY =
  /air bag|seat belt|pretensioner|tpms|tire pressure|anti-lock|abs\b|stability|traction|collision|brake support|braking|cruise|lane |blind spot|camera|cross traffic|parking|crash|headlamp|daytime|keyless|event data|adaptive|pedestrian|rear visibility|semiautomatic|automatic emergency|active safety|forward/i
const ENGINE =
  /^(engine|displacement|fuel|valve|turbo|electrification|other engine|cooling|supercharger|battery|charger|ev )/i
const BODY =
  /^(doors|drive type|transmission|number of seat|number of wheels|steering|axles|wheel|gross|curb|bed|cab|windows|track|brake system|body)/i

export function groupOf(variable: string): VinGroup | 'meta' {
  if (META_VARIABLES.has(variable)) return 'meta'
  if (IDENTITY.has(variable)) return 'identity'
  if (MANUFACTURING.test(variable)) return 'manufacturing'
  if (SAFETY.test(variable)) return 'safety'
  if (ENGINE.test(variable)) return 'engine'
  if (BODY.test(variable)) return 'body'
  return 'other'
}

/** Buckets decode rows into sections (in VIN_GROUPS order), dropping "Not Applicable" noise and decoder bookkeeping. */
export function groupFields(results: Results): GroupedFields[] {
  const buckets = new Map<VinGroup, FieldRow[]>(VIN_GROUPS.map(g => [g, []]))
  for (const r of results) {
    const group = groupOf(r.variable)
    if (group === 'meta' || isNoiseValue(r.value)) continue
    buckets.get(group)?.push({ variable: r.variable, value: r.value })
  }
  return VIN_GROUPS.flatMap(group => {
    const rows = buckets.get(group) ?? []
    return rows.length > 0 ? [{ group, rows }] : []
  })
}

/** Tidies numeric values NHTSA returns with float noise or without units. */
export function formatFieldValue(variable: string, value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  switch (variable) {
    case 'Displacement (CC)':
      return `${Math.round(n)} cc`
    case 'Displacement (CI)':
      return `${n.toFixed(1)} cu in`
    case 'Displacement (L)':
      return `${n.toFixed(1)} L`
    case 'Engine Brake (hp) From':
    case 'Engine Brake (hp) To':
      return `${Math.round(n)} hp`
    case 'Engine Power (kW)':
      return `${Math.round(n)} kW`
    default:
      return value
  }
}

// ---- VIN anatomy --------------------------------------------------------------------------------

export const VIN_SEGMENT_POSITIONS: Readonly<Record<VinSegmentId, string>> = {
  wmi: '1–3',
  vds: '4–8',
  check: '9',
  year: '10',
  plant: '11',
  serial: '12–17'
}

export function splitVin(vin: string): VinSegment[] | null {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return null
  const v = vin.toUpperCase()
  return [
    { id: 'wmi', start: 0, text: v.slice(0, 3) },
    { id: 'vds', start: 3, text: v.slice(3, 8) },
    { id: 'check', start: 8, text: v.slice(8, 9) },
    { id: 'year', start: 9, text: v.slice(9, 10) },
    { id: 'plant', start: 10, text: v.slice(10, 11) },
    { id: 'serial', start: 11, text: v.slice(11, 17) }
  ]
}

// 30-year cycle: A=2010 … Y=2030, then 1=2031 … 9=2039. I, O, Q, U, Z, 0 are never used.
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789'

/** Both model years a position-10 character can mean (the VIN doesn't say which 30-year cycle). */
export function decodeYearChar(char: string): number[] {
  const i = YEAR_CODES.indexOf(char.toUpperCase())
  return i < 0 ? [] : [1980 + i, 2010 + i]
}

/** The cycle year NHTSA agrees with, else the latest plausible one (not beyond next year). */
export function resolveYear(
  char: string,
  nhtsaYear: string | undefined,
  now = new Date().getFullYear()
): number | null {
  const candidates = decodeYearChar(char)
  const match = candidates.find(y => String(y) === nhtsaYear)
  if (match) return match
  return [...candidates].reverse().find(y => y <= now + 1) ?? null
}

// ---- Country flag -------------------------------------------------------------------------------

const COUNTRY_CODES: Readonly<Record<string, string>> = {
  'SOUTH KOREA': 'KR',
  JAPAN: 'JP',
  GERMANY: 'DE',
  'UNITED STATES (USA)': 'US',
  'UNITED STATES': 'US',
  CHINA: 'CN',
  MEXICO: 'MX',
  CANADA: 'CA',
  'UNITED KINGDOM (UK)': 'GB',
  'UNITED KINGDOM': 'GB',
  FRANCE: 'FR',
  ITALY: 'IT',
  SPAIN: 'ES',
  'CZECH REPUBLIC (CZECHIA)': 'CZ',
  CZECHIA: 'CZ',
  SLOVAKIA: 'SK',
  POLAND: 'PL',
  TURKEY: 'TR',
  HUNGARY: 'HU',
  ROMANIA: 'RO',
  SWEDEN: 'SE',
  BELGIUM: 'BE',
  INDIA: 'IN',
  THAILAND: 'TH',
  BRAZIL: 'BR',
  RUSSIA: 'RU',
  UKRAINE: 'UA',
  PORTUGAL: 'PT',
  AUSTRIA: 'AT',
  NETHERLANDS: 'NL',
  SLOVENIA: 'SI',
  SERBIA: 'RS',
  INDONESIA: 'ID',
  MALAYSIA: 'MY',
  TAIWAN: 'TW',
  'SOUTH AFRICA': 'ZA',
  ARGENTINA: 'AR',
  FINLAND: 'FI',
  KAZAKHSTAN: 'KZ'
}

/** Regional-indicator flag emoji for an NHTSA "Plant Country" name, or null when unmapped. */
export function countryFlag(country: string | undefined): string | null {
  const code = country ? COUNTRY_CODES[country.trim().toUpperCase()] : undefined
  if (!code) return null
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
}

// ---- Equipment parsing --------------------------------------------------------------------------

/** "1st and 2nd Rows", "1st Row (Driver and Passenger)", "All Rows", … → rows + which sides. */
export function parseAirbagLocations(value: string | undefined): AirbagCoverage | null {
  if (!value || isNoiseValue(value)) return null
  const rows = new Set<number>()
  for (const m of value.matchAll(/(\d)(?:st|nd|rd|th)/gi)) rows.add(Number(m[1]))
  if (/all rows/i.test(value)) [1, 2, 3].forEach(r => rows.add(r))
  if (rows.size === 0 && !/driver|passenger/i.test(value)) return null
  const driver = /driver/i.test(value)
  const passenger = /passenger/i.test(value)
  const both = !driver && !passenger
  return { rows: [...rows].sort(), driver: driver || both, passenger: passenger || both }
}

export function parseDriveType(value: string | undefined): DriveType | null {
  if (!value) return null
  if (/4wd|awd|all-wheel|4-wheel|4x4/i.test(value)) return 'awd'
  if (/fwd|front-wheel/i.test(value)) return 'fwd'
  if (/rwd|rear-wheel/i.test(value)) return 'rwd'
  return null
}

export function parseTpms(value: string | undefined): 'direct' | 'indirect' | null {
  if (!value) return null
  if (/indirect/i.test(value)) return 'indirect'
  if (/direct/i.test(value)) return 'direct'
  return null
}

export function parseEngineLayout(value: string | undefined): EngineLayout | null {
  if (!value) return null
  if (/in-?line|straight/i.test(value)) return 'inline'
  if (/^v|v-shaped/i.test(value)) return 'v'
  if (/flat|boxer|opposed/i.test(value)) return 'flat'
  return 'other'
}

export function buildSchematicModel(fields: FieldMap): SchematicModel {
  const airbags = {
    front: parseAirbagLocations(fields.get('Front Air Bag Locations')),
    side: parseAirbagLocations(fields.get('Side Air Bag Locations')),
    curtain: parseAirbagLocations(fields.get('Curtain Air Bag Locations')),
    knee: parseAirbagLocations(fields.get('Knee Air Bag Locations'))
  }
  const declaredRows = Number(fields.get('Number of Seat Rows'))
  const airbagRows = Object.values(airbags).flatMap(a => a?.rows ?? [])
  const rows = declaredRows >= 1 ? declaredRows : Math.max(2, ...airbagRows)
  const doors = Number(fields.get('Doors'))
  return {
    doors: doors >= 1 ? doors : null,
    rows: Math.min(3, Math.max(1, Math.round(rows))),
    rowsInferred: !(declaredRows >= 1),
    drive: parseDriveType(fields.get('Drive Type')),
    tpms: parseTpms(fields.get('Tire Pressure Monitoring System (TPMS) Type')),
    airbags
  }
}

// ---- Engine / weight ----------------------------------------------------------------------------

export function displacementLiters(fields: FieldMap): number | null {
  const l = Number(fields.get('Displacement (L)'))
  if (l > 0) return l
  const cc = Number(fields.get('Displacement (CC)'))
  return cc > 0 ? cc / 1000 : null
}

const HP_PER_KW = 1.34102

/** Horsepower/kW from whichever of the two NHTSA reports (they often give only one). */
export function enginePower(fields: FieldMap): { hp: number | null; kw: number | null } {
  const hp = Number(fields.get('Engine Brake (hp) From'))
  const kw = Number(fields.get('Engine Power (kW)'))
  const hasHp = hp > 0
  const hasKw = kw > 0
  return {
    hp: hasHp ? Math.round(hp) : hasKw ? Math.round(kw * HP_PER_KW) : null,
    kw: hasKw ? Math.round(kw) : hasHp ? Math.round(hp / HP_PER_KW) : null
  }
}

/** US GVWR class 1-8 out of "Class 1C: 4,001 - 5,000 lb (1,814 - 2,268 kg)". */
export function gvwrClass(value: string | undefined): number | null {
  const m = value?.match(/class\s*(\d)/i)
  const n = m ? Number(m[1]) : NaN
  return n >= 1 && n <= 8 ? n : null
}

// ---- Safety assists -----------------------------------------------------------------------------

export const ASSISTS = [
  { key: 'abs', variable: 'Anti-lock Braking System (ABS)' },
  { key: 'esc', variable: 'Electronic Stability Control (ESC)' },
  { key: 'tc', variable: 'Traction Control' },
  { key: 'fcw', variable: 'Forward Collision Warning (FCW)' },
  { key: 'dbs', variable: 'Dynamic Brake Support (DBS)' },
  { key: 'aeb', variable: 'Pedestrian Automatic Emergency Braking (PAEB)' },
  { key: 'acc', variable: 'Adaptive Cruise Control (ACC)' },
  { key: 'ldw', variable: 'Lane Departure Warning (LDW)' },
  { key: 'lka', variable: 'Lane Keeping Assistance (LKA)' },
  { key: 'bsw', variable: 'Blind Spot Warning (BSW)' },
  { key: 'rcta', variable: 'Rear Cross Traffic Alert (RCTA)' },
  { key: 'camera', variable: 'Backup Camera' },
  { key: 'keyless', variable: 'Keyless Ignition' },
  { key: 'drl', variable: 'Daytime Running Light (DRL)' }
] as const

export type AssistKey = (typeof ASSISTS)[number]['key']
export type AssistLevel = 'standard' | 'optional'

/** "Standard"/"Yes" → standard, "Optional" → optional, anything else (absent, "No", N/A) → null. */
export function assistLevel(value: string | undefined): AssistLevel | null {
  if (!value) return null
  if (/^(standard|yes)/i.test(value)) return 'standard'
  if (/optional/i.test(value)) return 'optional'
  return null
}

export function hasAssists(fields: FieldMap): boolean {
  return ASSISTS.some(a => assistLevel(fields.get(a.variable)) !== null)
}

export type VehicleShape = 'car' | 'motorcycle'

/** Which schematic fits this vehicle: cars/trucks/MPVs get the car plan, bikes their own, everything else (bus, trailer…) none. */
export function vehicleShape(fields: FieldMap): VehicleShape | null {
  const type = fields.get('Vehicle Type') ?? ''
  const body = fields.get('Body Class') ?? ''
  if (/motorcycle|moped|scooter/i.test(type) || /^motorcycle/i.test(body)) return 'motorcycle'
  if (/passenger car|multipurpose|truck|incomplete/i.test(type)) return 'car'
  return type === '' && body !== '' && !/bus|trailer/i.test(body) ? 'car' : null
}

/** A car plan with nothing but guessed seats is just a decoration — only draw it when the decode told us something. */
export function hasCarSchematicData(model: SchematicModel): boolean {
  const { front, side, curtain, knee } = model.airbags
  return !!(
    model.drive ||
    model.tpms ||
    model.doors !== null ||
    front ||
    side ||
    curtain ||
    knee ||
    !model.rowsInferred
  )
}
