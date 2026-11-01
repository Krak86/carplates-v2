import { lazy } from 'react'
import type { ReactNode } from 'react'
import type { VinDecodeResponse } from '@carplates/shared'

import FuelEconomy from '@/components/FuelEconomy'
import RdwSpecs from '@/components/RdwSpecs'
import UsBasePriceSection from '@/components/UsBasePriceSection'
import { usBasePriceUsd } from '@/components/us-value.helpers'
import LazySection from '@/components/LazySection'
import { buildFallback, toFieldMap, typicalLookup } from '@/components/vin/helpers'
import VinTypicalEuBaseline from '@/components/vin/VinTypicalEuBaseline'

const VehicleSizeSection = lazy(() => import('@/components/size/VehicleSizeSection'))
const RdwRecalls = lazy(() => import('@/components/RdwRecalls'))

type Props = {
  data: VinDecodeResponse
}

/**
 * Model-level data (NL register specs, cross-market chips, emissions) for the VIN's make / model / year. None of it is
 * decoded from this VIN, so the whole group carries a dashed "≈ typical" tag — the same visual language as the
 * fallback tags — and says when the make / model / year it was looked up by were estimates themselves.
 */
export default function VinTypicalData({ data }: Props): ReactNode {
  const fields = toFieldMap(data.results)
  const fallback = buildFallback(data.vin, fields, data.registry?.actions[0])
  const lookup = typicalLookup(fields, fallback)
  if (!lookup) return null

  const { brand, model, year, kind, fuel, capacity } = lookup
  const baseUsd = usBasePriceUsd(fields)

  return (
    <div className="mt-4">
      <RdwSpecs brand={brand} model={model} year={year} kind={kind} fuel={fuel} />
      {baseUsd != null && (
        <UsBasePriceSection
          baseUsd={baseUsd}
          brand={brand}
          model={model}
          year={year}
          kind={kind}
          fuel={fuel}
          capacity={capacity}
        />
      )}
      <LazySection sections={['size']}>
        <VehicleSizeSection
          brand={brand}
          model={model}
          year={year}
          kind={kind}
          vinFields={fields}
          compareFrom={{ kind: 'vin', vin: data.vin }}
        />
      </LazySection>
      <FuelEconomy brand={brand} model={model} year={year} fuel={fuel} capacity={capacity} kind={kind} />
      <VinTypicalEuBaseline brand={brand} model={model} year={year} kind={kind} />
      <LazySection sections={['recalls']}>
        <RdwRecalls brand={brand} model={model} year={year} kind={kind} />
      </LazySection>
    </div>
  )
}
