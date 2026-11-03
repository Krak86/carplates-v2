import { useQuery } from '@tanstack/react-query'

import { marketQuery } from '@/lib/queries'
import { marketKindOf, toMarketView } from './helpers'
import type { MarketActions, MarketTarget } from './types'

/**
 * Data of the "Cars for sale" block. `enabled` is the section's `open` state: nothing is requested (and so no CarAPIS
 * request is spent) until the visitor opens "Cars in stock". Needs a make and a model; a kind the catalogue does not hold
 * (motorcycle, trailer, ...) never requests. The query key is `kind + make + model`, shared by the plate card, the catalog
 * page and `?section=stock`.
 */
export function useMarketActions({ brand, model, kind, year }: MarketTarget, enabled: boolean): MarketActions {
  const marketKind = marketKindOf(kind)
  const on = enabled && !!brand && !!model && !!marketKind
  const query = useQuery({ ...marketQuery(brand ?? '', model ?? '', marketKind ?? 'passenger'), enabled: on })
  return {
    isPending: on && query.isPending,
    view: on ? toMarketView(query.data, year) : null
  }
}
