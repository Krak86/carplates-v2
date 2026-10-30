import { catalogPath } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'

import { catalogLookupQuery } from '@/lib/queries'

/**
 * `/cars/<make>/<model>` for a brand + model, or null while loading, offline, or when the model has no catalog page.
 * The slug needs the server's known-model set, so the web asks `/api/catalog/lookup` instead of computing it.
 */
export function useCatalogPath(brand: string | null | undefined, model: string | null | undefined): string | null {
  const enabled = !!brand && !!model
  const { data } = useQuery({ ...catalogLookupQuery(brand ?? '', model ?? ''), enabled })
  return data?.page ? catalogPath(data.page.make, data.page.model) : null
}
