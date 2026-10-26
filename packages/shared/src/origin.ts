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

export const VIN_REGIONS = ['africa', 'asia', 'europe', 'north-america', 'oceania', 'south-america'] as const
export type VinRegion = (typeof VIN_REGIONS)[number]

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

export const ORIGIN_PLANT_SOURCES = ['nhtsa', 'wmi'] as const

/** GET /api/origin. Every part is optional: a missing one means unknown, never "none". New fields stay nullable().optional(). */
export const originResponseSchema = z.object({
  brand: z
    .object({
      slug: z.string(),
      periods: z.array(brandOriginPeriodSchema),
      ownership: z.array(brandOwnershipSchema)
    })
    .nullable()
    .optional(),
  /** Where this exact VIN was built: NHTSA plant fields when the caller passed them, else the VIN prefix (country only). */
  plant: z
    .object({
      countryCode: countrySchema,
      city: z.string().nullable().optional(),
      source: z.enum(ORIGIN_PLANT_SOURCES)
    })
    .nullable()
    .optional(),
  /** The VIN prefix (WMI) record. maker is null when only the country block is known. */
  wmi: z
    .object({
      wmi: z.string(),
      maker: z.string().nullable().optional(),
      countryCode: countrySchema.nullable().optional(),
      region: z.enum(VIN_REGIONS).nullable().optional()
    })
    .nullable()
    .optional(),
  /** Filled by the hand-curated model plants (release 2); empty until then. */
  modelPlants: z.array(modelPlantSchema).optional(),
  hints: z
    .object({
      /** VIN built for North America (first character 1-5): the car may be US/Canada-spec. A hint, not a fact. */
      northAmericaVin: z.boolean(),
      /** The VIN prefix names a different maker than the registry brand. */
      makerMismatch: z.object({ wmiMaker: z.string() }).nullable().optional(),
      /** Brand home country (as of the year) differs from the plant country. Neutral: plenty of brands build abroad. */
      assemblyDiffers: z.object({ brandCountry: countrySchema, plantCountry: countrySchema }).nullable().optional()
    })
    .optional()
})
export type OriginResponse = z.infer<typeof originResponseSchema>
