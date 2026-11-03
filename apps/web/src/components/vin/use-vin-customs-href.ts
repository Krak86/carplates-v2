import { useQuery } from '@tanstack/react-query'

import { usBasePriceUsd, usValue } from '@/components/us-value.helpers'
import { buildFallback, toFieldMap, typicalLookup } from '@/components/vin/helpers'
import { fxQuery, rdwQuery, vinQuery } from '@/lib/queries'
import { customsPrefillHref } from '@/routes/customs/helpers'
import { CUSTOMS_PATH } from '@/routes/read/links'

/**
 * `/customs` link prefilled with the decoded car: fuel, engine size, year and the same customs value the Estimated
 * value section starts from (EU estimate, else the US-MSRP one). Reads the cached VIN / RDW / NBU queries, so it costs no
 * extra request; the bare calculator link until they have answered or when the car is too thin to prefill.
 */
export function useVinCustomsHref(vin: string): string {
  const { data } = useQuery(vinQuery(vin))
  const fields = data ? toFieldMap(data.results) : null
  const lookup = data && fields ? typicalLookup(fields, buildFallback(data.vin, fields, data.registry?.actions[0])) : null
  const { brand, model, year, kind, fuel, capacity } = lookup ?? {}
  const rdw = useQuery({
    ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: !!(brand && model && year)
  }).data
  const fx = useQuery(fxQuery()).data ?? null
  if (!fields || !year) return CUSTOMS_PATH

  const baseUsd = usBasePriceUsd(fields)
  const us =
    baseUsd != null && fx
      ? usValue({ baseUsd, fx, makeYear: year, nowYear: new Date().getFullYear(), fuel, capacityCc: capacity })
      : null
  const midEur = rdw?.match?.valueEstimate?.midEur ?? us?.midEur ?? null

  return (
    customsPrefillHref({
      fuelText: fuel,
      cc: capacity ?? rdw?.match?.specs.displacementCc?.median ?? null,
      year,
      valueEur: midEur == null ? null : Math.round(midEur)
    }) ?? CUSTOMS_PATH
  )
}
