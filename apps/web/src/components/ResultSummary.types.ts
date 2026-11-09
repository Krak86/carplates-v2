import type {
  AuctionResponse,
  CaRecallsResponse,
  CncapRatingsResponse,
  EuroNcapRatingsResponse,
  FuelEconomyResponse,
  IihsRatingsResponse,
  JncapRatingsResponse,
  KncapRatingsResponse,
  NhtsaRecallsResponse,
  RdwRecallsResponse,
  RdwResponse,
  SafetyRatingsResponse,
  WantedResponse
} from '@carplates/shared'

export const SUMMARY_CARD_IDS = ['wanted', 'operation', 'crash', 'co2', 'auction', 'recalls'] as const
export type SummaryCardId = (typeof SUMMARY_CARD_IDS)[number]

/** `pending` is a query still loading; the other three are what the card says once it is settled. */
export const SUMMARY_STATES = ['attention', 'ok', 'other', 'nodata', 'pending'] as const
export type SummaryState = (typeof SUMMARY_STATES)[number]

/** One card of the strip: a state plus the i18n key of its one-line detail (the component translates it). */
export type SummaryCard = {
  id: SummaryCardId
  state: SummaryState
  /** Key of the detail line; null while pending. */
  textKey: string | null
  params?: Record<string, string | number>
  /** Params that are themselves i18n keys, translated before interpolation (`{ status: 'oper.status.new' }`). */
  paramKeys?: Record<string, string>
}

/** What a section's `useQuery` tells the strip. `null` = the query does not apply to this car (no brand / year). */
export type Fetched<T> = { data: T | undefined; isError: boolean; isLoading: boolean } | null

export type CrashInputs = {
  euroncap: Fetched<EuroNcapRatingsResponse>
  nhtsa: Fetched<SafetyRatingsResponse>
  jncap: Fetched<JncapRatingsResponse>
  cncap: Fetched<CncapRatingsResponse>
  kncap: Fetched<KncapRatingsResponse>
  iihs: Fetched<IihsRatingsResponse>
  /** The registry body text: NHTSA lists every body style under one name, so its rows are narrowed to this one. */
  body: string | null
}

export type RecallInputs = {
  rdw: Fetched<RdwRecallsResponse>
  nhtsa: Fetched<NhtsaRecallsResponse>
  ca: Fetched<CaRecallsResponse>
}

export type Co2Inputs = {
  fuel: Fetched<FuelEconomyResponse>
  /** The Dutch register's CO2 (same query the Specs block uses): fills in where EPA / EEA have nothing. */
  rdw: Fetched<RdwResponse>
}

export type { AuctionResponse, WantedResponse }
