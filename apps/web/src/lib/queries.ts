import { queryOptions } from '@tanstack/react-query'
import { normalizePlate } from '@carplates/shared'
import type { StatsFieldDimension, StockRange, VdbVehicleClass } from '@carplates/shared'

import {
  getAdminAnalytics,
  getAdminStats,
  getAdminUsers,
  getAuthConfig,
  getFeatures,
  getSession,
  decodeVin,
  getCncapRatings,
  getEuroNcapRatings,
  getFuelEconomy,
  getFx,
  getRdw,
  getVdb,
  getVdbStats,
  getFuelStats,
  getNews,
  getNewsPage,
  getSocial,
  getStock,
  getReviews,
  getSafetyStats,
  getIihsRatings,
  getJncapRatings,
  getKncapRatings,
  getSafetyRatings,
  getStats,
  getStatsField,
  getStatsTop,
  getUkraineGeography,
  getModels3d,
  getModels360,
  getVehiclePhotos,
  getWikiImage,
  getWikiInfo,
  lookupPlate,
  plateHistory,
  searchVehicles,
  suggestBodies,
  suggestBrands,
  suggestModels
} from '@/lib/api'
import type { FuelEconomyParams, VehicleSearchFilters } from '@/lib/api'
import { isFavorited, listFavorites } from '@/lib/favorites-db'
import type { FavoriteKind } from '@/lib/favorites-db'
import { listVisits } from '@/lib/history-db'
import { NEWS_PAGE_SIZE } from '@/lib/news'
import { upperBrand } from '@/lib/display-brand'
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

// The four leaderboards only (a few KB) — what the home panel, ResultCard badges and the export need,
// instead of the full ~14 MB statsQuery(). Same monthly-ingest cadence, so same never-refetch policy.
export function statsTopQuery() {
  return queryOptions({ queryKey: ['stats', 'top'], queryFn: getStatsTop, staleTime: Infinity })
}

// One dimension's breakdown for a ResultCard "?" popover — a few dozen rows.
export function statsFieldQuery(dimension: StatsFieldDimension) {
  return queryOptions({
    queryKey: ['stats', 'field', dimension],
    queryFn: () => getStatsField(dimension),
    staleTime: Infinity
  })
}

// Illustrative stock photos for a brand/model/year — never refetch once fetched.
export function vehiclePhotosQuery(brand: string, model: string, year: number | null) {
  return queryOptions({
    queryKey: ['photos', brand, model, year],
    queryFn: () => getVehiclePhotos(brand, model, year),
    staleTime: Infinity
  })
}

// Hero photo for a brand/model/year (our stored row, live Wikimedia only as a server-side fallback) — never refetch once fetched.
export function wikiImageQuery(brand: string, model: string, year: number | null) {
  return queryOptions({
    queryKey: ['wiki', 'image', brand, model, year],
    queryFn: () => getWikiImage(brand, model, year),
    staleTime: Infinity
  })
}

// Photo of this model year — or, with `yearBack`, the nearest of that many earlier years — for the new-cars side widget — never refetch once fetched.
export function showcaseImageQuery(brand: string, model: string, year: number, yearBack = 0) {
  // Registry brands can carry the model ("LAND ROVER  RANGE ROVER EVOQUE"): the showcase row is per bare make.
  const make = upperBrand(brand)
  return queryOptions({
    queryKey: ['wiki', 'showcase', 'v2', make, model, year, yearBack],
    queryFn: () => getWikiImage(make, model, year, true, yearBack),
    staleTime: Infinity
  })
}

// Wikipedia article text for a brand/model — live-fetched, requested only once the Wikipedia section is opened; never refetch once fetched.
export function wikiInfoQuery(brand: string, model: string, lang: string, year: number | null) {
  return queryOptions({
    queryKey: ['wiki', brand, model, lang, year],
    queryFn: () => getWikiInfo(brand, model, lang, year),
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

// VehiclesDB cross-market facts (pnpm ingest:vehiclesdb) — persisted reference data, cached offline like fuel.
export function vdbQuery(brand: string, model: string, kind?: string | null) {
  return queryOptions({
    queryKey: ['vdb', brand, model, kind ?? null],
    queryFn: () => getVdb(brand, model, kind),
    staleTime: Infinity
  })
}

// RDW (Dutch register) specs aggregates (pnpm ingest:rdw) — persisted reference data, cached offline like vdb.
export function rdwQuery(brand: string, model: string, year: number, kind?: string | null) {
  return queryOptions({
    queryKey: ['rdw', brand, model, year, kind ?? null],
    queryFn: () => getRdw(brand, model, year, kind),
    staleTime: Infinity
  })
}

// NBU official UAH rates (cached daily by the API) — online-only; the value chip falls back to euros without them.
export function fxQuery() {
  return queryOptions({
    queryKey: ['fx'],
    queryFn: getFx,
    staleTime: 60 * 60 * 1000,
    retry: false
  })
}

// Registry-by-popularity rollup for the /stats markets panel — online-only, like fuelStatsQuery.
export function vdbStatsQuery(kind: VdbVehicleClass = 'car') {
  return queryOptions({
    queryKey: ['vdb-stats', kind],
    queryFn: () => getVdbStats(kind),
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

// Fleet-wide combined crash-rating rollup for the /safety page — online-only, like fuelStatsQuery.
export function safetyStatsQuery() {
  return queryOptions({
    queryKey: ['safety-stats'],
    queryFn: getSafetyStats,
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

// Advanced-search body autocomplete — raw registry body values ranked by distinctPlates.
export function bodySuggestionsQuery(q: string) {
  return queryOptions({ queryKey: ['search', 'bodies', q], queryFn: () => suggestBodies(q) })
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
      filters.body,
      filters.region,
      filters.page,
      filters.pageSize
    ],
    queryFn: () => searchVehicles(filters)
  })
}

// Sketchfab 3D models of a brand/model — persisted reference data (pnpm ingest:sketchfab), changes only on a re-crawl.
export function models3dQuery(brand: string, model: string) {
  return queryOptions({
    queryKey: ['models3d', brand, model],
    queryFn: () => getModels3d(brand, model),
    staleTime: Infinity
  })
}

// CarShow360 360° galleries of a brand/model — persisted reference data (pnpm ingest:carshow360), changes only on a re-crawl.
export function models360Query(brand: string, model: string) {
  return queryOptions({
    queryKey: ['models360', brand, model],
    queryFn: () => getModels360(brand, model),
    staleTime: Infinity
  })
}

// infocar.ua catalog links (test drives + owner reviews) for a brand/model/year — persisted reference data
// (pnpm ingest:infocar), changes only on a re-crawl.
export function reviewsQuery(brand: string, model: string, year: number | null) {
  return queryOptions({
    queryKey: ['reviews', brand, model, year],
    queryFn: () => getReviews(brand, model, year),
    staleTime: Infinity
  })
}

// Auto-news changes hourly (pnpm ingest:news) — a short staleTime, and deliberately outside the persisted offline groups.
export function newsQuery(brand?: string, model?: string | null, year?: number | null, lang?: 'uk') {
  return queryOptions({
    queryKey: ['news', brand ?? null, model ?? null, year ?? null, lang ?? null],
    queryFn: () => getNews(brand, model, year, lang),
    staleTime: 10 * 60 * 1000
  })
}

// Channel uploads change a few times a day (pnpm ingest:social) — live data only, outside the persisted offline groups.
export function socialQuery(brand: string) {
  return queryOptions({
    queryKey: ['social', brand],
    queryFn: () => getSocial(brand),
    staleTime: 30 * 60 * 1000
  })
}

// Share prices move all day: live data only, outside the persisted offline groups.
export function stockQuery(brand: string, range: StockRange) {
  return queryOptions({
    queryKey: ['stock', brand, range],
    queryFn: () => getStock(brand, range),
    staleTime: 5 * 60 * 1000
  })
}

// The /news archive page: live data only (never in the persisted offline cache, never prefetched).
export function newsPageQuery(opts: {
  page: number
  sources: string[]
  q: string
  order: 'asc' | 'desc'
  lang?: 'uk'
}) {
  return queryOptions({
    queryKey: ['news-page', opts.page, [...opts.sources].sort(), opts.q, opts.order, opts.lang ?? null],
    queryFn: () => getNewsPage({ ...opts, pageSize: NEWS_PAGE_SIZE }),
    staleTime: 10 * 60 * 1000,
    placeholderData: previous => previous
  })
}

// Account state — first keys 'auth' / 'account' / 'admin' are not offline groups, so none of it is ever persisted.
export function authConfigQuery() {
  return queryOptions({ queryKey: ['auth', 'config'], queryFn: getAuthConfig, staleTime: Infinity })
}

export function sessionQuery() {
  return queryOptions({ queryKey: ['auth', 'session'], queryFn: getSession, staleTime: 5 * 60_000, retry: false })
}

export function featuresQuery() {
  return queryOptions({ queryKey: ['account', 'features'], queryFn: getFeatures, staleTime: 5 * 60_000 })
}

export function adminUsersQuery() {
  return queryOptions({ queryKey: ['admin', 'users'], queryFn: getAdminUsers })
}

export function adminStatsQuery() {
  return queryOptions({ queryKey: ['admin', 'stats'], queryFn: getAdminStats, staleTime: 60_000 })
}

export function adminAnalyticsQuery() {
  return queryOptions({ queryKey: ['admin', 'analytics'], queryFn: getAdminAnalytics, staleTime: 5 * 60_000 })
}
