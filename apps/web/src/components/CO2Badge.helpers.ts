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

/** Where to read more, by region; `labelKey` is an i18n key under `co2.*`. Ukraine adopts the EU Euro standards. */
export const CO2_REFERENCE_LINKS = [
  { labelKey: 'co2.linkUa', href: 'https://en.wikipedia.org/wiki/European_emission_standards' },
  {
    labelKey: 'co2.linkEu',
    href: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b'
  },
  { labelKey: 'co2.linkUs', href: 'https://www.fueleconomy.gov/feg/label/learn-more-gasoline-label.shtml' },
  { labelKey: 'co2.linkGlobal', href: 'https://theicct.org/pv-fuel-economy/' }
] as const
