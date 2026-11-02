import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import CatalogViewChips from '@/components/catalog/CatalogViewChips'
import { catalogModelQuery } from '@/lib/queries'

type Props = {
  make: string
  /** Slug of the make's biggest model: a make has no model of its own, so its chips are that model's. */
  topModelSlug: string | undefined
}

/** The model-level chips (cross-market, 3D, 360°, test drive) of a make's biggest model, on the make page. */
export default function CatalogMakeViewChips({ make, topModelSlug }: Props): ReactNode {
  const { data } = useQuery({ ...catalogModelQuery(make, topModelSlug ?? ''), enabled: !!topModelSlug })

  return data ? <CatalogViewChips model={data} /> : null
}
