import { infocarBrandSlug } from './infocarLookup.js'

export type StockCompany = {
  /** Stable key (also the API cache key). */
  id: string
  name: string
  /** Yahoo Finance symbol. */
  symbol: string
  /** Infocar brand slugs the listing speaks for. */
  brands: string[]
}

/** `[id, name, Yahoo symbol, brand slugs]` — a listed make, or the listed parent of several makes. */
const COMPANIES: ReadonlyArray<readonly [string, string, string, readonly string[]]> = [
  ['kia', 'Kia', '000270.KS', ['kia']],
  ['hyundai', 'Hyundai Motor', '005380.KS', ['hyundai', 'genesis']],
  ['kg-mobility', 'KG Mobility', '003620.KS', ['ssang-yong']],
  ['toyota', 'Toyota', '7203.T', ['toyota', 'lexus', 'daihatsu']],
  ['honda', 'Honda', '7267.T', ['honda', 'acura']],
  ['nissan', 'Nissan', '7201.T', ['nissan', 'infiniti']],
  ['mazda', 'Mazda', '7261.T', ['mazda']],
  ['subaru', 'Subaru', '7270.T', ['subaru']],
  ['mitsubishi', 'Mitsubishi Motors', '7211.T', ['mitsubishi']],
  ['suzuki', 'Suzuki', '7269.T', ['suzuki']],
  ['isuzu', 'Isuzu', '7202.T', ['isuzu']],
  ['yamaha', 'Yamaha Motor', '7272.T', ['yamaha']],
  [
    'volkswagen-group',
    'Volkswagen Group',
    'VOW3.DE',
    ['volkswagen', 'audi', 'skoda', 'seat', 'cupra', 'bentley', 'lamborghini']
  ],
  ['porsche', 'Porsche', 'P911.DE', ['porsche']],
  ['mercedes', 'Mercedes-Benz Group', 'MBG.DE', ['mercedes', 'smart']],
  ['bmw-group', 'BMW Group', 'BMW.DE', ['bmw', 'mini', 'rolls-royce']],
  [
    'stellantis',
    'Stellantis',
    'STLAM.MI',
    ['peugeot', 'citroen', 'opel', 'fiat', 'alfa-romeo', 'jeep', 'dodge', 'chrysler', 'maserati', 'ds']
  ],
  ['renault-group', 'Renault Group', 'RNO.PA', ['renault', 'dacia']],
  ['volvo-cars', 'Volvo Cars', 'VOLCAR-B.ST', ['volvo']],
  ['ferrari', 'Ferrari', 'RACE', ['ferrari']],
  ['ford', 'Ford', 'F', ['ford', 'lincoln']],
  ['gm', 'General Motors', 'GM', ['chevrolet', 'cadillac', 'buick', 'gmc']],
  ['tesla', 'Tesla', 'TSLA', ['tesla']],
  ['tata', 'Tata Motors', 'TMPV.NS', ['tata', 'jaguar', 'land-rover']],
  ['byd', 'BYD', '1211.HK', ['byd']],
  ['geely', 'Geely Automobile', '0175.HK', ['geely']],
  ['saic', 'SAIC Motor', '600104.SS', ['mg', 'roewe']],
  ['great-wall', 'Great Wall Motor', '2333.HK', ['great-wall', 'haval']],
  ['chery', 'Chery', '9973.HK', ['chery']],
  ['nio', 'NIO', 'NIO', ['nio']],
  ['li-auto', 'Li Auto', 'LI', ['li-auto']],
  ['xpeng', 'XPeng', 'XPEV', ['xpeng']],
  ['harley-davidson', 'Harley-Davidson', 'HOG', ['harley-davidson']]
]

export const STOCK_COMPANIES: readonly StockCompany[] = COMPANIES.map(([id, name, symbol, brands]) => ({
  id,
  name,
  symbol,
  brands: [...brands]
}))

/** The listed company behind a registry brand (the make itself or its parent group); null = no widget. */
export function stockCompanyFor(brand: string | null | undefined): StockCompany | null {
  const slug = infocarBrandSlug(brand)
  return (slug && STOCK_COMPANIES.find(c => c.brands.includes(slug))) || null
}

export const STOCK_RANGES = ['1d', '1mo', '1y'] as const
export type StockRange = (typeof STOCK_RANGES)[number]
export const DEFAULT_STOCK_RANGE: StockRange = '1d'

export const yahooFinanceUrl = (symbol: string): string =>
  `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`
