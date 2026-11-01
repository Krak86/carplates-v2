import {
  catalogLookupSchema,
  catalogMakeSchema,
  catalogMakesSchema,
  catalogModelSchema,
  catalogYearStatsSchema,
  adminAnalyticsResponseSchema,
  adminLinksResponseSchema,
  adminServerResponseSchema,
  adminStatsResponseSchema,
  adminDigestStatusSchema,
  adminDigestTestResponseSchema,
  adminUsersResponseSchema,
  authConfigResponseSchema,
  contactConfigSchema,
  REAUTH_REQUIRED,
  emailStartResponseSchema,
  reauthResponseSchema,
  sessionsResponseSchema,
  signInMethodsResponseSchema,
  featuresResponseSchema,
  sessionResponseSchema,
  settingsResponseSchema,
  syncResponseSchema,
  bodySuggestionsResponseSchema,
  operSuggestionsResponseSchema,
  brandSuggestionsResponseSchema,
  cardBundleResponseSchema,
  cncapRatingsResponseSchema,
  dataStatusResponseSchema,
  dataVersionResponseSchema,
  euroNcapRatingsResponseSchema,
  fuelEconomyResponseSchema,
  fxResponseSchema,
  caRecallsResponseSchema,
  auctionResponseSchema,
  auctionListResponseSchema,
  auctionStatsResponseSchema,
  wantedResponseSchema,
  wantedStatsResponseSchema,
  generationGrowthResponseSchema,
  generationsResponseSchema,
  wikiSpecsResponseSchema,
  nhtsaComplaintsResponseSchema,
  nhtsaRecallsResponseSchema,
  motResponseSchema,
  openEvResponseSchema,
  rdwRecallsResponseSchema,
  rdwResponseSchema,
  originResponseSchema,
  vdbResponseSchema,
  vdbStatsResponseSchema,
  fuelStatsResponseSchema,
  powertrainStatsResponseSchema,
  safetyStatsResponseSchema,
  roadSafetyCausesResponseSchema,
  roadSafetyHazardsResponseSchema,
  roadSafetyRegionsResponseSchema,
  roadSafetyRoadsResponseSchema,
  roadSafetyTimeResponseSchema,
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
  newsFeedResponseSchema,
  newsFeedPageResponseSchema,
  socialResponseSchema,
  stockResponseSchema,
  stockQuoteResponseSchema,
  stockNewsResponseSchema,
  reviewsResponseSchema,
  safetyRatingsResponseSchema,
  searchResponseSchema,
  statsFieldResponseSchema,
  statsResponseSchema,
  statsTopResponseSchema,
  distributionResponseSchema,
  evStatsResponseSchema,
  importsStatsResponseSchema,
  originStatsResponseSchema,
  regionBrandStatsResponseSchema,
  regionFacetStatsResponseSchema,
  brandStatsResponseSchema,
  sizeModelsResponseSchema,
  vehiclePhotosResponseSchema,
  vinDecodeResponseSchema,
  wikiImageResponseSchema,
  wikiInfoResponseSchema
} from '@carplates/shared'
import type {
  CatalogLookup,
  CatalogMake,
  CatalogMakes,
  CatalogModel,
  CatalogYearStats,
  AdminAnalyticsResponse,
  AdminLinksResponse,
  AdminServerResponse,
  AdminStatsResponse,
  AdminDigestStatus,
  AdminUsersResponse,
  AuthConfigResponse,
  ContactConfig,
  ContactRequest,
  ContactStartRequest,
  FeaturesResponse,
  FeaturesUpdateRequest,
  SessionResponse,
  SettingsResponse,
  SettingsUpdateRequest,
  SyncRequest,
  SyncResponse,
  TelegramSignInRequest,
  EmailLinkVerifyRequest,
  EmailStartRequest,
  EmailStartResponse,
  EmailVerifyRequest,
  LinkableProvider,
  ReauthEmailStartRequest,
  ReauthResponse,
  SessionsResponse,
  SetEmailStartRequest,
  SignInMethodsResponse,
  BodySuggestionsResponse,
  OperSuggestionsResponse,
  BrandSuggestionsResponse,
  CardBundleResponse,
  CncapRatingsResponse,
  EuroNcapRatingsResponse,
  FuelEconomyResponse,
  FxResponse,
  CaRecallsResponse,
  AuctionResponse,
  AuctionListQuery,
  AuctionListResponse,
  AuctionStatsResponse,
  WantedResponse,
  WantedStatsResponse,
  GenerationGrowthResponse,
  GenerationsResponse,
  WikiSpecsResponse,
  NhtsaComplaintsResponse,
  NhtsaRecallsResponse,
  MotFuelHint,
  MotResponse,
  OpenEvResponse,
  RdwRecallsResponse,
  RdwResponse,
  OriginResponse,
  VdbResponse,
  VdbStatsResponse,
  VdbVehicleClass,
  Models3dResponse,
  Models360Response,
  NewsFeedPageResponse,
  NewsFeedResponse,
  SocialResponse,
  StockNewsResponse,
  StockRange,
  StockQuoteResponse,
  StockResponse,
  ReviewsResponse,
  FuelStatsResponse,
  PowertrainStatsResponse,
  SafetyStatsResponse,
  RoadSafetyCausesResponse,
  RoadSafetyHazardsResponse,
  RoadSafetyRegionsResponse,
  RoadSafetyRoadsResponse,
  RoadSafetyTimeResponse,
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
  DataStatusResponse,
  StatsTopResponse,
  DistributionResponse,
  EvStatsResponse,
  ImportsStatsResponse,
  OriginStatsResponse,
  RegionBrandStatsResponse,
  RegionFacetStatsResponse,
  BrandStatsResponse,
  SizeModelsResponse,
  VehicleColor,
  SearchSortDir,
  SearchSortKey,
  VehicleFuel,
  VehicleKind,
  VehiclePurpose,
  VehiclePhotosResponse,
  VinDecodeResponse,
  WikiImageResponse,
  WikiInfo
} from '@carplates/shared'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { z } from 'zod'

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

/** The reverse proxy's answer while the API is restarting or in planned maintenance (infra/Caddyfile `handle_errors`). */
const maintenanceBodySchema = z.object({
  status: z.literal('maintenance'),
  retryAfter: z.number().positive().optional()
})

export class MaintenanceError extends ApiError {
  constructor(readonly retryAfterSeconds: number | undefined) {
    super(503, 'maintenance')
    this.name = 'MaintenanceError'
  }
}

async function unwrap(res: Response): Promise<unknown> {
  const body: unknown = await res.json().catch(() => null)
  if (res.status === 503) {
    const maintenance = maintenanceBodySchema.safeParse(body)
    if (maintenance.success) throw new MaintenanceError(maintenance.data.retryAfter)
  }
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

export async function getDataStatus(): Promise<DataStatusResponse> {
  return dataStatusResponseSchema.parse(await getJson('/api/data-status'))
}

export async function getStats(): Promise<StatsResponse> {
  return statsResponseSchema.parse(await getJson('/api/stats'))
}

export async function getStatsDistribution(): Promise<DistributionResponse> {
  return distributionResponseSchema.parse(await getJson('/api/stats/distribution'))
}

export async function getSizeModels(): Promise<SizeModelsResponse> {
  return sizeModelsResponseSchema.parse(await getJson('/api/stats/size-models'))
}

export async function getRegionBrandStats(): Promise<RegionBrandStatsResponse> {
  return regionBrandStatsResponseSchema.parse(await getJson('/api/stats/region-brands'))
}

export async function getBrandStats(): Promise<BrandStatsResponse> {
  return brandStatsResponseSchema.parse(await getJson('/api/stats/brands'))
}

export async function getRegionFacetStats(): Promise<RegionFacetStatsResponse> {
  return regionFacetStatsResponseSchema.parse(await getJson('/api/stats/region-facets'))
}

export async function getEvStats(): Promise<EvStatsResponse> {
  return evStatsResponseSchema.parse(await getJson('/api/stats/ev'))
}

export async function getImportsStats(): Promise<ImportsStatsResponse> {
  return importsStatsResponseSchema.parse(await getJson('/api/stats/imports'))
}

export async function getOriginStats(): Promise<OriginStatsResponse> {
  return originStatsResponseSchema.parse(await getJson('/api/stats/origin'))
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
  yearBack = 0,
  refresh = false
): Promise<WikiImageResponse> {
  const params = new URLSearchParams()
  if (refresh) params.set('refresh', 'true')
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

export type OriginParams = {
  brand: string
  model?: string | null
  year?: number | null
  vin?: string | null
  /** ISO 3166-1 alpha-2 of the NHTSA plant country. */
  plantCountry?: string | null
  plantCity?: string | null
}

export async function getOrigin(p: OriginParams): Promise<OriginResponse> {
  const params = new URLSearchParams({ brand: p.brand })
  if (p.model) params.set('model', p.model)
  if (p.year) params.set('year', String(p.year))
  if (p.vin) params.set('vin', p.vin)
  if (p.plantCountry) params.set('plantCountry', p.plantCountry)
  if (p.plantCity) params.set('plantCity', p.plantCity)
  return originResponseSchema.parse(await getJson(`/api/origin?${params.toString()}`))
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

export async function getCaRecalls(brand: string, model: string, year: number): Promise<CaRecallsResponse> {
  const params = new URLSearchParams({ brand, model, year: String(year) })
  return caRecallsResponseSchema.parse(await getJson(`/api/ca/recalls?${params.toString()}`))
}

export async function getGenerations(brand: string, model: string, year: number): Promise<GenerationsResponse> {
  const params = new URLSearchParams({ brand, model, year: String(year) })
  return generationsResponseSchema.parse(await getJson(`/api/generations?${params.toString()}`))
}

export async function getGenerationGrowth(brand: string, model: string): Promise<GenerationGrowthResponse> {
  const params = new URLSearchParams({ brand, model })
  return generationGrowthResponseSchema.parse(await getJson(`/api/generations/growth?${params.toString()}`))
}

export async function getWikiSpecs(brand: string, model: string, year: number): Promise<WikiSpecsResponse> {
  const params = new URLSearchParams({ brand, model, year: String(year) })
  return wikiSpecsResponseSchema.parse(await getJson(`/api/wikispecs?${params.toString()}`))
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

export async function getMot(
  brand: string,
  model: string,
  year: number,
  kind?: string | null,
  fuel?: MotFuelHint
): Promise<MotResponse> {
  const params = new URLSearchParams({ brand, model, year: String(year) })
  if (kind) params.set('kind', kind)
  if (fuel) params.set('fuel', fuel)
  return motResponseSchema.parse(await getJson(`/api/mot?${params.toString()}`))
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

/** The catalog page (if any) a brand + model belongs to: `page` is null when there is none, so a card links only to real pages. */
export async function getCatalogLookup(brand: string, model: string): Promise<CatalogLookup> {
  return catalogLookupSchema.parse(await getJson(`/api/catalog/lookup?${new URLSearchParams({ brand, model })}`))
}

/** Every make with its car count (`/cars`). */
export async function getCatalogMakes(): Promise<CatalogMakes> {
  return catalogMakesSchema.parse(await getJson('/api/catalog/makes'))
}

/** One make and its model pages (`/cars/:make`). A 404 means there is no such page. */
export async function getCatalogMake(make: string): Promise<CatalogMake> {
  return catalogMakeSchema.parse(await getJson(`/api/catalog/${encodeURIComponent(make)}`))
}

/** Registry rollup of one catalog model (`/cars/:make/:model`). A 404 means there is no such page. */
export async function getCatalogModel(make: string, model: string): Promise<CatalogModel> {
  return catalogModelSchema.parse(
    await getJson(`/api/catalog/${encodeURIComponent(make)}/${encodeURIComponent(model)}`)
  )
}

/** Per make year breakdown of one catalog model (the generation stats). Empty `byYear` until the catalog is rebuilt. */
export async function getCatalogYears(make: string, model: string): Promise<CatalogYearStats> {
  return catalogYearStatsSchema.parse(
    await getJson(`/api/catalog/${encodeURIComponent(make)}/${encodeURIComponent(model)}/years`)
  )
}

export async function getSafetyStats(): Promise<SafetyStatsResponse> {
  return safetyStatsResponseSchema.parse(await getJson('/api/safety/stats'))
}

const yearSuffix = (year?: number): string => (year === undefined ? '' : `?year=${year}`)

export async function getRoadSafetyRegions(year?: number): Promise<RoadSafetyRegionsResponse> {
  return roadSafetyRegionsResponseSchema.parse(await getJson(`/api/road-safety/regions${yearSuffix(year)}`))
}

export async function getRoadSafetyRoads(year?: number): Promise<RoadSafetyRoadsResponse> {
  const params = new URLSearchParams({ limit: '15' })
  if (year !== undefined) params.set('year', String(year))
  return roadSafetyRoadsResponseSchema.parse(await getJson(`/api/road-safety/roads?${params.toString()}`))
}

export async function getRoadSafetyCauses(year?: number): Promise<RoadSafetyCausesResponse> {
  return roadSafetyCausesResponseSchema.parse(await getJson(`/api/road-safety/causes${yearSuffix(year)}`))
}

export async function getRoadSafetyTime(year?: number): Promise<RoadSafetyTimeResponse> {
  return roadSafetyTimeResponseSchema.parse(await getJson(`/api/road-safety/time${yearSuffix(year)}`))
}

export async function getRoadSafetyHazards(opts: {
  year?: number
  region?: string
  kind?: string
}): Promise<RoadSafetyHazardsResponse> {
  const params = new URLSearchParams()
  if (opts.year !== undefined) params.set('year', String(opts.year))
  if (opts.region) params.set('region', opts.region)
  if (opts.kind) params.set('kind', opts.kind)
  const qs = params.toString()
  return roadSafetyHazardsResponseSchema.parse(await getJson(`/api/road-safety/hazards${qs ? `?${qs}` : ''}`))
}

export async function getFuelStats(): Promise<FuelStatsResponse> {
  return fuelStatsResponseSchema.parse(await getJson('/api/fuel/stats'))
}

export async function getPowertrainStats(): Promise<PowertrainStatsResponse> {
  return powertrainStatsResponseSchema.parse(await getJson('/api/fuel/powertrains'))
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

export async function getOperations(): Promise<OperSuggestionsResponse> {
  return operSuggestionsResponseSchema.parse(await getJson('/api/search/operations'))
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
  purpose?: VehiclePurpose
  body?: string
  region?: string
  oper?: number
  sort?: SearchSortKey
  dir?: SearchSortDir
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
  if (filters.purpose) params.set('purpose', filters.purpose)
  if (filters.body) params.set('body', filters.body)
  if (filters.region) params.set('region', filters.region)
  if (filters.oper != null) params.set('oper', String(filters.oper))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.dir) params.set('dir', filters.dir)
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
export async function recognizePlate(file: File, signal?: AbortSignal): Promise<PlateRecognizeResponse> {
  const form = new FormData()
  form.append('image', file)

  const res = await fetch(`${BASE}/api/recognize/plate/local`, {
    method: 'POST',
    body: form,
    signal,
    headers: { accept: 'application/json' }
  })
  return plateRecognizeResponseSchema.parse(await unwrap(res))
}

export async function recognizeVin(file: File, signal?: AbortSignal): Promise<VinRecognizeResponse> {
  const form = new FormData()
  form.append('image', file)

  const res = await fetch(`${BASE}/api/recognize/vin`, {
    method: 'POST',
    body: form,
    signal,
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
): Promise<NewsFeedResponse> {
  const params = new URLSearchParams()
  if (brand) params.set('brand', brand)
  if (brand && model) params.set('model', model)
  if (brand && year != null) params.set('year', String(year))
  if (lang) params.set('lang', lang)
  return newsFeedResponseSchema.parse(await getJson(`/api/news?${params.toString()}`))
}

/** Brand / parent-group YouTube channel uploads (persisted by pnpm ingest:social) for a car's brand; empty when the brand has no channel. */
export async function getSocial(brand: string): Promise<SocialResponse> {
  return socialResponseSchema.parse(await getJson(`/api/social?brand=${encodeURIComponent(brand)}`))
}

/** Price series of the listed company behind a car's brand (live, proxied); `company: null` when the brand has no listing. */
export async function getStock(brand: string, range: StockRange): Promise<StockResponse> {
  return stockResponseSchema.parse(await getJson(`/api/stocks?brand=${encodeURIComponent(brand)}&range=${range}`))
}

/** One instrument (main listing, preferred, ADR, other venue) of the make's listed company, with the facts Yahoo reports. */
export async function getStockQuote(brand: string, symbol: string, range: StockRange): Promise<StockQuoteResponse> {
  const params = new URLSearchParams({ brand, symbol, range })
  return stockQuoteResponseSchema.parse(await getJson(`/api/stocks/quote?${params}`))
}

/** Yahoo Finance headlines of the listed company behind a car's brand (live, proxied); empty when the brand has no listing. */
export async function getStockNews(brand: string): Promise<StockNewsResponse> {
  return stockNewsResponseSchema.parse(await getJson(`/api/stocks/news?brand=${encodeURIComponent(brand)}`))
}

/** One page of the /news archive, optionally narrowed to some source ids. */
export async function getNewsPage(opts: {
  page: number
  pageSize: number
  sources: string[]
  q: string
  order: 'asc' | 'desc'
  lang?: 'uk'
}): Promise<NewsFeedPageResponse> {
  const { page, pageSize, sources, q, order, lang } = opts
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), order })
  if (q) params.set('q', q)
  if (sources.length) params.set('source', sources.join(','))
  if (lang) params.set('lang', lang)
  return newsFeedPageResponseSchema.parse(await getJson(`/api/news/list?${params.toString()}`))
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

/** Exchanges the Telegram Login Widget's signed user object for our own session cookie. */
export async function signInWithTelegram(payload: TelegramSignInRequest): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('POST', '/api/auth/telegram', payload))
}

/** Step 1 of email sign-in: mails a code + magic link. The answer is the same whether or not the address has an account. */
export async function startEmailSignIn(request: EmailStartRequest): Promise<EmailStartResponse> {
  return emailStartResponseSchema.parse(await sendJson('POST', '/api/auth/email/start', request))
}

export async function verifyEmailCode(request: EmailVerifyRequest): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('POST', '/api/auth/email/verify', request))
}

export async function verifyEmailLink(request: EmailLinkVerifyRequest): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('POST', '/api/auth/email/verify-link', request))
}

/** Thrown (as the 403 message) by sensitive endpoints when the session's last sign-in is too old. */
export function isReauthRequired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.message === REAUTH_REQUIRED
}

export async function getSignInMethods(): Promise<SignInMethodsResponse> {
  return signInMethodsResponseSchema.parse(await sendJson('GET', '/api/auth/methods'))
}

export async function getSessions(): Promise<SessionsResponse> {
  return sessionsResponseSchema.parse(await sendJson('GET', '/api/auth/sessions'))
}

export async function revokeSession(id: string): Promise<void> {
  await sendJson('DELETE', `/api/auth/sessions/${encodeURIComponent(id)}`)
}

export async function revokeOtherSessions(): Promise<void> {
  await sendJson('POST', '/api/auth/sessions/revoke-others')
}

export async function startReauthEmail(request: ReauthEmailStartRequest): Promise<EmailStartResponse> {
  return emailStartResponseSchema.parse(await sendJson('POST', '/api/auth/reauth/email/start', request))
}

export async function verifyReauthEmail(request: EmailVerifyRequest): Promise<ReauthResponse> {
  return reauthResponseSchema.parse(await sendJson('POST', '/api/auth/reauth/email/verify', request))
}

export async function reauthWithGoogle(credential: string): Promise<ReauthResponse> {
  return reauthResponseSchema.parse(await sendJson('POST', '/api/auth/reauth/google', { credential }))
}

export async function reauthWithTelegram(payload: TelegramSignInRequest): Promise<ReauthResponse> {
  return reauthResponseSchema.parse(await sendJson('POST', '/api/auth/reauth/telegram', payload))
}

export async function startSetEmail(request: SetEmailStartRequest): Promise<EmailStartResponse> {
  return emailStartResponseSchema.parse(await sendJson('POST', '/api/auth/set-email/start', request))
}

export async function verifySetEmail(request: EmailVerifyRequest): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('POST', '/api/auth/set-email/verify', request))
}

export async function linkProvider(provider: LinkableProvider, body: unknown): Promise<void> {
  await sendJson('POST', `/api/auth/link/${provider}`, body)
}

export async function unlinkProvider(provider: LinkableProvider): Promise<void> {
  await sendJson('DELETE', `/api/auth/methods/${provider}`)
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

/** Switches the monthly "what's new" mail on or off for the signed-in user; answers with the refreshed session. */
export async function setMarketingOptIn(optIn: boolean): Promise<SessionResponse> {
  return sessionResponseSchema.parse(await sendJson('PUT', '/api/digest/subscription', { optIn }))
}

/** The unsubscribe page's button; `token` is the signed value from the mail link. */
export async function unsubscribeDigest(token: string): Promise<void> {
  await sendJson('POST', '/api/digest/unsubscribe', { token })
}

export async function getAdminDigest(): Promise<AdminDigestStatus> {
  return adminDigestStatusSchema.parse(await sendJson('GET', '/api/admin/digest'))
}

export async function sendAdminDigestTest(): Promise<{ sentTo: string | null }> {
  return adminDigestTestResponseSchema.parse(await sendJson('POST', '/api/admin/digest/test'))
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

export async function getAdminLinks(): Promise<AdminLinksResponse> {
  return adminLinksResponseSchema.parse(await sendJson('GET', '/api/admin/links'))
}

export async function getAdminServer(): Promise<AdminServerResponse> {
  return adminServerResponseSchema.parse(await sendJson('GET', '/api/admin/server'))
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

/** National Police "wanted for unlawful taking" list: the plate and/or VIN, current and earlier records. */
export async function getWanted(plate: string | null, vin: string | null): Promise<WantedResponse> {
  const params = new URLSearchParams()
  if (plate) params.set('plate', plate)
  if (vin) params.set('vin', vin)
  return wantedResponseSchema.parse(await getJson(`/api/wanted?${params.toString()}`))
}

/** Aggregates for the /wanted page: totals, by year / region / brand / model / type / colour, recent lists. */
export async function getWantedStats(): Promise<WantedStatsResponse> {
  return wantedStatsResponseSchema.parse(await getJson('/api/wanted/stats'))
}

export async function getContactConfig(): Promise<ContactConfig> {
  return contactConfigSchema.parse(await getJson('/api/contact/config'))
}

export async function sendContactMessage(request: ContactRequest): Promise<void> {
  await sendJson('POST', '/api/contact', request)
}

export async function startContactCode(request: ContactStartRequest): Promise<EmailStartResponse> {
  return emailStartResponseSchema.parse(await sendJson('POST', '/api/contact/start', request))
}

/** SETAM auction lots (seized property) that named this plate and/or VIN, newest lot first. */
export async function getAuctionLots(plate: string | null, vin: string | null): Promise<AuctionResponse> {
  const params = new URLSearchParams()
  if (plate) params.set('plate', plate)
  if (vin) params.set('vin', vin)
  return auctionResponseSchema.parse(await getJson(`/api/auctions?${params.toString()}`))
}

/** A Prozorro.Sale photo resized (WebP) by our API; `width` must be one the resizer serves (see `PHOTO_WIDTHS` in the API). */
export const auctionPhotoUrl = (docId: string, width: number): string =>
  `${BASE}/api/auctions/photo/${docId}?w=${width}`

/** Aggregates for the /auctions page: totals and breakdowns by month / region / make / year. */
export async function getAuctionStats(): Promise<AuctionStatsResponse> {
  return auctionStatsResponseSchema.parse(await getJson('/api/auctions/stats'))
}

/** One page of the public auction lot list (filters, sort). */
export async function getAuctionList(query: AuctionListQuery): Promise<AuctionListResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return auctionListResponseSchema.parse(await getJson(`/api/auctions/lots?${params.toString()}`))
}
