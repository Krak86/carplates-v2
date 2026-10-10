import {
  adminAnalyticsResponseSchema,
  adminStatsResponseSchema,
  adminUsersResponseSchema,
  authConfigResponseSchema,
  featuresResponseSchema,
  sessionResponseSchema,
  settingsResponseSchema,
  syncResponseSchema,
  bodySuggestionsResponseSchema,
  brandSuggestionsResponseSchema,
  cardBundleResponseSchema,
  cncapRatingsResponseSchema,
  dataVersionResponseSchema,
  euroNcapRatingsResponseSchema,
  fuelEconomyResponseSchema,
  fxResponseSchema,
  nhtsaComplaintsResponseSchema,
  nhtsaRecallsResponseSchema,
  openEvResponseSchema,
  rdwRecallsResponseSchema,
  rdwResponseSchema,
  vdbResponseSchema,
  vdbStatsResponseSchema,
  fuelStatsResponseSchema,
  safetyStatsResponseSchema,
  iihsRatingsResponseSchema,
  jncapRatingsResponseSchema,
  models3dResponseSchema,
  models360ResponseSchema,
  kncapRatingsResponseSchema,
  modelSuggestionsResponseSchema,
  plateHistoryResponseSchema,
  plateLookupResponseSchema,
  plateRecognizeResponseSchema,
  vinRecognizeResponseSchema,
  newsResponseSchema,
  newsPageResponseSchema,
  socialResponseSchema,
  stockResponseSchema,
  reviewsResponseSchema,
  safetyRatingsResponseSchema,
  searchResponseSchema,
  statsFieldResponseSchema,
  statsResponseSchema,
  statsTopResponseSchema,
  vehiclePhotosResponseSchema,
  vinDecodeResponseSchema,
  wikiImageResponseSchema,
  wikiInfoResponseSchema
} from '@carplates/shared'
import type {
  AdminAnalyticsResponse,
  AdminStatsResponse,
  AdminUsersResponse,
  AuthConfigResponse,
  FeaturesResponse,
  FeaturesUpdateRequest,
  SessionResponse,
  SettingsResponse,
  SettingsUpdateRequest,
  SyncRequest,
  SyncResponse,
  BodySuggestionsResponse,
  BrandSuggestionsResponse,
  CardBundleResponse,
  CncapRatingsResponse,
  EuroNcapRatingsResponse,
  FuelEconomyResponse,
  FxResponse,
  NhtsaComplaintsResponse,
  NhtsaRecallsResponse,
  OpenEvResponse,
  RdwRecallsResponse,
  RdwResponse,
  VdbResponse,
  VdbStatsResponse,
  VdbVehicleClass,
  Models3dResponse,
  Models360Response,
  NewsPageResponse,
  NewsResponse,
  SocialResponse,
  StockRange,
  StockResponse,
  ReviewsResponse,
  FuelStatsResponse,
  SafetyStatsResponse,
  IihsRatingsResponse,
  JncapRatingsResponse,
  KncapRatingsResponse,
  ModelSuggestionsResponse,
  PlateHistoryResponse,
  PlateLookupResponse,
  PlateRecognizeResponse,
  VinRecognizeResponse,
  SafetyRatingsResponse,
  SearchResponse,
  StatsFieldDimension,
  StatsFieldResponse,
  StatsResponse,
  StatsTopResponse,
  VehicleColor,
  VehicleFuel,
  VehicleKind,
  VehiclePhotosResponse,
  VinDecodeResponse,
  WikiImageResponse,
  WikiInfo
} from '@carplates/shared'
import type { Feature, FeatureCollection, Geometry } from 'geojson'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export type UkraineRegionProperties = { shapeISO: string; shapeName: string }
export type UkraineRegionFeature = Feature<Geometry, UkraineRegionProperties>
export type UkraineGeography = FeatureCollection<Geometry, UkraineRegionProperties>

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function unwrap(res: Response): Promise<unknown> {
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText
    throw new ApiError(res.status, message)
  }
  return body
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  return unwrap(await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' }, signal }))
}

/** Account calls carry the httpOnly session cookie even when VITE_API_BASE points at another origin. */
async function sendJson(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<unknown> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (body !== undefined) headers['content-type'] = 'application/json'
  return unwrap(
    await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  )
}

export async function lookupPlate(plate: string): Promise<PlateLookupResponse> {
  return plateLookupResponseSchema.parse(await getJson(`/api/plate/${encodeURIComponent(plate)}`))
}

/** The above-the-fold reference data of a plate's card in one answer (see `cardBundleResponseSchema`); asked alongside the plate lookup. */
export async function getCardBundle(plate: string, signal?: AbortSignal): Promise<CardBundleResponse> {
  return cardBundleResponseSchema.parse(await getJson(`/api/card/${encodeURIComponent(plate)}`, signal))
}

export async function plateHistory(plate: string): Promise<PlateHistoryResponse> {
  return plateHistoryResponseSchema.parse(await getJson(`/api/plate/${encodeURIComponent(plate)}/history`))
}

export async function decodeVin(vin: string): Promise<VinDecodeResponse> {
  return vinDecodeResponseSchema.parse(await getJson(`/api/vin/${encodeURIComponent(vin)}`))
}

export async function getStats(): Promise<StatsResponse> {
  return statsResponseSchema.parse(await getJson('/api/stats'))
}

export async function getStatsTop(): Promise<StatsTopResponse> {
  return statsTopResponseSchema.parse(await getJson('/api/stats/top'))
}

export async function getStatsField(dimension: StatsFieldDimension): Promise<StatsFieldResponse> {
  return statsFieldResponseSchema.parse(await getJson(`/api/stats/field/${dimension}`))
}

export async function getDataVersion(): Promise<string> {
  return dataVersionResponseSchema.parse(await getJson('/api/stats/version')).dataVersion
}

export async function getVehiclePhotos(
  brand: string,
  model: string,
  year: number | null
): Promise<VehiclePhotosResponse> {
  const params = new URLSearchParams()
  if (brand) params.set('brand', brand)
  if (model) params.set('model', model)
  if (year != null) params.set('year', String(year))
  return vehiclePhotosResponseSchema.parse(await getJson(`/api/photos?${params.toString()}`))
}

export async function getWikiImage(
  brand: string,
  model: string,
  year: number | null,
  yearOnly = false,
  yearBack = 0
): Promise<WikiImageResponse> {
  const params = new URLSearchParams()
  if (yearOnly) params.set('yearOnly', 'true')
  if (yearOnly && yearBack) params.set('yearBack', String(yearBack))
  if (brand) params.set('brand', brand)
  if (model) params.set('model', model)
  if (year != null) params.set('year', String(year))
  return wikiImageResponseSchema.parse(await getJson(`/api/wiki/image?${params.toString()}`))
}

export async function getWikiInfo(brand: string, model: string, lang: string, year: number | null): Promise<WikiInfo> {
  const params = new URLSearchParams({ lang })
  if (brand) params.set('brand', brand)
  if (model) params.set('model', model)
  if (year != null) params.set('year', String(year))
  return wikiInfoResponseSchema.parse(await getJson(`/api/wiki?${params.toString()}`))
}

export async function getSafetyRatings(make: string, model: string, year: number): Promise<SafetyRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return safetyRatingsResponseSchema.parse(await getJson(`/api/safety?${params.toString()}`))
}

// Persisted (scraped), not proxied live — see apps/api/src/safety/euroncap.service.ts.
export async function getEuroNcapRatings(make: string, model: string, year: number): Promise<EuroNcapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return euroNcapRatingsResponseSchema.parse(await getJson(`/api/safety/euroncap?${params.toString()}`))
}

// Persisted (scraped), not proxied live — see apps/api/src/safety/jncap.service.ts.
export async function getJncapRatings(make: string, model: string, year: number): Promise<JncapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return jncapRatingsResponseSchema.parse(await getJson(`/api/safety/jncap?${params.toString()}`))
}

// Persisted (scraped), not proxied live — see apps/api/src/safety/cncap.service.ts.
export async function getCncapRatings(make: string, model: string, year: number): Promise<CncapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return cncapRatingsResponseSchema.parse(await getJson(`/api/safety/cncap?${params.toString()}`))
}

export async function getKncapRatings(make: string, model: string, year: number): Promise<KncapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return kncapRatingsResponseSchema.parse(await getJson(`/api/safety/kncap?${params.toString()}`))
}

export async function getIihsRatings(make: string, model: string, year: number): Promise<IihsRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return iihsRatingsResponseSchema.parse(await getJson(`/api/safety/iihs?${params.toString()}`))
}

export async function getVdb(brand: string, model: string, kind?: string | null): Promise<VdbResponse> {
  const params = new URLSearchParams({ brand, model })
  if (kind) params.set('kind', kind)
  return vdbResponseSchema.parse(await getJson(`/api/vdb?${params.toString()}`))
}

export async function getRdw(brand: string, model: string, year: number, kind?: string | null): Promise<RdwResponse> {
  const params = new URLSearchParams({ brand, model, year: String(year) })
  if (kind) params.set('kind', kind)
  return rdwResponseSchema.parse(await getJson(`/api/rdw?${params.toString()}`))
}

export async function getRdwRecalls(brand: string, model: string): Promise<RdwRecallsResponse> {
  const params = new URLSearchParams({ brand, model })
  return rdwRecallsResponseSchema.parse(await getJson(`/api/rdw/recalls?${params.toString()}`))
}

export async function getNhtsaRecalls(make: string, model: string, year: number): Promise<NhtsaRecallsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return nhtsaRecallsResponseSchema.parse(await getJson(`/api/nhtsa/recalls?${params.toString()}`))
}

export async function getNhtsaComplaints(make: string, model: string, year: number): Promise<NhtsaComplaintsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return nhtsaComplaintsResponseSchema.parse(await getJson(`/api/nhtsa/complaints?${params.toString()}`))
}

export async function getOpenEv(brand: string, model: string): Promise<OpenEvResponse> {
  const params = new URLSearchParams({ brand, model })
  return openEvResponseSchema.parse(await getJson(`/api/ev?${params.toString()}`))
}

export async function getFx(): Promise<FxResponse> {
  return fxResponseSchema.parse(await getJson('/api/fx'))
}

export async function getVdbStats(kind: VdbVehicleClass = 'car'): Promise<VdbStatsResponse> {
  return vdbStatsResponseSchema.parse(await getJson(`/api/vdb/stats?kind=${kind}`))
}

export type FuelEconomyParams = {
  make: string
  model: string
  year: number
  fuel?: string | null
  capacity?: number | null
}

export async function getFuelEconomy({
  make,
  model,
  year,
  fuel,
  capacity
}: FuelEconomyParams): Promise<FuelEconomyResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  if (fuel) params.set('fuel', fuel)
  if (capacity) params.set('capacity', String(capacity))
  return fuelEconomyResponseSchema.parse(await getJson(`/api/fuel?${params.toString()}`))
}

export async function getSafetyStats(): Promise<SafetyStatsResponse> {
  return safetyStatsResponseSchema.parse(await getJson('/api/safety/stats'))
}

export async function getFuelStats(): Promise<FuelStatsResponse> {
  return fuelStatsResponseSchema.parse(await getJson('/api/fuel/stats'))
}

// Our own transcode-and-cache proxy (the source .wmv can't play in any modern browser).
export function safetyVideoUrl(nhtsaVideoUrl: string): string {
  return `${BASE}/api/safety/video?${new URLSearchParams({ url: nhtsaVideoUrl }).toString()}`
}

export async function suggestBodies(q: string): Promise<BodySuggestionsResponse> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  return bodySuggestionsResponseSchema.parse(await getJson(`/api/search/bodies?${params.toString()}`))
}

export async function suggestBrands(q: string): Promise<BrandSuggestionsResponse> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  return brandSuggestionsResponseSchema.parse(await getJson(`/api/search/brands?${params.toString()}`))
}

export async function suggestModels(brand: string | undefined, q: string): Promise<ModelSuggestionsResponse> {
  const params = new URLSearchParams()
  if (brand) params.set('brand', brand)
  if (q) params.set('q', q)
  return modelSuggestionsResponseSchema.parse(await getJson(`/api/search/models?${params.toString()}`))
}

export type VehicleSearchFilters = {
  brand?: string
  model?: string
  yearFrom?: number
  yearTo?: number
  fuel?: VehicleFuel
  color?: VehicleColor
  kind?: VehicleKind
  body?: string
  region?: string
  page: number
  pageSize: number
}

export async function searchVehicles(filters: VehicleSearchFilters): Promise<SearchResponse> {
  const params = new URLSearchParams()
  if (filters.brand) params.set('brand', filters.brand)
  if (filters.model) params.set('model', filters.model)
  if (filters.yearFrom != null) params.set('yearFrom', String(filters.yearFrom))
  if (filters.yearTo != null) params.set('yearTo', String(filters.yearTo))
  if (filters.fuel) params.set('fuel', filters.fuel)
  if (filters.color) params.set('color', filters.color)
  if (filters.kind) params.set('kind', filters.kind)
  if (filters.body) params.set('body', filters.body)
  if (filters.region) params.set('region', filters.region)
  params.set('page', String(filters.page))
  params.set('pageSize', String(filters.pageSize))
  return searchResponseSchema.parse(await getJson(`/api/search?${params.toString()}`))
}

// Bundled static asset (apps/web/public/), not an /api/* response — no BASE
// prefix, no Zod (it's our own build artifact, not user-facing API contract).
export async function getUkraineGeography(): Promise<UkraineGeography> {
  const res = await fetch('/ukraine-adm1.geojson', { headers: { accept: 'application/geo+json' } })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return res.json() as Promise<UkraineGeography>
}

/**
 * Uses only the self-hosted, free own-model recognizer (services/alpr). There
 * is deliberately no fallback to the metered Plate Recognizer cloud API — if
 * the local container is down the call fails. The `/cloud` API route still
 * exists but nothing in the web app calls it. See PLAN.md's "Own ALPR model"
 * section.
 */
export async function recognizePlate(file: File): Promise<PlateRecognizeResponse> {
  const form = new FormData()
  form.append('image', file)

  const res = await fetch(`${BASE}/api/recognize/plate/local`, {
    method: 'POST',
    body: form,
    headers: { accept: 'application/json' }
  })
  return plateRecognizeResponseSchema.parse(await unwrap(res))
}

export async function recognizeVin(file: File): Promise<VinRecognizeResponse> {
  const form = new FormData()
  form.append('image', file)

  const res = await fetch(`${BASE}/api/recognize/vin`, {
    method: 'POST',
    body: form,
    headers: { accept: 'application/json' }
  })
  return vinRecognizeResponseSchema.parse(await unwrap(res))
}

export async function getModels3d(brand: string, model: string): Promise<Models3dResponse> {
  const params = new URLSearchParams({ brand, model })
  return models3dResponseSchema.parse(await getJson(`/api/models3d?${params.toString()}`))
}

export async function getModels360(brand: string, model: string): Promise<Models360Response> {
  const params = new URLSearchParams({ brand, model })
  return models360ResponseSchema.parse(await getJson(`/api/models360?${params.toString()}`))
}

export async function getReviews(brand: string, model: string, year: number | null): Promise<ReviewsResponse> {
  const params = new URLSearchParams({ brand })
  if (model) params.set('model', model)
  if (year != null) params.set('year', String(year))
  return reviewsResponseSchema.parse(await getJson(`/api/reviews?${params.toString()}`))
}

/** Auto-news (persisted RSS headlines): a car's model/brand news, or — without a brand — the latest overall. */
export async function getNews(
  brand?: string,
  model?: string | null,
  year?: number | null,
  lang?: 'uk'
): Promise<NewsResponse> {
  const params = new URLSearchParams()
  if (brand) params.set('brand', brand)
  if (brand && model) params.set('model', model)
  if (brand && year != null) params.set('year', String(year))
  if (lang) params.set('lang', lang)
  return newsResponseSchema.parse(await getJson(`/api/news?${params.toString()}`))
}

/** Brand / parent-group YouTube channel uploads (persisted by pnpm ingest:social) for a car's brand; empty when the brand has no channel. */
export async function getSocial(brand: string): Promise<SocialResponse> {
  return socialResponseSchema.parse(await getJson(`/api/social?brand=${encodeURIComponent(brand)}`))
}

/** Price series of the listed company behind a car's brand (live, proxied); `company: null` when the brand has no listing. */
export async function getStock(brand: string, range: StockRange): Promise<StockResponse> {
  return stockResponseSchema.parse(await getJson(`/api/stocks?brand=${encodeURIComponent(brand)}&range=${range}`))
}

/** One page of the /news archive, optionally narrowed to some source ids. */
export async function getNewsPage(opts: {
  page: number
  pageSize: number
  sources: string[]
  q: string
  order: 'asc' | 'desc'
  lang?: 'uk'
}): Promise<NewsPageResponse> {
  const { page, pageSize, sources, q, order, lang } = opts
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), order })
  if (q) params.set('q', q)
  if (sources.length) params.set('source', sources.join(','))
  if (lang) params.set('lang', lang)
  return newsPageResponseSchema.parse(await getJson(`/api/news/list?${params.toString()}`))
}

export async function getAuthConfig(): Promise<AuthConfigResponse> {
  return authConfigResponseSchema.parse(await getJson('/api/auth/config'))
}

export async function getSession(): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('GET', '/api/auth/me'))
}

/** Exchanges the Google Identity Services credential (an ID token) for our own session cookie. */
export async function signInWithGoogle(credential: string): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('POST', '/api/auth/google', { credential }))
}

export async function signOut(): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('POST', '/api/auth/logout'))
}

export async function deleteAccount(): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('DELETE', '/api/auth/me'))
}

export async function getFeatures(): Promise<FeaturesResponse> {
  return featuresResponseSchema.parse(await sendJson('GET', '/api/features'))
}

export async function saveFeatures(request: FeaturesUpdateRequest): Promise<FeaturesResponse> {
  return featuresResponseSchema.parse(await sendJson('PUT', '/api/features', request))
}

export async function getAdminUsers(): Promise<AdminUsersResponse> {
  return adminUsersResponseSchema.parse(await sendJson('GET', '/api/admin/users'))
}

export async function getAdminStats(): Promise<AdminStatsResponse> {
  return adminStatsResponseSchema.parse(await sendJson('GET', '/api/admin/stats'))
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  return adminAnalyticsResponseSchema.parse(await sendJson('GET', '/api/admin/analytics'))
}

/** Pushes this device's favorites/history (tombstones included) and returns the merged server state. */
export async function syncSaved(request: SyncRequest): Promise<SyncResponse> {
  return syncResponseSchema.parse(await sendJson('POST', '/api/sync', request))
}

export async function getSettings(): Promise<SettingsResponse> {
  return settingsResponseSchema.parse(await sendJson('GET', '/api/settings'))
}

/** Saves the settings document if it is newer than the server's; returns whichever document is now current. */
export async function putSettings(request: SettingsUpdateRequest): Promise<SettingsResponse> {
  return settingsResponseSchema.parse(await sendJson('PUT', '/api/settings', request))
}
