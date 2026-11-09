import { co2Band, co2Score } from '@carplates/shared'

import { averageStarRating, filterByBodyStyle, nhtsaBodyBucket } from '@/components/SafetyRatings.helpers'
import type {
  AuctionResponse,
  Co2Inputs,
  CrashInputs,
  Fetched,
  RecallInputs,
  SummaryCard,
  WantedResponse
} from '@/components/ResultSummary.types'
import { operStatus } from '@/lib/oper-info'

/** Number of crash-test programmes the strip looks at (Euro NCAP, NHTSA, JNCAP, C-NCAP, KNCAP, IIHS). */
export const CRASH_PROGRAMMES = 6

/** A car at or below this many stars (of 5) gets the "Attention" mark. */
export const LOW_STARS = 2

const pending = (id: SummaryCard['id']): SummaryCard => ({ id, state: 'pending', textKey: null })

/** Settled = answered or failed; a query that does not apply (`null`) counts as settled with nothing. */
const isSettled = (f: Fetched<unknown>): boolean => f == null || !f.isLoading
const isLoading = (f: Fetched<unknown>): boolean => f != null && f.isLoading

/** ISO timestamp -> the date part the source gave us, shown through the caller's locale formatter. */
type FormatDate = (iso: string) => string

/**
 * Wanted check. Wording rule: never "this car is fine", only "nothing found in the police list on <date>". A list that
 * was never loaded (or a failed request) is "no data", visibly different from "nothing found".
 */
export function wantedCard(query: Fetched<WantedResponse>, formatDate: FormatDate): SummaryCard {
  if (isLoading(query)) return pending('wanted')
  const data = query?.data
  if (!data) return { id: 'wanted', state: 'nodata', textKey: 'summary.wanted.nodata' }
  if (data.wanted) return { id: 'wanted', state: 'attention', textKey: 'summary.wanted.wanted' }
  if (data.plateWanted) return { id: 'wanted', state: 'attention', textKey: 'summary.wanted.plate' }
  if (data.records.length > 0 || !!data.plates?.length) {
    return { id: 'wanted', state: 'attention', textKey: 'summary.wanted.was' }
  }
  if (!data.checkedAt) return { id: 'wanted', state: 'nodata', textKey: 'summary.wanted.nodata' }
  return { id: 'wanted', state: 'ok', textKey: 'summary.wanted.clear', params: { date: formatDate(data.checkedAt) } }
}

/** Last registry operation (from the plate payload itself) and what it says about the registry status. */
export function operationCard(operCode: number | null, dReg: string | null): SummaryCard {
  if (operCode == null) return { id: 'operation', state: 'nodata', textKey: 'summary.operation.nodata' }
  const status = operStatus(operCode)
  const year = dReg?.slice(0, 4)
  return {
    id: 'operation',
    // Leaving the register is the only status that is a flag on its own; the rest is just the car's story.
    state: status === 'deregistered' ? 'attention' : 'ok',
    textKey: year ? 'summary.operation.withYear' : 'summary.operation.value',
    params: year ? { year } : undefined,
    paramKeys: { status: `oper.status.${status}` }
  }
}

/**
 * Crash tests across the six programmes. A programme counts only when it has the rating of this car's generation
 * (`applicable*`), never a neighbouring generation's. Low stars (Euro NCAP or NHTSA) is the flag; nothing found anywhere
 * is "no data", not "safe".
 */
export function crashCard(input: CrashInputs): SummaryCard {
  const { euroncap, nhtsa, jncap, cncap, kncap, iihs, body } = input
  const all = [euroncap, nhtsa, jncap, cncap, kncap, iihs]

  const euro = euroncap?.data
  const euroApplicable = euro?.ratings.find(r => r.assessmentId === euro.applicableAssessmentId) ?? null
  const hasApplicable = (
    f: { ratings: { assessmentId: string }[]; applicableAssessmentId: string | null } | undefined
  ): boolean =>
    !!f && f.applicableAssessmentId != null && f.ratings.some(r => r.assessmentId === f.applicableAssessmentId)
  const nhtsaRows = filterByBodyStyle(nhtsa?.data?.ratings ?? [], body, r => nhtsaBodyBucket(r.description))
  const nhtsaAverage = averageStarRating(nhtsaRows.map(r => r.overallRating))
  const iihsIds = iihs?.data?.applicableAssessmentIds ?? []

  const count = [
    !!euroApplicable,
    nhtsaAverage != null,
    hasApplicable(jncap?.data),
    hasApplicable(cncap?.data),
    hasApplicable(kncap?.data),
    iihsIds.length > 0 && !!iihs?.data?.ratings.some(r => iihsIds.includes(r.assessmentId))
  ].filter(Boolean).length

  // Wait for every programme before saying "no data"; a hit can already be shown while others load.
  if (count === 0) {
    return all.some(isLoading) ? pending('crash') : { id: 'crash', state: 'nodata', textKey: 'summary.crash.nodata' }
  }
  const stars = euroApplicable?.stars ?? null
  const lowest = [stars, nhtsaAverage].filter((s): s is number => s != null)
  const isLow = lowest.some(s => s <= LOW_STARS)
  const total = CRASH_PROGRAMMES
  if (stars != null) {
    return {
      id: 'crash',
      state: isLow ? 'attention' : 'ok',
      textKey: 'summary.crash.euroncap',
      params: { stars, count, total }
    }
  }
  return {
    id: 'crash',
    state: isLow ? 'attention' : 'ok',
    textKey: 'summary.crash.count',
    params: { count, total }
  }
}

/** The g/km the card works from: the EPA / EEA estimate (range midpoint), else the Dutch register's median. */
export function co2Figure(input: Co2Inputs): { gKm: number; cycle: string } | null {
  const estimate = input.fuel?.data?.estimate
  if (estimate) {
    // A pure EV has no tailpipe CO2; its estimate carries 0 g/km, which the same code path scores as the best band.
    return { gKm: Math.round((estimate.co2GKmMin + estimate.co2GKmMax) / 2), cycle: estimate.cycle }
  }
  const rdw = input.rdw?.data?.match?.specs.co2GKm
  return rdw ? { gKm: Math.round(rdw.median), cycle: 'WLTP / NEDC' } : null
}

/** Tailpipe CO2 of similar vehicles. Always an estimate for the model, never this car's own figure. */
export function co2Card(input: Co2Inputs): SummaryCard {
  const figure = co2Figure(input)
  if (!figure) {
    // The Dutch register is only asked once EPA / EEA found nothing, so wait for both before "no data".
    return isLoading(input.fuel) || (input.fuel?.data?.estimate == null && isLoading(input.rdw))
      ? pending('co2')
      : { id: 'co2', state: 'nodata', textKey: 'summary.co2.nodata' }
  }
  const score = co2Score(figure.gKm)
  return {
    id: 'co2',
    state: score != null && co2Band(score) === 'red' ? 'attention' : 'ok',
    textKey: 'summary.co2.value',
    params: { gKm: figure.gKm, cycle: figure.cycle }
  }
}

/** SETAM / Prozorro.Sale lots that named this plate or VIN. A lot is history, so it is flagged, not condemned. */
export function auctionCard(query: Fetched<AuctionResponse>, formatDate: FormatDate): SummaryCard {
  if (isLoading(query)) return pending('auction')
  const data = query?.data
  if (!data) return { id: 'auction', state: 'nodata', textKey: 'summary.auction.nodata' }
  if (data.lots.length > 0) {
    return { id: 'auction', state: 'attention', textKey: 'summary.auction.found', params: { count: data.lots.length } }
  }
  if (!data.checkedAt) return { id: 'auction', state: 'nodata', textKey: 'summary.auction.nodata' }
  return { id: 'auction', state: 'ok', textKey: 'summary.auction.none', params: { date: formatDate(data.checkedAt) } }
}

/**
 * Recall campaigns filed for the MODEL (RDW EU, NHTSA US, Transport Canada): none of them says whether this particular
 * car is affected, so the card says "for this model". Only sources that answered are named in the "nothing found" line.
 */
export function recallsCard(input: RecallInputs): SummaryCard {
  const sources = [
    { name: 'RDW', query: input.rdw, total: input.rdw?.data?.match?.total ?? 0 },
    { name: 'NHTSA', query: input.nhtsa, total: input.nhtsa?.data?.total ?? 0 },
    { name: 'Transport Canada', query: input.ca, total: input.ca?.data?.match?.total ?? 0 }
  ]
  const total = sources.reduce((sum, s) => sum + s.total, 0)
  if (total > 0)
    return { id: 'recalls', state: 'attention', textKey: 'summary.recalls.found', params: { count: total } }
  const answered = sources.filter(s => s.query?.data != null)
  if (answered.length === 0) {
    return sources.some(s => isLoading(s.query))
      ? pending('recalls')
      : { id: 'recalls', state: 'nodata', textKey: 'summary.recalls.nodata' }
  }
  // A source still loading could yet have campaigns: stay pending rather than show a premature "nothing found".
  if (!sources.every(s => isSettled(s.query))) return pending('recalls')
  return {
    id: 'recalls',
    state: 'ok',
    textKey: 'summary.recalls.none',
    params: { sources: answered.map(s => s.name).join(', ') }
  }
}
