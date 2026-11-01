import { useSearchParams } from 'react-router'
import {
  AUCTION_GROUPS,
  AUCTION_OUTCOMES,
  AUCTION_SORTS,
  AUCTION_SOURCES,
  DEFAULT_AUCTION_OUTCOME,
  DEFAULT_AUCTION_SORT
} from '@carplates/shared'
import type { AuctionGroup, AuctionListQuery, AuctionOutcome, AuctionSort, AuctionSource } from '@carplates/shared'

import { AUCTION_DIMENSIONS, DEFAULT_AUCTION_DIMENSION } from '@/routes/auctions/types'
import type { AuctionDimension } from '@/routes/auctions/types'

function parseOf<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return (list as readonly string[]).includes(value ?? '') ? (value as T) : fallback
}

/** An optional filter: the value when it is one of `list`, else no filter. */
const parseOptional = <T extends string>(list: readonly T[], value: string | null): T | undefined =>
  (list as readonly string[]).includes(value ?? '') ? (value as T) : undefined

const parseNumber = (value: string | null): number | undefined => {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** The `/auctions` filters live in the URL (`?source=&group=&make=&region=&outcome=&sort=&asc=&min=&max=&page=&dim=`) so a view can be shared. */
export function useAuctionFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const dimension: AuctionDimension = parseOf(AUCTION_DIMENSIONS, searchParams.get('dim'), DEFAULT_AUCTION_DIMENSION)
  const outcome: AuctionOutcome = parseOf(AUCTION_OUTCOMES, searchParams.get('outcome'), DEFAULT_AUCTION_OUTCOME)
  const sort: AuctionSort = parseOf(AUCTION_SORTS, searchParams.get('sort'), DEFAULT_AUCTION_SORT)
  const page = Math.max(1, Math.floor(parseNumber(searchParams.get('page')) ?? 1))

  const source: AuctionSource | undefined = parseOptional(AUCTION_SOURCES, searchParams.get('source'))
  const group: AuctionGroup | undefined = parseOptional(AUCTION_GROUPS, searchParams.get('group'))

  const query: AuctionListQuery = {
    source,
    group,
    make: searchParams.get('make') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    outcome,
    sort,
    asc: searchParams.get('asc') === 'true' ? 'true' : 'false',
    minPrice: parseNumber(searchParams.get('min')),
    maxPrice: parseNumber(searchParams.get('max')),
    page
  }

  /** Set (or with an empty value clear) params; any change but `page` / `dim` goes back to page 1. */
  const setParams = (changes: Record<string, string | null>): void => {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') params.delete(key)
          else params.set(key, value)
        }
        if (!('page' in changes) && Object.keys(changes).some(k => k !== 'dim')) params.delete('page')
        return params
      },
      { replace: true, preventScrollReset: true }
    )
  }

  const reset = (): void =>
    setSearchParams(prev => (prev.get('dim') ? new URLSearchParams({ dim: prev.get('dim') ?? '' }) : {}), {
      replace: true,
      preventScrollReset: true
    })

  return { query, dimension, setParams, reset }
}
