import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import {
  MIN_INDEXABLE_LENGTH,
  REGION_NAMES,
  textFilterError,
  VEHICLE_COLORS,
  VEHICLE_FUELS,
  VEHICLE_KINDS
} from '@carplates/shared'
import type {
  BodySuggestion,
  OperSuggestion,
  BrandSuggestion,
  TextFilterError,
  ModelSuggestion,
  SearchResponse,
  VehicleColor,
  VehicleFuel,
  VehicleKind
} from '@carplates/shared'

import {
  bodySuggestionsQuery,
  brandSuggestionsQuery,
  modelSuggestionsQuery,
  operationsQuery,
  vehicleSearchQuery
} from '@/lib/queries'

const DEBOUNCE_MS = 300
const PAGE_SIZE = 20
// Suggestions (small stats_* rollups) start at 2 chars; the search's own make/model floors are in
// @carplates/shared's searchFilters.ts, mirrored server-side in search.controller.ts.
const MIN_SUGGEST_LENGTH = 2
// A positive 4-digit model year -- anything else (fewer/more digits, a leading zero, a sign) is
// treated as not-yet-a-year rather than coerced, so a half-typed value can't silently narrow (or
// break) the query.
const YEAR_RE = /^[1-9]\d{3}$/
// An operation code from the status dropdown ("215"); anything else in a hand-edited URL is ignored.
const OPER_RE = /^\d{1,4}$/

export type AdvancedSearchFilters = {
  brand: string
  model: string
  yearFrom: string
  yearTo: string
  fuel: VehicleFuel | ''
  color: VehicleColor | ''
  kind: VehicleKind | ''
  body: string
  region: string
  /** Latest operation code as a string ("" = any). */
  oper: string
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
    kind: parseEnumParam(VEHICLE_KINDS, params.get('kind')),
    body: params.get('body') ?? '',
    region: parseEnumParam(REGION_NAMES, params.get('region')),
    oper: OPER_RE.test(params.get('oper') ?? '') ? (params.get('oper') ?? '') : ''
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
  /** Commits the draft filters to the URL, which is what actually triggers the search. */
  submit: () => void
  canSearch: boolean
  textError: TextFilterError | null
  /** The body text is non-empty but shorter than the trigram-indexable minimum. */
  bodyTooShort: boolean
  page: number
  setPage: (page: number) => void
  pageSize: number
  /** The committed (URL) filters have something to search for. */
  hasAnyFilter: boolean
  yearFromInvalid: boolean
  yearToInvalid: boolean
  brandSuggestions: BrandSuggestion[]
  modelSuggestions: ModelSuggestion[]
  bodySuggestions: BodySuggestion[]
  /** Every operation code with its current vehicle count, for the registration-status dropdown. */
  operations: OperSuggestion[]
  results: UseQueryResult<SearchResponse, Error>
}

/**
 * Two layers of filter state. The form edits a local `draft`; nothing is fetched while typing. Clicking
 * Search (or pressing Enter) `submit`s the draft into the URL, and the URL's filters are what the results
 * query reads -- so a result set is still just a shareable, bookmarkable link, same as SearchRoute's
 * `/:query` and StatsRoute's `?dim=&metric=`. Only the autocomplete suggestions fetch off the draft
 * (debounced). The URL is the source of truth on first load; the draft is seeded from it once.
 */
export function useAdvancedSearchActions(): UseAdvancedSearchActions {
  const [searchParams, setSearchParams] = useSearchParams()
  const applied = filtersFromParams(searchParams)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [draft, setDraft] = useState<AdvancedSearchFilters>(() => filtersFromParams(searchParams))

  const debouncedBrand = useDebouncedValue(draft.brand.trim())
  const debouncedModel = useDebouncedValue(draft.model.trim())
  const debouncedBody = useDebouncedValue(draft.body.trim())

  const { year: draftYearFrom, invalid: yearFromInvalid } = parseYearFilter(draft.yearFrom)
  const { year: draftYearTo, invalid: yearToInvalid } = parseYearFilter(draft.yearTo)
  const textError = textFilterError(draft.brand, draft.model)
  const bodyTooShort = draft.body.trim().length > 0 && draft.body.trim().length < MIN_INDEXABLE_LENGTH

  const draftHasFilter = Boolean(
    draft.brand.trim() ||
    draft.model.trim() ||
    draftYearFrom != null ||
    draftYearTo != null ||
    draft.fuel ||
    draft.color ||
    draft.kind ||
    draft.body ||
    draft.region ||
    draft.oper
  )
  const canSearch = draftHasFilter && !yearFromInvalid && !yearToInvalid && !textError && !bodyTooShort

  const brandSuggestions = useQuery({
    ...brandSuggestionsQuery(debouncedBrand),
    enabled: debouncedBrand.length >= MIN_SUGGEST_LENGTH
  })
  const modelSuggestions = useQuery({
    ...modelSuggestionsQuery(draft.brand.trim() || undefined, debouncedModel),
    enabled: debouncedModel.length >= MIN_SUGGEST_LENGTH
  })

  const bodySuggestions = useQuery({
    ...bodySuggestionsQuery(debouncedBody),
    enabled: debouncedBody.length >= MIN_SUGGEST_LENGTH
  })

  const operations = useQuery(operationsQuery())

  // Committed filters. A hand-edited / stale URL that breaks a rule simply doesn't search.
  const { year: yearFrom, invalid: appliedYearFromInvalid } = parseYearFilter(applied.yearFrom)
  const { year: yearTo, invalid: appliedYearToInvalid } = parseYearFilter(applied.yearTo)
  const hasAnyFilter =
    !appliedYearFromInvalid &&
    !appliedYearToInvalid &&
    !textFilterError(applied.brand, applied.model) &&
    (applied.body.trim().length === 0 || applied.body.trim().length >= MIN_INDEXABLE_LENGTH) &&
    Boolean(
      applied.brand.trim() ||
      applied.model.trim() ||
      yearFrom != null ||
      yearTo != null ||
      applied.fuel ||
      applied.color ||
      applied.kind ||
      applied.body ||
      applied.region ||
      applied.oper
    )

  const results = useQuery({
    ...vehicleSearchQuery({
      brand: applied.brand.trim() || undefined,
      model: applied.model.trim() || undefined,
      yearFrom,
      yearTo,
      fuel: applied.fuel || undefined,
      color: applied.color || undefined,
      kind: applied.kind || undefined,
      body: applied.body.trim() || undefined,
      region: applied.region || undefined,
      oper: applied.oper ? Number(applied.oper) : undefined,
      page,
      pageSize: PAGE_SIZE
    }),
    enabled: hasAnyFilter
  })

  function updateFilter<K extends FilterKey>(key: K, value: AdvancedSearchFilters[K]): void {
    setDraft(prev => ({
      ...prev,
      [key]: value,
      // Changing the make invalidates whatever model was typed for the previous one.
      ...(key === 'brand' ? { model: '' } : {})
    }))
  }

  function submit(): void {
    if (!canSearch) return
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(draft)) {
      if (value) next.set(key, value.trim())
    }
    setSearchParams(next, { replace: true })
  }

  function setPage(nextPage: number): void {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        if (nextPage > 1) params.set('page', String(nextPage))
        else params.delete('page')
        return params
      },
      { replace: true }
    )
  }

  function reset(): void {
    setDraft(filtersFromParams(new URLSearchParams()))
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return {
    filters: draft,
    updateFilter,
    reset,
    submit,
    canSearch,
    textError,
    bodyTooShort,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    hasAnyFilter,
    yearFromInvalid,
    yearToInvalid,
    brandSuggestions: brandSuggestions.data?.suggestions ?? [],
    modelSuggestions: modelSuggestions.data?.suggestions ?? [],
    bodySuggestions: bodySuggestions.data?.suggestions ?? [],
    operations: operations.data?.operations ?? [],
    results
  }
}
