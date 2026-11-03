import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import type { MarketDetail } from '@carplates/shared'

import { marketDetailQuery } from '@/lib/queries'

/** Detail of one listing for the modal (1 CarAPIS request on an API cache miss, so it runs only while the modal is mounted). */
export function useMarketDetailActions(id: string): UseQueryResult<MarketDetail> {
  return useQuery(marketDetailQuery(id))
}
