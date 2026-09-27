import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { VEHICLE_COLORS, VEHICLE_FUELS, VEHICLE_KINDS } from '@carplates/shared'
import type { BrandSuggestion, ModelSuggestion, SearchResponse, VehicleColor, VehicleFuel, VehicleKind } from '@carplates/shared'

import { brandSuggestionsQuery, modelSuggestionsQuery, vehicleSearchQuery } from '@/lib/queries'

const DEBOUNCE_MS = 300
const PAGE_SIZE = 20

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

type UseAdvancedSearchActions = {
  filters: AdvancedSearchFilters
  updateFilter: <K extends FilterKey>(key: K, value: AdvancedSearchFilters[K]) => void
  reset: () => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  hasAnyFilter: boolean
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

  const brandSuggestions = useQuery({
    ...brandSuggestionsQuery(debouncedBrand),
    enabled: debouncedBrand.length > 0
  })
  const modelSuggestions = useQuery({
    ...modelSuggestionsQuery(filters.brand || undefined, debouncedModel),
    enabled: debouncedModel.length > 0
  })

  const yearFrom = filters.yearFrom ? Number(filters.yearFrom) : undefined
  const yearTo = filters.yearTo ? Number(filters.yearTo) : undefined
  const hasAnyFilter = Boolean(
    debouncedBrand || debouncedModel || yearFrom != null || yearTo != null || filters.fuel || filters.color || filters.kind
  )

  const results = useQuery({
    ...vehicleSearchQuery({
      brand: debouncedBrand || undefined,
      model: debouncedModel || undefined,
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
    brandSuggestions: brandSuggestions.data?.suggestions ?? [],
    modelSuggestions: modelSuggestions.data?.suggestions ?? [],
    results
  }
}
