import {
  convertEur,
  customsFuel,
  customsTax,
  floorStartYears,
  OLD_CAR_FLOOR_SHARE,
  type Currency,
  type CustomsTax,
  type FxResponse,
  type RdwMatchInfo
} from '@carplates/shared'

import { approxCount } from '@/components/RdwSpecs.helpers'

type Estimate = NonNullable<RdwMatchInfo['valueEstimate']>

/** Currency signs for the chip text. */
const SIGN: Readonly<Record<Currency, string>> = { EUR: '€', USD: '$', UAH: '₴' }

/** Rounding grain per currency: false precision otherwise (a hryvnia figure of 243,517 says more than we know). */
const STEP: Readonly<Record<Currency, number>> = { EUR: 100, USD: 100, UAH: 1000 }

type Rates = Pick<FxResponse, 'eurUah' | 'usdUah'>

/** "11 700" — a euro amount converted to `currency`, rounded to its grain and grouped by locale. */
export function formatMoney(eur: number, currency: Currency, rates: Rates | null, locale: string): string {
  // Without rates only euros can be shown; callers pick the currency with `effectiveCurrency`.
  const shown = rates ? currency : 'EUR'
  const value = shown === 'EUR' ? eur : convertEur(eur, shown, rates as Rates)
  const rounded = Math.round(value / STEP[shown]) * STEP[shown]
  return rounded.toLocaleString(locale, { maximumFractionDigits: 0 })
}

/** The currency that can actually be shown: euros until the NBU rates have arrived. */
export const effectiveCurrency = (wanted: Currency, rates: Rates | null): Currency => (rates ? wanted : 'EUR')

/** "~ € 11 700–15 900": approximate, signed, a range rather than a point. */
export function formatMoneyRange(
  lowEur: number,
  highEur: number,
  currency: Currency,
  rates: Rates | null,
  locale: string
): string {
  const low = formatMoney(lowEur, currency, rates, locale)
  const high = formatMoney(highEur, currency, rates, locale)
  return `~ ${SIGN[currency]} ${low}–${high}`
}

/** Plain text for the clipboard, in the shown currency only: "€ 10 600–14 400" (no "~", plain spaces). */
export function formatMoneyCopy(
  lowEur: number,
  highEur: number,
  currency: Currency,
  rates: Rates | null,
  locale: string
): string {
  const shown = effectiveCurrency(currency, rates)
  const low = formatMoney(lowEur, shown, rates, locale)
  const high = formatMoney(highEur, shown, rates, locale)
  return `${SIGN[shown]} ${low}–${high}`.replace(/\s+/g, ' ') // toLocaleString groups digits with no-break spaces
}

/** Euros with the sign and no "~", for axis labels: "€11 700". */
export const formatEur = (eur: number, locale: string): string => `€${formatMoney(eur, 'EUR', null, locale)}`

/** What the registry says about the car — the inputs to Ukrainian customs. */
export type CarFacts = {
  /** Registry fuel text. */
  fuel: string | null | undefined
  /** Registry engine capacity, cc. */
  capacityCc: number | null | undefined
  makeYear: number
}

export type UkrPrice = {
  /** Customs of the middle, low and high EU estimates. */
  mid: CustomsTax
  low: CustomsTax
  high: CustomsTax
  /** The capacity used came from the Dutch register's typical figure, not from this car's registry row. */
  capacityFromRdw: boolean
}

/** EU estimate (low / mid / high) → the same car imported to Ukraine today, customs paid. */
export function ukrPrice(match: RdwMatchInfo, estimate: Estimate, car: CarFacts, nowYear: number): UkrPrice {
  const fuel = customsFuel(car.fuel)
  const own = car.capacityCc ?? null
  const rdw = match.specs.displacementCc?.median ?? null
  const capacityFromRdw = own == null && rdw != null
  const capacityCc = own ?? rdw
  const at = (baseEur: number): CustomsTax => customsTax({ baseEur, fuel, capacityCc, makeYear: car.makeYear, nowYear })
  return { mid: at(estimate.midEur), low: at(estimate.lowEur), high: at(estimate.highEur), capacityFromRdw }
}

export type ValueWarning = { key: string; values?: Record<string, string | number> }

/** Warning keys (`value.warn.<key>`) for everything that makes the figure rougher than usual, most serious first. */
export function valueWarnings(
  match: RdwMatchInfo,
  estimate: Estimate,
  price: UkrPrice,
  fuel: string | null | undefined
): ValueWarning[] {
  const warnings: ValueWarning[] = []
  if (estimate.extrapolated) warnings.push({ key: 'extrapolated' })
  if (estimate.rough) warnings.push({ key: 'rough', values: { n: estimate.priceN ?? 0 } })
  if (!match.exactYear) warnings.push({ key: 'nearYear', values: { year: match.specs.year } })
  if (customsFuel(fuel) === 'electric') warnings.push({ key: 'evExcise' })
  else if (!price.mid.exciseKnown) warnings.push({ key: 'exciseUnknown' })
  else if (price.capacityFromRdw) warnings.push({ key: 'capacityFromRdw' })
  return warnings
}

/** AUTO.RIA's own listing page for a make / model / year (a plain link — no data is read from RIA). */
export function riaSearchUrl(make: string, model: string, year: number): string {
  const slug = (s: string): string =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  return `https://auto.ria.com/uk/car/${slug(make)}/${slug(model)}/year/${year}/`
}

export type ChartPoint = { x: number; y: number }

/** Inner drawing box of a chart in SVG user units: the margins leave room for axis labels. */
export type ChartBox = { width: number; height: number; left: number; right: number; top: number; bottom: number }

export type PlottedSeries = {
  /** Series points mapped to SVG coordinates, same order. */
  plotted: { px: number; py: number; point: ChartPoint }[]
  /** Maps a data x / y to SVG coordinates (for markers). */
  toPx: (x: number) => number
  toPy: (y: number) => number
  /** SVG path `d` of the line. */
  path: string
  xMin: number
  xMax: number
  yMax: number
}

/** y axis runs from 0 to the largest value (a price chart reads wrongly with a cut-off baseline). */
export function plotSeries(
  points: readonly ChartPoint[],
  box: ChartBox,
  extraXs: readonly number[] = []
): PlottedSeries {
  const xs = [...points.map(p => p.x), ...extraXs]
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMax = Math.max(...points.map(p => p.y), 1)
  const innerW = box.width - box.left - box.right
  const innerH = box.height - box.top - box.bottom
  const toPx = (x: number): number => box.left + (xMax === xMin ? innerW / 2 : ((x - xMin) / (xMax - xMin)) * innerW)
  const toPy = (y: number): number => box.top + innerH - (y / yMax) * innerH
  const plotted = points.map(point => ({ px: toPx(point.x), py: toPy(point.y), point }))
  const path = plotted.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(' ')
  return { plotted, toPx, toPy, path, xMin, xMax, yMax }
}

/** Loosely-typed `t`, so these helpers don't fight i18next's generic overloads. */
type Translate = (key: string, options?: Record<string, unknown>) => string

/** The "how is this estimated" explanation, one line per fact — shared by the on-screen details and the export. */
export function valueInfoLines(match: RdwMatchInfo, estimate: Estimate, locale: string, t: Translate): string[] {
  const newPrice = estimate.newPriceEur ?? match.specs.priceEur?.median
  const name = `${match.makeName} ${match.modelName}`
  return [
    t('value.info.lead'),
    t('value.info.how', {
      name,
      age: estimate.ageYears,
      percent: Math.round(estimate.retained * 100),
      price: formatEur(Math.round((newPrice ?? 0) / 100) * 100, locale)
    }),
    t('rdw.info.sample', { n: approxCount(estimate.priceN ?? match.specs.n, locale), year: match.specs.year }),
    estimate.rough && t('value.info.rough', { n: estimate.priceN ?? 0 }),
    !match.exactYear && t('value.info.nearYear', { year: match.specs.year }),
    t('value.info.range', { percent: Math.round((estimate.spread ?? 0.15) * 100) }),
    estimate.extrapolated &&
      t('value.info.floor', { years: floorStartYears(), percent: Math.round(OLD_CAR_FLOOR_SHARE * 100) }),
    t('value.info.credit')
  ].filter((line): line is string => typeof line === 'string' && line !== '')
}
