/** Aliases shown in the chip ("Also known as: Rabbit"); the popover lists them all. */
export const MAX_ALIASES = 3

/** Flags shown inline before collapsing the rest into "+N". */
export const MAX_FLAGS = 6

/** Decile 1 = most popular tenth of models; the label spans its percentile band ("top 10%", "top 10–20%"). */
export function decileBand(decile: number): string {
  return decile <= 1 ? '10' : `${(decile - 1) * 10}–${decile * 10}`
}

/** "Rare elsewhere" — ranked in the least popular third of the markets that list it. */
export const RARE_DECILE = 8

export function isRareElsewhere(decile: number | null, uaOnly: boolean): boolean {
  return !uaOnly && decile != null && decile >= RARE_DECILE
}

/** The 15 official registers VehiclesDB is built from (ISO 3166-1 alpha-2, lowercase). */
export const COVERED_MARKETS = [
  'ar',
  'ca',
  'de',
  'es',
  'fi',
  'gb',
  'ie',
  'lu',
  'my',
  'nl',
  'no',
  'nz',
  'th',
  'ua',
  'us'
] as const

/** "13%", but one decimal under 1% ("0.4%") so a small band is not shown as "0%"; "<0.1%" when tinier still. */
export function formatShare(n: number, of: number, locale: string): string {
  if (of <= 0 || n <= 0) return '0%'
  const share = (n / of) * 100
  const format = (value: number, digits: number): string =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)
  if (share < 0.1) return `<${format(0.1, 1)}%`
  return `${format(share, share < 1 ? 1 : 0)}%`
}
