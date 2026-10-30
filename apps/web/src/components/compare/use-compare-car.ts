import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import { motFuelHint } from '@/components/MotFaults.helpers'
import { filterByBodyStyle, nhtsaBodyBucket, averageStarRating } from '@/components/SafetyRatings.helpers'
import { ApiError } from '@/lib/api'
import {
  catalogLookupQuery,
  generationGrowthQuery,
  catalogModelQuery,
  euroNcapRatingsQuery,
  motQuery,
  nhtsaComplaintsQuery,
  nhtsaRecallsQuery,
  plateQuery,
  rdwQuery,
  rdwRecallsQuery,
  safetyRatingsQuery,
  vinQuery,
  wikiSpecsQuery
} from '@/lib/queries'

import { carFromModel, carFromPlate, carFromVin } from './resolve'
import { overallFailRate } from './rows'
import { COMPARE_GROUPS } from './types'
import type { CompareCar, CompareGroup, CompareLoaded, CompareRef } from './types'

export type CompareCarState = {
  loaded: CompareLoaded
  /** Per group: every query the group reads has finished (or has nothing to ask). Pruning waits for this. */
  settled: Record<CompareGroup, boolean>
  /** The slot's input did not resolve: 404 (no such plate / VIN / model) or a failure. */
  error: 'notFound' | 'failed' | null
}

/** A query that is not running now: finished, failed, paused offline, or never asked. */
const done = (q: Pick<UseQueryResult, 'fetchStatus'>): boolean => q.fetchStatus !== 'fetching'

const EMPTY: CompareLoaded = {
  car: null,
  rdw: null,
  wiki: null,
  euroNcap: null,
  nhtsaStars: null,
  rdwRecalls: null,
  nhtsaRecalls: null,
  nhtsaComplaints: null,
  motFailRate: null,
  mot: null,
  generations: null,
  catalog: null
}

/**
 * One slot: resolves the input to a `CompareCar`, then reads the same model-level queries the result card does (most of
 * them are already in the cache after a plate page, the card bundle seeds them). Online-only, like the catalog.
 */
export function useCompareCar(ref: CompareRef | null): CompareCarState {
  const plate = useQuery({ ...plateQuery(ref?.kind === 'plate' ? ref.plate : ''), enabled: ref?.kind === 'plate' })
  const vin = useQuery({ ...vinQuery(ref?.kind === 'vin' ? ref.vin : ''), enabled: ref?.kind === 'vin' })
  const modelRef = ref?.kind === 'model' ? ref : null
  const picked = useQuery({
    ...catalogModelQuery(modelRef?.make ?? '', modelRef?.model ?? ''),
    enabled: !!modelRef
  })

  let car: CompareCar | null = null
  if (ref?.kind === 'plate' && plate.data) car = carFromPlate(ref, plate.data)
  else if (ref?.kind === 'vin' && vin.data) car = carFromVin(ref, vin.data)
  else if (ref?.kind === 'model' && picked.data) car = carFromModel(ref, picked.data)
  const baseQuery = ref?.kind === 'plate' ? plate : ref?.kind === 'vin' ? vin : picked

  const { brand, model, year, kind, fuel, body } = car ?? {}
  const asked = !!(brand && model && year)
  const on = { enabled: asked }
  const rdw = useQuery({ ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind), ...on })
  const wiki = useQuery({ ...wikiSpecsQuery(brand ?? '', model ?? '', year ?? 0), ...on })
  const euroNcap = useQuery({ ...euroNcapRatingsQuery(brand ?? '', model ?? '', year ?? 0), ...on })
  const nhtsa = useQuery({ ...safetyRatingsQuery(brand ?? '', model ?? '', year ?? 0), ...on })
  const rdwRecalls = useQuery({ ...rdwRecallsQuery(brand ?? '', model ?? ''), ...on })
  const nhtsaRecalls = useQuery({ ...nhtsaRecallsQuery(brand ?? '', model ?? '', year ?? 0), ...on })
  const nhtsaComplaints = useQuery({ ...nhtsaComplaintsQuery(brand ?? '', model ?? '', year ?? 0), ...on })
  const mot = useQuery({ ...motQuery(brand ?? '', model ?? '', year ?? 0, kind, motFuelHint(fuel)), ...on })

  const growth = useQuery({ ...generationGrowthQuery(brand ?? '', model ?? ''), ...on })

  // A model ref already holds its catalog page; a plate or VIN asks which page its brand and model belong to.
  const lookup = useQuery({
    ...catalogLookupQuery(brand ?? '', model ?? ''),
    enabled: asked && !modelRef
  })
  const page = lookup.data?.page ?? null
  const pageModel = useQuery({ ...catalogModelQuery(page?.make ?? '', page?.model ?? ''), enabled: !!page })
  const catalog = modelRef ? (picked.data ?? null) : (pageModel.data ?? null)

  const assessmentId = euroNcap.data?.applicableAssessmentId
  const ratings = nhtsa.data
    ? filterByBodyStyle(nhtsa.data.ratings, body ?? null, r => nhtsaBodyBucket(r.description))
    : []
  const loaded: CompareLoaded = !car
    ? EMPTY
    : {
        car,
        rdw: rdw.data?.match ?? null,
        wiki: wiki.data?.match ?? null,
        euroNcap: assessmentId ? (euroNcap.data?.ratings.find(r => r.assessmentId === assessmentId) ?? null) : null,
        nhtsaStars: averageStarRating(ratings.map(r => r.overallRating)),
        rdwRecalls: rdwRecalls.data?.match?.total ?? null,
        nhtsaRecalls: nhtsaRecalls.data?.matchedModel ? nhtsaRecalls.data.total : null,
        nhtsaComplaints: nhtsaComplaints.data?.matchedModel ? nhtsaComplaints.data.total : null,
        motFailRate: mot.data?.match ? overallFailRate(mot.data.match.bands) : null,
        mot: mot.data?.match ? { edgesKm: mot.data.match.edgesKm, bands: mot.data.match.bands } : null,
        generations: growth.data?.match?.generations ?? null,
        catalog
      }

  const base = !ref || done(baseQuery)
  const group: Record<CompareGroup, boolean> = {
    overview: done(wiki) && done(rdw) && done(growth),
    engine: done(wiki) && done(rdw),
    size: done(wiki) && done(rdw),
    economy: done(rdw),
    price: done(rdw),
    safety: done(euroNcap) && done(nhtsa),
    reliability: done(rdwRecalls) && done(nhtsaRecalls) && done(nhtsaComplaints) && done(mot),
    ukraine: done(lookup) && done(pageModel) && (!modelRef || done(picked)),
    exact: true
  }
  const settled = Object.fromEntries(COMPARE_GROUPS.map(g => [g, base && group[g]])) as Record<CompareGroup, boolean>

  const error =
    !ref || !baseQuery.isError
      ? null
      : baseQuery.error instanceof ApiError && baseQuery.error.status === 404
        ? 'notFound'
        : 'failed'
  return { loaded, settled, error }
}
