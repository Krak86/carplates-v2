import { MOT_GROUP_CODES, type MotGroupCode } from '@carplates/shared'

/** What the charts draw: tests that failed, tests that carried an advisory ("watch for"), or both. */
export const MOT_MODES = ['both', 'fail', 'watch'] as const
export type MotMode = (typeof MOT_MODES)[number]
export const DEFAULT_MOT_MODE: MotMode = 'both'

/** Groups shown as rows before "show all". */
export const MOT_GROUPS_PREVIEW = 6

/** Mileage band caption in thousand km: "0–25", "250+" (the unit is named once, in the chart caption). */
export function bandLabel(edgesKm: readonly number[], band: number): string {
  const from = (edgesKm[band] ?? 0) / 1000
  const to = edgesKm[band + 1]
  return to === undefined ? `${from}+` : `${from}–${to / 1000}`
}

/** "23 %" — one decimal below 10 %, none above; null shows as an en dash. */
export function formatShare(share: number | null | undefined): string {
  if (share == null) return '–'
  const pct = share * 100
  const oneDecimal = pct.toFixed(1)
  return `${Number(oneDecimal) < 10 ? oneDecimal : Math.round(pct)} %`
}

/** Thousands separated by a narrow no-break space ("1 234 567"), the way the rest of the app writes counts. */
export function formatTests(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Y-axis top for a series: the next "round" value (5, 10, 20, 25, 50, 100 %) above the largest share. */
export function niceMax(max: number): number {
  const steps = [0.05, 0.1, 0.2, 0.25, 0.4, 0.5, 0.75, 1]
  return steps.find(s => max <= s) ?? 1
}

type Series = readonly (number | null)[]

/** Highest value of the series and the band it is in; null when the series has no value. */
export function peakOf(values: Series): { band: number; value: number } | null {
  let best: { band: number; value: number } | null = null
  values.forEach((v, band) => {
    if (v != null && (!best || v > best.value)) best = { band, value: v }
  })
  return best
}

/** First and last band that have a value — the ends of the "grows from … to …" caption. */
export function endsOf(values: Series): { first: number; last: number } | null {
  const bands = values.flatMap((v, band) => (v == null ? [] : [band]))
  return bands.length >= 2 ? { first: bands[0]!, last: bands[bands.length - 1]! } : null
}

export type Trend = 'rising' | 'falling' | 'flat'

/** Trend of a series from its first to its last known band: a change under a fifth of the peak counts as flat. */
export function trendOf(values: Series): Trend {
  const ends = endsOf(values)
  const peak = peakOf(values)
  if (!ends || !peak || peak.value === 0) return 'flat'
  const delta = values[ends.last]! - values[ends.first]!
  if (Math.abs(delta) < peak.value * 0.2) return 'flat'
  return delta > 0 ? 'rising' : 'falling'
}

/** Group code → i18n key; unknown codes (a newer ingest) fall back to "other". */
export function groupKey(code: string): string {
  return `mot.group.${(MOT_GROUP_CODES as readonly string[]).includes(code) ? (code as MotGroupCode) : 'other'}`
}

/** Model years as one phrase: "2014" or "2012–2016". */
export function yearsLabel(from: number, to: number): string {
  return from === to ? String(from) : `${from}–${to}`
}

/** Terms with a glossary entry (`mot.help.<term>.title` / `.body`), in the order the glossary lists them. */
export const MOT_TERMS = [
  'test',
  'fail',
  'watch',
  'dangerous',
  'prs',
  'share',
  'issueTests',
  'band',
  'average',
  'sample',
  'table'
] as const
export type MotTerm = (typeof MOT_TERMS)[number]

/** Index of the mileage band holding `km`, for the band edges the API returned (lower edges, last band open-ended). */
export function bandOfKm(edgesKm: readonly number[], km: number): number {
  let band = 0
  for (let i = 1; i < edgesKm.length; i++) if (km >= edgesKm[i]!) band = i
  return band
}

/** Largest odometer value the "my car" form accepts (km). */
export const MOT_MAX_KM = 999_999

/** What a shared "my car" link carries: an odometer value (`km123000`) or a chosen band (`b3`). */
export type MotCarTab = { km: number | null; band: number | null }

export function motCarTab({ km, band }: MotCarTab): string {
  return km != null ? `km${km}` : `b${band ?? 0}`
}

/** Reads `motCarTab`'s output back; anything else (a hand-edited link) is `null`, i.e. the modal stays closed. */
export function parseMotCarTab(tab: string | null, bandCount: number, edgesKm: readonly number[]): MotCarTab | null {
  const km = /^km(\d{1,6})$/.exec(tab ?? '')
  if (km) return { km: Number(km[1]), band: bandOfKm(edgesKm, Number(km[1])) }
  const band = /^b(\d{1,2})$/.exec(tab ?? '')
  if (band && Number(band[1]) < bandCount) return { km: null, band: Number(band[1]) }
  return null
}
