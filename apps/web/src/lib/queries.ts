import { queryOptions } from '@tanstack/react-query'
import { normalizePlate } from '@carplates/shared'

import {
  decodeVin,
  getCncapRatings,
  getEuroNcapRatings,
  getFuelEconomy,
  getFuelStats,
  getIihsRatings,
  getJncapRatings,
  getKncapRatings,
  getSafetyRatings,
  getStats,
  getUkraineGeography,
  getVehiclePhotos,
  getWikiInfo,
  lookupPlate,
  plateHistory,
  searchVehicles,
  suggestBrands,
  suggestModels
} from '@/lib/api'
import type { FuelEconomyParams, VehicleSearchFilters } from '@/lib/api'
import { isFavorited, listFavorites } from '@/lib/favorites-db'
import type { FavoriteKind } from '@/lib/favorites-db'
import { listVisits } from '@/lib/history-db'
import { getStorageEstimate } from '@/lib/offline-storage'

export function plateQuery(raw: string) {
  const plate = normalizePlate(raw)
  return queryOptions({ queryKey: ['plate', plate], queryFn: () => lookupPlate(plate) })
}

export function plateHistoryQuery(raw: string) {
  const plate = normalizePlate(raw)
  return queryOptions({ queryKey: ['plate', plate, 'history'], queryFn: () => plateHistory(plate) })
}

export function vinQuery(raw: string) {
  const vin = raw.trim().toUpperCase()
  return queryOptions({ queryKey: ['vin', vin], queryFn: () => decodeVin(vin) })
}

// Local IndexedDB reads — networkMode 'always' so they aren't paused while offline.
export function historyQuery() {
  return queryOptions({ queryKey: ['history'], queryFn: listVisits, networkMode: 'always' })
}

export function favoritesQuery() {
  return queryOptions({ queryKey: ['favorites'], queryFn: listFavorites, networkMode: 'always' })
}

export function favoriteQuery(kind: FavoriteKind, value: string) {
  return queryOptions({
    queryKey: ['favorite', kind, value],
    queryFn: () => isFavorited(kind, value),
    networkMode: 'always'
  })
}

// Origin-wide usage (app shell + saved results + cached images), not just the query cache.
export function storageEstimateQuery() {
  return queryOptions({
    queryKey: ['storage-estimate'],
    queryFn: getStorageEstimate,
    staleTime: 0,
    networkMode: 'always'
  })
}

// Only changes on the monthly ingest cron (see PLAN.md, "Registry statistics") — never refetch on its own.
export function statsQuery() {
  return queryOptions({ queryKey: ['stats'], queryFn: getStats, staleTime: Infinity })
}

// Illustrative stock photos for a brand/model/year — never refetch once fetched.
export function vehiclePhotosQuery(brand: string, model: string, year: number | null) {
  return queryOptions({
    queryKey: ['photos', brand, model, year],
    queryFn: () => getVehiclePhotos(brand, model, year),
    staleTime: Infinity
  })
}

// Wikipedia summary + image for a brand/model — live-fetched (not persisted), never refetch once fetched.
export function wikiInfoQuery(brand: string, model: string, lang: string) {
  return queryOptions({
    queryKey: ['wiki', brand, model, lang],
    queryFn: () => getWikiInfo(brand, model, lang),
    staleTime: Infinity
  })
}

// NHTSA crash test ratings for a make/model/year (US-market only) — immutable once published.
export function safetyRatingsQuery(make: string, model: string, year: number) {
  return queryOptions({
    queryKey: ['safety', make, model, year],
    queryFn: () => getSafetyRatings(make, model, year),
    staleTime: Infinity
  })
}

// Euro NCAP ratings — scraped and persisted (pnpm ingest:euroncap), not fetched live.
export function euroNcapRatingsQuery(make: string, model: string, year: number) {
  return queryOptions({
    queryKey: ['safety', 'euroncap', make, model, year],
    queryFn: () => getEuroNcapRatings(make, model, year),
    staleTime: Infinity
  })
}

// JNCAP (Japan, NASVA) ratings — scraped and persisted (pnpm ingest:jncap), not fetched live.
export function jncapRatingsQuery(make: string, model: string, year: number) {
  return queryOptions({
    queryKey: ['safety', 'jncap', make, model, year],
    queryFn: () => getJncapRatings(make, model, year),
    staleTime: Infinity
  })
}

// C-NCAP (China, CATARC) ratings — scraped and persisted (pnpm ingest:cncap), not fetched live.
export function cncapRatingsQuery(make: string, model: string, year: number) {
  return queryOptions({
    queryKey: ['safety', 'cncap', make, model, year],
    queryFn: () => getCncapRatings(make, model, year),
    staleTime: Infinity
  })
}

// KNCAP (Korea, MOLIT/KoROAD) ratings — scraped and persisted (pnpm ingest:kncap), not fetched live.
export function kncapRatingsQuery(make: string, model: string, year: number) {
  return queryOptions({
    queryKey: ['safety', 'kncap', make, model, year],
    queryFn: () => getKncapRatings(make, model, year),
    staleTime: Infinity
  })
}

// IIHS (US, insurance-industry-funded) ratings — scraped and persisted (pnpm ingest:iihs), not fetched live.
export function iihsRatingsQuery(make: string, model: string, year: number) {
  return queryOptions({
    queryKey: ['safety', 'iihs', make, model, year],
    queryFn: () => getIihsRatings(make, model, year),
    staleTime: Infinity
  })
}

// Fuel consumption + CO2 estimate — persisted reference data (pnpm ingest:fuel), not fetched live.
export function fuelEconomyQuery(params: FuelEconomyParams) {
  return queryOptions({
    queryKey: ['fuel', params.make, params.model, params.year, params.fuel ?? null, params.capacity ?? null],
    queryFn: () => getFuelEconomy(params),
    staleTime: Infinity
  })
}

// Fleet-wide fuel/CO2 rollup for the /fuel page — heavy-ish and online-only, like statsQuery (not in the offline cache).
export function fuelStatsQuery() {
  return queryOptions({
    queryKey: ['fuel-stats'],
    queryFn: getFuelStats,
    staleTime: Infinity
  })
}

// Static build asset, never changes at runtime — precached by the service worker, so try it even offline.
export function ukraineGeographyQuery() {
  return queryOptions({
    queryKey: ['ukraine-geography'],
    queryFn: getUkraineGeography,
    staleTime: Infinity,
    networkMode: 'offlineFirst'
  })
}

// Advanced-search brand autocomplete — ranked by distinctPlates, so a popular real spelling
// outranks the ~36k distinct ingest-noise variants.
export function brandSuggestionsQuery(q: string) {
  return queryOptions({ queryKey: ['search', 'brands', q], queryFn: () => suggestBrands(q) })
}

// Advanced-search model autocomplete — scoped to one brand when chosen, otherwise aggregated
// across all brands (same nameplate can appear under several).
export function modelSuggestionsQuery(brand: string | undefined, q: string) {
  return queryOptions({ queryKey: ['search', 'models', brand ?? '', q], queryFn: () => suggestModels(brand, q) })
}

// Advanced-search results — filtered, paginated `current_registration` rows.
export function vehicleSearchQuery(filters: VehicleSearchFilters) {
  return queryOptions({
    queryKey: [
      'search',
      'results',
      filters.brand,
      filters.model,
      filters.yearFrom,
      filters.yearTo,
      filters.fuel,
      filters.color,
      filters.kind,
      filters.region,
      filters.page,
      filters.pageSize
    ],
    queryFn: () => searchVehicles(filters)
  })
}
