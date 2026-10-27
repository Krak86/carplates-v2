import { brandSlug, countryAtYear, pickByYear } from '@carplates/shared'
import type { BrandOriginPeriod, OriginResponse } from '@carplates/shared'

export { pickByYear }

type Hints = NonNullable<OriginResponse['hints']>

/** Brands that legitimately share a VIN maker (rebadges), so a prefix naming the sibling is not a mismatch. */
const RELATED_SLUGS: readonly (readonly string[])[] = [
  ['chevrolet', 'daewoo', 'ravon'],
  ['opel', 'vauxhall'],
  ['ssangyong', 'kg-mobility']
]

/** Slug of the maker a WMI names ("Volkswagen (Brazil)", "Hyundai Motor Company"), or null when it cannot be told. */
function makerSlug(maker: string): string | null {
  const clean = maker
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return brandSlug(clean) ?? brandSlug(clean.split(' ')[0])
}

/**
 * True only when the WMI maker resolves to a known brand that differs from the registry brand and is neither a
 * rebadge sibling nor one of the brand's owners. An unrecognised maker string never warns (no guessing).
 */
export function isMakerMismatch(
  slug: string,
  wmiMaker: string | null | undefined,
  ownerNames: readonly string[]
): boolean {
  if (!wmiMaker) return false
  const maker = makerSlug(wmiMaker)
  if (!maker || maker === slug) return false
  if (RELATED_SLUGS.some(group => group.includes(slug) && group.includes(maker))) return false
  return !ownerNames.some(owner => makerSlug(owner) === maker)
}

type HintInput = {
  brandSlug: string | null
  year: number | null | undefined
  period: Pick<BrandOriginPeriod, 'countryCode'> | null
  ownerNames: readonly string[]
  wmiMaker: string | null | undefined
  wmiRegion: string | null | undefined
  plantCountry: string | null | undefined
}

export function buildHints(input: HintInput): Hints {
  const brandCountry = input.period ? countryAtYear(input.period.countryCode, input.year) : null
  const plantCountry = input.plantCountry ? countryAtYear(input.plantCountry, input.year) : null

  return {
    northAmericaVin: input.wmiRegion === 'north-america',
    makerMismatch:
      input.brandSlug && input.wmiMaker && isMakerMismatch(input.brandSlug, input.wmiMaker, input.ownerNames)
        ? { wmiMaker: input.wmiMaker }
        : null,
    assemblyDiffers:
      brandCountry && plantCountry && brandCountry !== plantCountry ? { brandCountry, plantCountry } : null
  }
}
