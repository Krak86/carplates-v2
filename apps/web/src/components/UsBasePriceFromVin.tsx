import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Currency } from '@carplates/shared'

import UsBasePriceSection from '@/components/UsBasePriceSection'
import { usBasePriceUsd } from '@/components/us-value.helpers'
import { toFieldMap } from '@/components/vin/helpers'
import { vinQuery } from '@/lib/queries'

type Props = {
  scope?: 'withEu' | 'noEu'
  vin: string
  brand: string | null
  model: string | null
  year: number | null
  kind?: string | null
  fuel?: string | null
  capacity?: number | null
  currency?: Currency
  onCurrencyChange?: (currency: Currency) => void
}

/** Plate-card entry: decodes the VIN (same query key as the VIN section, so it is shared) and shows the US base price block. */
export default function UsBasePriceFromVin({ vin, ...rest }: Props): ReactNode {
  const { data } = useQuery(vinQuery(vin))
  const baseUsd = data ? usBasePriceUsd(toFieldMap(data.results)) : null
  if (baseUsd == null) return null
  return <UsBasePriceSection baseUsd={baseUsd} {...rest} />
}
