import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import BrandPronounce from '@/components/BrandPronounce'
import { catalogLookupQuery } from '@/lib/queries'

type Props = {
  brand: string | null | undefined
  model: string | null | undefined
}

/**
 * Speaker button for a plate / VIN card: resolves the make slug through `/api/catalog/lookup` (the same query the catalog link
 * uses, so no extra request) and renders nothing while loading, offline, or when the make has no pronunciation.
 */
export default function BrandPronounceChip({ brand, model }: Props): ReactNode {
  const { data } = useQuery({ ...catalogLookupQuery(brand ?? '', model ?? ''), enabled: !!brand && !!model })
  if (!brand || !data?.pronounce) return null
  return <BrandPronounce slug={data.pronounce} name={brand} />
}
