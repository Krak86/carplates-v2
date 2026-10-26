/** Pure helpers of `ingest:wmi`: NHTSA vPIC manufacturer / WMI rows into `registry.wmi_prefix` rows. */
import { z } from 'zod'

export const manufacturersPageSchema = z.object({
  Results: z.array(
    z.object({
      Country: z.string().nullable().optional(),
      Mfr_CommonName: z.string().nullable().optional(),
      Mfr_ID: z.number(),
      Mfr_Name: z.string().nullable().optional(),
      VehicleTypes: z
        .array(z.object({ IsPrimary: z.boolean(), Name: z.string() }))
        .nullable()
        .optional()
    })
  )
})
export type NhtsaManufacturer = z.infer<typeof manufacturersPageSchema>['Results'][number]

export const wmiListSchema = z.object({
  Results: z.array(z.object({ WMI: z.string().nullable().optional() }))
})

/** Primary vehicle types worth a lookup: what can appear on a Ukrainian-registered road vehicle (trailers, LSVs, off-road skipped). */
const WANTED_TYPES = /^(Passenger Car|Multipurpose Passenger Vehicle|Truck|Bus|Motorcycle|Incomplete Vehicle)/

export const isWantedManufacturer = (m: NhtsaManufacturer): boolean =>
  (m.VehicleTypes ?? []).some(t => t.IsPrimary && WANTED_TYPES.test(t.Name))

/** NHTSA spellings that `Intl.DisplayNames` names differently. */
const COUNTRY_ALIASES: Readonly<Record<string, string>> = {
  ENGLAND: 'GB',
  'UNITED KINGDOM (UK)': 'GB',
  'UNITED STATES (USA)': 'US',
  RUSSIA: 'RU',
  'SOUTH KOREA': 'KR',
  'MYANMAR (BURMA)': 'MM',
  'CZECH REPUBLIC': 'CZ',
  'HONG KONG': 'HK',
  'FEDERATED STATES OF MICRONESIA': 'FM',
  VIETNAM: 'VN',
  LAOS: 'LA',
  TURKEY: 'TR',
  'NORTH MACEDONIA': 'MK'
}

let reverse: Map<string, string> | undefined
function reverseCountryNames(): Map<string, string> {
  if (reverse) return reverse
  const names = new Intl.DisplayNames(['en'], { type: 'region' })
  reverse = new Map()
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b)
      const name = names.of(code)
      if (name && name !== code) reverse.set(name.toUpperCase(), code)
    }
  }
  return reverse
}

/** "GERMANY" -> "DE", "UNITED KINGDOM (UK)" -> "GB"; null when the name is not recognised. */
export function countryNameToCode(name: string | null | undefined): string | null {
  const key = (name ?? '').trim().toUpperCase()
  if (!key) return null
  return COUNTRY_ALIASES[key] ?? reverseCountryNames().get(key) ?? null
}

export type VinRegion = 'africa' | 'asia' | 'europe' | 'north-america' | 'oceania' | 'south-america'

/** First VIN character -> world region (ISO 3779). */
export function vinRegion(wmi: string): VinRegion | null {
  const c = wmi[0]
  if (!c) return null
  if (c >= 'A' && c <= 'H') return 'africa'
  if (c >= 'J' && c <= 'R') return 'asia'
  if (c >= 'S' && c <= 'Z') return 'europe'
  if (c >= '1' && c <= '5') return 'north-america'
  if (c === '6' || c === '7') return 'oceania'
  if (c === '8' || c === '9') return 'south-america'
  return null
}

export type WmiRow = {
  wmi: string
  fromYear: number
  toYear: number | null
  maker: string
  countryCode: string | null
  region: VinRegion | null
}

const titleCase = (s: string): string =>
  s === s.toUpperCase() && /[A-Z]{4,}/.test(s)
    ? s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase())
    : s

/** One row per 3-character WMI; when several manufacturers share it, the one with a common name (the brand) wins. */
export function buildWmiRows(
  entries: readonly { manufacturer: NhtsaManufacturer; wmis: readonly string[] }[]
): WmiRow[] {
  const byWmi = new Map<string, WmiRow & { common: boolean }>()
  for (const { manufacturer: m, wmis } of entries) {
    const maker = (m.Mfr_CommonName?.trim() || m.Mfr_Name?.trim()) ?? ''
    if (!maker) continue
    for (const raw of wmis) {
      const wmi = raw.trim().toUpperCase()
      if (!/^[A-Z0-9]{3}$/.test(wmi)) continue
      const common = !!m.Mfr_CommonName?.trim()
      const prev = byWmi.get(wmi)
      if (prev && (prev.common || !common)) continue
      byWmi.set(wmi, {
        wmi,
        fromYear: 0,
        toYear: null,
        maker: titleCase(maker),
        countryCode: countryNameToCode(m.Country),
        region: vinRegion(wmi),
        common
      })
    }
  }
  return [...byWmi.values()].map(({ common: _common, ...row }) => row).sort((a, b) => a.wmi.localeCompare(b.wmi))
}
