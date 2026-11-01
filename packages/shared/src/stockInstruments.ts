import { z } from 'zod'

import { yahooFinanceUrl } from './stockCompanies.js'
import type { StockCompany } from './stockCompanies.js'

/** What a listing is: the same company can trade as several instruments (see `section.about.shares` explanations). */
export const STOCK_INSTRUMENT_KINDS = ['ordinary', 'preferred', 'adr', 'otc', 'secondary'] as const
export type StockInstrumentKind = (typeof STOCK_INSTRUMENT_KINDS)[number]

export type StockInstrument = {
  /** Yahoo Finance symbol. */
  symbol: string
  kind: StockInstrumentKind
}

/** The main listing is "ordinary" unless the company's chart symbol is another class (VW's `VOW3.DE` is the preferred one). */
const PRIMARY_KIND: Readonly<Record<string, StockInstrumentKind>> = { 'volkswagen-group': 'preferred' }

/**
 * Other tradable instruments of a listed company, `[symbol, kind]`, each checked against Yahoo's chart endpoint
 * (2026-11-01). Makes with a single known listing are absent. Preferred = the Korean 1st/2nd/3rd preferred lines;
 * ADR = a US-traded certificate of the foreign share; OTC = US over-the-counter; secondary = the same share on a second venue.
 */
const EXTRA_INSTRUMENTS: Readonly<Record<string, ReadonlyArray<readonly [string, StockInstrumentKind]>>> = {
  hyundai: [
    ['005385.KS', 'preferred'],
    ['005387.KS', 'preferred'],
    ['005389.KS', 'preferred']
  ],
  toyota: [['TM', 'adr']],
  honda: [['HMC', 'adr']],
  nissan: [['NSANY', 'adr']],
  mazda: [['MZDAY', 'adr']],
  subaru: [['FUJHY', 'adr']],
  mitsubishi: [
    ['MMTOY', 'adr'],
    ['MMTOF', 'otc']
  ],
  suzuki: [['SZKMY', 'adr']],
  isuzu: [['ISUZY', 'adr']],
  yamaha: [['YAMHF', 'otc']],
  'volkswagen-group': [
    ['VOW.DE', 'ordinary'],
    ['VWAGY', 'adr'],
    ['VWAPY', 'adr']
  ],
  porsche: [['DRPRY', 'adr']],
  mercedes: [
    ['MBGYY', 'adr'],
    ['MBGAF', 'otc']
  ],
  'bmw-group': [['BAMXF', 'otc']],
  stellantis: [
    ['STLA', 'secondary'],
    ['STLAP.PA', 'secondary']
  ],
  'renault-group': [
    ['RNLSY', 'adr'],
    ['RNSDF', 'otc']
  ],
  ferrari: [['RACE.MI', 'secondary']],
  tesla: [['TL0.DE', 'secondary']],
  tata: [['TMPV.BO', 'secondary']],
  byd: [
    ['002594.SZ', 'secondary'],
    ['BYDDY', 'adr']
  ],
  'great-wall': [
    ['601633.SS', 'secondary'],
    ['GWLLY', 'adr']
  ],
  nio: [['9866.HK', 'secondary']],
  'li-auto': [['2015.HK', 'secondary']],
  xpeng: [['9868.HK', 'secondary']]
}

/** Main listing first, then the other instruments of the company. */
export function stockInstrumentsFor(company: StockCompany): StockInstrument[] {
  return [
    { symbol: company.symbol, kind: PRIMARY_KIND[company.id] ?? 'ordinary' },
    ...(EXTRA_INSTRUMENTS[company.id] ?? []).map(([symbol, kind]) => ({ symbol, kind }))
  ]
}

/** Every symbol the quote endpoint may proxy for a company (it is not an open Yahoo proxy). */
export function isStockInstrumentSymbol(company: StockCompany, symbol: string): boolean {
  return stockInstrumentsFor(company).some(i => i.symbol === symbol)
}

const TRADINGVIEW_EXCHANGES: Readonly<Record<string, string>> = {
  KS: 'KRX',
  T: 'TSE',
  DE: 'XETR',
  MI: 'MIL',
  PA: 'EURONEXTPARIS',
  ST: 'OMXSTO',
  NS: 'NSE',
  BO: 'BSE',
  HK: 'HKEX',
  SS: 'SSE',
  SZ: 'SZSE'
}

/** TradingView symbol page (`EXCHANGE-TICKER`); a US ticker needs no exchange. */
export function tradingViewUrl(symbol: string): string {
  const dot = symbol.lastIndexOf('.')
  const exchange = dot > 0 ? TRADINGVIEW_EXCHANGES[symbol.slice(dot + 1)] : undefined
  if (!exchange) return `https://www.tradingview.com/symbols/${encodeURIComponent(symbol)}/`

  const ticker = symbol.slice(0, dot)
  // Hong Kong tickers are written without the leading zeros ("0175" -> "175"); Korean, Chinese and Japanese ones keep them.
  return `https://www.tradingview.com/symbols/${exchange}-${exchange === 'HKEX' ? ticker.replace(/^0+/, '') : ticker}/`
}

/** Frankfurt exchange search: the best free place to look for a maker's bonds. */
export const bondSearchUrl = (companyName: string): string =>
  `https://www.boerse-frankfurt.de/en/search/result?searchTerms=${encodeURIComponent(companyName)}`

export const instrumentLinks = (symbol: string): { yahoo: string; tradingView: string } => ({
  yahoo: yahooFinanceUrl(symbol),
  tradingView: tradingViewUrl(symbol)
})

/** `GET /api/stocks/quote`: one instrument's series plus the facts Yahoo reports with it. A zero or missing fact is null. */
export const stockQuoteResponseSchema = z.object({
  symbol: z.string(),
  /** Yahoo's long name; the exchange's own label, e.g. "KSE", "NYSE". */
  name: z.string().nullable(),
  exchange: z.string().nullable(),
  currency: z.string().nullable(),
  price: z.number().nullable(),
  baseline: z.number().nullable(),
  /** `[unix seconds, close]`. */
  points: z.array(z.tuple([z.number(), z.number()])),
  yearLow: z.number().nullable().optional(),
  yearHigh: z.number().nullable().optional(),
  volume: z.number().nullable().optional()
})
export type StockQuoteResponse = z.infer<typeof stockQuoteResponseSchema>
