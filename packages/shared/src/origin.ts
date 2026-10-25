import { z } from 'zod'

/** Former states with their own name and flag. Never shown as the modern successor (ORIGIN_PLAN.md). */
export const LEGACY_COUNTRIES = ['SU', 'CSHH', 'DD', 'YU', 'CSXX', 'DE-FRG'] as const
export type LegacyCountry = (typeof LEGACY_COUNTRIES)[number]

export function isLegacyCountry(code: string): code is LegacyCountry {
  return (LEGACY_COUNTRIES as readonly string[]).includes(code)
}

const SOVIET = ['UA', 'RU', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'TM', 'TJ', 'KG', 'MD', 'LT', 'LV', 'EE']
const SOVIET_LAST_YEAR = 1991
/** SI, HR, MK, BA left in 1991-92; RS/ME stayed in Yugoslavia until 2002 (handled separately). */
const YUGOSLAV_BREAKAWAY = ['SI', 'HR', 'MK', 'BA']
const YUGOSLAV_LAST_YEAR = 1991
const CZECHOSLOVAK_LAST_YEAR = 1992
/** Reunified 3 Oct 1990, so 1990 is already DE. */
const GERMAN_LAST_YEAR = 1989
const SERBIA_MONTENEGRO = ['RS', 'ME']

type CountryAtYearOptions = {
  /** For DE before reunification: the plant or brand sat in the GDR, not the FRG. */
  east?: boolean
}

/**
 * The country in force in `year` for a modern ISO code: Skoda 1985 -> `CSHH`, 1995 -> `CZ`; VW 1985 -> `DE-FRG`.
 * An unknown year or an already-legacy code is returned unchanged.
 */
export function countryAtYear(code: string, year: number | null | undefined, opts: CountryAtYearOptions = {}): string {
  if (year == null || isLegacyCountry(code)) return code
  if (SOVIET.includes(code) && year <= SOVIET_LAST_YEAR) return 'SU'
  if (code === 'DE' && year <= GERMAN_LAST_YEAR) return opts.east ? 'DD' : 'DE-FRG'
  if ((code === 'CZ' || code === 'SK') && year <= CZECHOSLOVAK_LAST_YEAR) return 'CSHH'
  if (YUGOSLAV_BREAKAWAY.includes(code) && year <= YUGOSLAV_LAST_YEAR) return 'YU'
  if (SERBIA_MONTENEGRO.includes(code)) {
    if (year <= 2002) return 'YU'
    if (year <= 2005) return 'CSXX'
  }
  return code
}

const yearSchema = z.number().int().min(0).max(2100)
const countrySchema = z.string().min(2).max(6)

export const brandOriginPeriodSchema = z.object({
  countryCode: countrySchema,
  fromYear: yearSchema,
  toYear: yearSchema.nullable().optional(),
  foundedYear: yearSchema.nullable().optional(),
  hqCity: z.string().nullable().optional(),
  source: z.string()
})
export type BrandOriginPeriod = z.infer<typeof brandOriginPeriodSchema>

export const brandOwnershipSchema = z.object({
  ownerName: z.string(),
  ownerCountry: countrySchema.nullable().optional(),
  fromYear: yearSchema,
  toYear: yearSchema.nullable().optional(),
  source: z.string()
})
export type BrandOwnership = z.infer<typeof brandOwnershipSchema>

export const modelPlantSchema = z.object({
  countryCode: countrySchema,
  city: z.string().nullable().optional(),
  fromYear: yearSchema,
  toYear: yearSchema.nullable().optional(),
  sourceUrl: z.string()
})
export type ModelPlant = z.infer<typeof modelPlantSchema>
