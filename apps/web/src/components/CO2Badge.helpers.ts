import type { Co2Band } from '@carplates/shared'

/** Mid-tone fills that read on both the light and dark themes. */
export const CO2_BAND_COLOR: Readonly<Record<Co2Band, string>> = {
  green: 'hsl(142 62% 40%)',
  yellow: 'hsl(45 93% 47%)',
  orange: 'hsl(26 90% 50%)',
  red: 'hsl(0 78% 52%)'
}

/** "164" for a single value, "164–175" for a range; null when there's no value at all. */
export function formatRange(min: number | null, max: number | null, digits = 0): string | null {
  if (min == null || max == null) return null
  const a = min.toFixed(digits)
  const b = max.toFixed(digits)
  return a === b ? a : `${a}–${b}`
}

/** Wikipedia article per UI language; a language with no article falls back to English. */
const EURO_STANDARDS_EN = 'https://en.wikipedia.org/wiki/European_emission_standards'
const EURO_STANDARDS_WIKI: Readonly<Record<string, string>> = {
  ua: 'https://uk.wikipedia.org/wiki/Європейські_стандарти_викиду_вихлопних_газів',
  ru: 'https://ru.wikipedia.org/wiki/Европейские_нормы_выбросов'
}
// ru.wikipedia has no WLTP article.
const WLTP_EN = 'https://en.wikipedia.org/wiki/Worldwide_Harmonised_Light_Vehicles_Test_Procedure'
const WLTP_WIKI: Readonly<Record<string, string>> = {
  ua: 'https://uk.wikipedia.org/wiki/WLTP'
}

/** Where to read more; `labelKey` is an i18n key under `co2.*`. Ukraine adopts the EU Euro standards. */
export function co2ReferenceLinks(lang: string): { labelKey: string; href: string }[] {
  return [
    { labelKey: 'co2.linkUa', href: EURO_STANDARDS_WIKI[lang] ?? EURO_STANDARDS_EN },
    { labelKey: 'co2.linkWltp', href: WLTP_WIKI[lang] ?? WLTP_EN },
    {
      labelKey: 'co2.linkEu',
      href: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b'
    },
    { labelKey: 'co2.linkUs', href: 'https://www.fueleconomy.gov/feg/label/learn-more-gasoline-label.shtml' },
    { labelKey: 'co2.linkGlobal', href: 'https://theicct.org/pv-fuel-economy/' }
  ]
}

/** Advanced-search link for "similar vehicles": same make and model, within the estimate's year window. */
export function similarVehiclesHref(brand: string, model: string, year: number, yearGap: number): string {
  const params = new URLSearchParams({
    brand,
    model,
    yearFrom: String(year - yearGap),
    yearTo: String(year + yearGap)
  })
  return `/advanced-search?${params}`
}

/** Fewer matched reference entries than this is a "small sample": shown, but flagged as a rough guide. */
export const EMISSIONS_SMALL_SAMPLE = 5

export const isSmallEmissionsSample = (matches: number): boolean => matches < EMISSIONS_SMALL_SAMPLE
