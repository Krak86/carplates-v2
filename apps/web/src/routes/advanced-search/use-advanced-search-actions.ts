import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { VEHICLE_COLORS, VEHICLE_FUELS, VEHICLE_KINDS } from '@carplates/shared'
import type {
  BrandSuggestion,
  ModelSuggestion,
  SearchResponse,
  VehicleColor,
  VehicleFuel,
  VehicleKind
} from '@carplates/shared'

import { brandSuggestionsQuery, modelSuggestionsQuery, vehicleSearchQuery } from '@/lib/queries'

const DEBOUNCE_MS = 300
const PAGE_SIZE = 20
// Below this, pg_trgm's GIN index (packages/db/migrations 0013/0014) can't accelerate an ILIKE
// substring match on the 15M+ row table -- a 1-2 char pattern isn't a real trigram, so Postgres
// would fall back to a sequential scan. Mirrored server-side in search.controller.ts.
export const MIN_TEXT_FILTER_LENGTH = 3
// A positive 4-digit model year -- anything else (fewer/more digits, a leading zero, a sign) is
// treated as not-yet-a-year rather than coerced, so a half-typed value can't silently narrow (or
// break) the query.
const YEAR_RE = /^[1-9]\d{3}$/

export type AdvancedSearchFilters = {
  brand: string
  model: string
  yearFrom: string
  yearTo: string
  fuel: VehicleFuel | ''
  color: VehicleColor | ''
  kind: VehicleKind | ''
}

type FilterKey = keyof AdvancedSearchFilters

function parseEnumParam<T extends string>(values: readonly T[], value: string | null): T | '' {
  return (values as readonly string[]).includes(value ?? '') ? (value as T) : ''
}

function filtersFromParams(params: URLSearchParams): AdvancedSearchFilters {
  return {
    brand: params.get('brand') ?? '',
    model: params.get('model') ?? '',
    yearFrom: params.get('yearFrom') ?? '',
    yearTo: params.get('yearTo') ?? '',
    fuel: parseEnumParam(VEHICLE_FUELS, params.get('fuel')),
    color: parseEnumParam(VEHICLE_COLORS, params.get('color')),
    kind: parseEnumParam(VEHICLE_KINDS, params.get('kind'))
  }
}

function useDebouncedValue<T>(value: T): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS)
    return (): void => clearTimeout(timer)
  }, [value])
  return debounced
}

/** Empty stays valid (no filter); anything else must be a positive 4-digit year to be usable. */
function parseYearFilter(value: string): { year: number | undefined; invalid: boolean } {
  if (!value) return { year: undefined, invalid: false }
  if (!YEAR_RE.test(value)) return { year: undefined, invalid: true }
  return { year: Number(value), invalid: false }
}

type UseAdvancedSearchActions = {
  filters: AdvancedSearchFilters
  updateFilter: <K extends FilterKey>(key: K, value: AdvancedSearchFilters[K]) => void
  reset: () => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  hasAnyFilter: boolean
  yearFromInvalid: boolean
  yearToInvalid: boolean
  brandSuggestions: BrandSuggestion[]
  modelSuggestions: ModelSuggestion[]
  results: UseQueryResult<SearchResponse, Error>
}

/**
 * Every filter (and the page number) lives in the URL, not component state — a filter set is
 * just a link, shareable and bookmarkable, same as SearchRoute's `/:query` and StatsRoute's
 * `?dim=&metric=`. Typing itself stays instant (the input's value is the URL param, written on
 * every keystroke via `replace` so it never spams browser history); only the network calls
 * (suggestions + the actual search) debounce off that value, via `useDebouncedValue` below.
 */
export function useAdvancedSearchActions(): UseAdvancedSearchActions {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = filtersFromParams(searchParams)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const debouncedBrand = useDebouncedValue(filters.brand)
  const debouncedModel = useDebouncedValue(filters.model)
  const debouncedYearFrom = useDebouncedValue(filters.yearFrom)
  const debouncedYearTo = useDebouncedValue(filters.yearTo)

  const brandFilter = debouncedBrand.length >= MIN_TEXT_FILTER_LENGTH ? debouncedBrand : undefined
  const modelFilter = debouncedModel.length >= MIN_TEXT_FILTER_LENGTH ? debouncedModel : undefined
  const { year: yearFrom, invalid: yearFromInvalid } = parseYearFilter(debouncedYearFrom)
  const { year: yearTo, invalid: yearToInvalid } = parseYearFilter(debouncedYearTo)

  const brandSuggestions = useQuery({
    ...brandSuggestionsQuery(debouncedBrand),
    enabled: debouncedBrand.length >= MIN_TEXT_FILTER_LENGTH
  })
  const modelSuggestions = useQuery({
    ...modelSuggestionsQuery(filters.brand || undefined, debouncedModel),
    enabled: debouncedModel.length >= MIN_TEXT_FILTER_LENGTH
  })

  const hasAnyFilter =
    !yearFromInvalid &&
    !yearToInvalid &&
    Boolean(
      brandFilter || modelFilter || yearFrom != null || yearTo != null || filters.fuel || filters.color || filters.kind
    )

  const results = useQuery({
    ...vehicleSearchQuery({
      brand: brandFilter,
      model: modelFilter,
      yearFrom,
      yearTo,
      fuel: filters.fuel || undefined,
      color: filters.color || undefined,
      kind: filters.kind || undefined,
      page,
      pageSize: PAGE_SIZE
    }),
    enabled: hasAnyFilter
  })

  function updateFilter<K extends FilterKey>(key: K, value: AdvancedSearchFilters[K]): void {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        // Changing the make invalidates whatever model was typed for the previous one.
        if (key === 'brand') next.delete('model')
        next.delete('page')
        return next
      },
      { replace: true }
    )
  }

  function setPage(next: number): void {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        if (next > 1) params.set('page', String(next))
        else params.delete('page')
        return params
      },
      { replace: true }
    )
  }

  function reset(): void {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return {
    filters,
    updateFilter,
    reset,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    hasAnyFilter,
    yearFromInvalid,
    yearToInvalid,
    brandSuggestions: brandSuggestions.data?.suggestions ?? [],
    modelSuggestions: modelSuggestions.data?.suggestions ?? [],
    results
  }
}
