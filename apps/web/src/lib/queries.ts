import { queryOptions } from '@tanstack/react-query'
import { normalizePlate } from '@carplates/shared'

import {
  decodeVin,
  getCncapRatings,
  getEuroNcapRatings,
  getIihsRatings,
  getJncapRatings,
  getKncapRatings,
  getSafetyRatings,
  getStats,
  getUkraineGeography,
  getVehiclePhotos,
  lookupPlate,
  plateHistory
} from '@/lib/api'
import { isFavorited, listFavorites } from '@/lib/favorites-db'
import type { FavoriteKind } from '@/lib/favorites-db'
import { listVisits } from '@/lib/history-db'

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

export function historyQuery() {
  return queryOptions({ queryKey: ['history'], queryFn: listVisits })
}

export function favoritesQuery() {
  return queryOptions({ queryKey: ['favorites'], queryFn: listFavorites })
}

export function favoriteQuery(kind: FavoriteKind, value: string) {
  return queryOptions({ queryKey: ['favorite', kind, value], queryFn: () => isFavorited(kind, value) })
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

// Static build asset, never changes at runtime.
export function ukraineGeographyQuery() {
  return queryOptions({ queryKey: ['ukraine-geography'], queryFn: getUkraineGeography, staleTime: Infinity })
}
