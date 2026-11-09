import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  auctionCard,
  co2Card,
  crashCard,
  operationCard,
  recallsCard,
  wantedCard
} from '@/components/ResultSummary.helpers'
import type { Fetched, SummaryCard } from '@/components/ResultSummary.types'
import { toIntlLocale } from '@/lib/intl'
import {
  auctionLotsQuery,
  caRecallsQuery,
  cncapRatingsQuery,
  euroNcapRatingsQuery,
  fuelEconomyQuery,
  iihsRatingsQuery,
  jncapRatingsQuery,
  kncapRatingsQuery,
  nhtsaRecallsQuery,
  rdwQuery,
  rdwRecallsQuery,
  safetyRatingsQuery,
  wantedQuery
} from '@/lib/queries'

type Params = {
  plate: string | null
  /** Only a decodable VIN: a legacy chassis number matches nothing. */
  vin: string | null
  brand: string | null
  model: string | null
  year: number | null
  kind: string | null
  fuel: string | null
  capacity: number | null
  body: string | null
  operCode: number | null
  dReg: string | null
}

/** A query's answer for the strip; `null` when the query is off for this car (nothing to wait for). */
function fetched<T>(result: UseQueryResult<T>, enabled: boolean): Fetched<T> {
  return enabled ? { data: result.data, isError: result.isError, isLoading: result.isLoading } : null
}

/**
 * The cards of the summary strip. Every query is the same one a section below (or a header chip) already runs, so they
 * share the TanStack cache and the strip adds no endpoint of its own.
 */
export function useResultSummary(p: Params): SummaryCard[] {
  const { i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const formatDate = (iso: string): string => new Date(iso).toLocaleDateString(locale)

  const hasLookup = !!p.plate || !!p.vin
  const hasModel = !!(p.brand && p.model && p.year)
  const hasBrand = !!(p.brand && p.model)
  const [brand, model, year] = [p.brand ?? '', p.model ?? '', p.year ?? 0]

  const wanted = useQuery({ ...wantedQuery(p.plate, p.vin), enabled: hasLookup })
  const auction = useQuery({ ...auctionLotsQuery(p.plate, p.vin), enabled: hasLookup })

  const euroncap = useQuery({ ...euroNcapRatingsQuery(brand, model, year), enabled: hasModel })
  const nhtsa = useQuery({ ...safetyRatingsQuery(brand, model, year), enabled: hasModel })
  const jncap = useQuery({ ...jncapRatingsQuery(brand, model, year), enabled: hasModel })
  const cncap = useQuery({ ...cncapRatingsQuery(brand, model, year), enabled: hasModel })
  const kncap = useQuery({ ...kncapRatingsQuery(brand, model, year), enabled: hasModel })
  const iihs = useQuery({ ...iihsRatingsQuery(brand, model, year), enabled: hasModel })

  const fuel = useQuery({
    ...fuelEconomyQuery({ make: brand, model, year, fuel: p.fuel, capacity: p.capacity }),
    enabled: hasModel
  })
  // Same key as the Specs block and the Emissions section. Asked only where EPA / EEA found nothing, like the section does.
  const noEstimate = fuel.isSuccess && !fuel.data?.estimate
  const rdw = useQuery({ ...rdwQuery(brand, model, year, p.kind), enabled: hasModel && noEstimate })

  const rdwRecalls = useQuery({ ...rdwRecallsQuery(brand, model), enabled: hasBrand })
  const nhtsaRecalls = useQuery({ ...nhtsaRecallsQuery(brand, model, year), enabled: hasModel })
  const caRecalls = useQuery({ ...caRecallsQuery(brand, model, year), enabled: hasModel })

  return [
    wantedCard(fetched(wanted, hasLookup), formatDate),
    operationCard(p.operCode, p.dReg),
    crashCard({
      euroncap: fetched(euroncap, hasModel),
      nhtsa: fetched(nhtsa, hasModel),
      jncap: fetched(jncap, hasModel),
      cncap: fetched(cncap, hasModel),
      kncap: fetched(kncap, hasModel),
      iihs: fetched(iihs, hasModel),
      body: p.body
    }),
    co2Card({ fuel: fetched(fuel, hasModel), rdw: fetched(rdw, hasModel && noEstimate) }),
    auctionCard(fetched(auction, hasLookup), formatDate),
    recallsCard({
      rdw: fetched(rdwRecalls, hasBrand),
      nhtsa: fetched(nhtsaRecalls, hasModel),
      ca: fetched(caRecalls, hasModel)
    })
  ]
}
