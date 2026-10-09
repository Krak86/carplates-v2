import { useQuery } from '@tanstack/react-query'

import { models360Query, models3dQuery, statsTopQuery, vdbQuery } from '@/lib/queries'

type Args = {
  brand: string | null
  model: string | null
  kind?: string | null
}

/**
 * True while any query behind the async header chips (rankings, VehiclesDB, 3D, 360°) is still loading. The chip
 * components share these exact queries, so no extra requests are made — it only drives the row's skeleton.
 */
export function useChipsPending({ brand, model, kind }: Args): boolean {
  const enabled = !!(brand && model)
  const stats = useQuery(statsTopQuery())
  const vdb = useQuery({ ...vdbQuery(brand ?? '', model ?? '', kind), enabled })
  const models3d = useQuery({ ...models3dQuery(brand ?? '', model ?? ''), enabled })
  const models360 = useQuery({ ...models360Query(brand ?? '', model ?? ''), enabled })
  return stats.isPending || (enabled && (vdb.isPending || models3d.isPending || models360.isPending))
}
