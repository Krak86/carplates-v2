export const AUCTION_REGION_ICON = { us: '🇺🇸', eu: '🇪🇺', kr: '🇰🇷', jp: '🇯🇵', cn: '🇨🇳' } as const
type AuctionRegion = keyof typeof AUCTION_REGION_ICON

export const AUCTION_SITE_IDS = [
  'bidfax',
  'bidcars',
  'poctra',
  'copart',
  'iaai',
  'statvin',
  'openlane',
  'encar',
  'carvx',
  'checkcar',
  'chinavehiclehistory'
] as const
export type AuctionSiteId = (typeof AUCTION_SITE_IDS)[number]

type AuctionSite = {
  id: AuctionSiteId
  region: AuctionRegion
  /**
   * `main` = an archive that answers "was this VIN sold at auction"; `extra` = last-resort resources without a VIN archive;
   * `asia` = paid history reports for Japan / Korea / China cars, offered only when the VIN prefix matches `vinPrefix`.
   */
  tier: 'main' | 'extra' | 'asia'
  /** `asia` tier: the VIN's country prefix (WMI start) this report covers. */
  vinPrefix?: RegExp
  /** Site root in the visitor's language — where a manual site is opened (the VIN is pasted into its search box). */
  home: (lang: string) => string
  /** Builds a search URL that carries the VIN; absent = the site needs a session / has no VIN-in-URL search (modal). */
  searchUrl?: (vin: string) => string
}

/**
 * Public VIN searches of auction archives. Most of them bind a search to a visitor session, so a forwarded search URL
 * does not work for a new user: those show the VIN in a modal to copy and paste. `searchUrl` sites open pre-filled
 * (the VIN is copied too). Link-out only — no VIN is sent by us.
 */
export const AUCTION_SITES: readonly AuctionSite[] = [
  // bidfax.info is the Ukrainian version, en.bidfax.info serves English and Russian.
  {
    id: 'bidfax',
    region: 'us',
    tier: 'main',
    home: lang => (lang === 'ua' ? 'https://bidfax.info/' : 'https://en.bidfax.info/')
  },
  {
    id: 'bidcars',
    region: 'us',
    tier: 'main',
    home: lang => `https://bid.cars/${lang === 'ua' ? 'ua' : lang === 'ru' ? 'ru' : 'en'}`
  },
  { id: 'poctra', region: 'us', tier: 'main', home: () => 'https://poctra.com/' },
  {
    id: 'copart',
    region: 'us',
    tier: 'extra',
    home: () => 'https://www.copart.com/',
    searchUrl: vin => `https://www.copart.com/lotSearchResults/?free=true&query=${encodeURIComponent(vin)}`
  },
  { id: 'iaai', region: 'us', tier: 'extra', home: () => 'https://www.iaai.com/' },
  { id: 'statvin', region: 'us', tier: 'extra', home: () => 'https://stat.vin/' },
  { id: 'openlane', region: 'eu', tier: 'extra', home: () => 'https://www.openlane.eu/' },
  { id: 'encar', region: 'kr', tier: 'extra', home: () => 'https://www.encar.com/' },
  // The Asia reports have no VIN-in-URL search (form only): they open through the copy-and-paste modal.
  { id: 'carvx', region: 'jp', tier: 'asia', vinPrefix: /^J/, home: () => 'https://carvx.jp/' },
  { id: 'checkcar', region: 'kr', tier: 'asia', vinPrefix: /^K[L-R]/, home: () => 'https://checkcar.vin/' },
  {
    id: 'chinavehiclehistory',
    region: 'cn',
    tier: 'asia',
    vinPrefix: /^L/,
    home: () => 'https://www.chinavehiclehistory.com/'
  }
]

/** Asia history reports that cover this VIN's country (Japan `J`, Korea `KL`-`KR`, China `L`); empty for any other VIN. */
export function asiaSitesForVin(vin: string): readonly AuctionSite[] {
  const upper = vin.toUpperCase()
  return AUCTION_SITES.filter(site => site.tier === 'asia' && !!site.vinPrefix?.test(upper))
}

/** Sites of one tier, in display order. */
export function auctionSitesByTier(tier: AuctionSite['tier']): readonly AuctionSite[] {
  return AUCTION_SITES.filter(site => site.tier === tier)
}

/** Where a click goes: the pre-filled search when the site supports it, otherwise its home page. */
export function auctionOpenUrl(site: AuctionSite, vin: string, lang: string): string {
  return site.searchUrl ? site.searchUrl(vin) : site.home(lang)
}

export { hasImportOperation } from '@carplates/shared'
