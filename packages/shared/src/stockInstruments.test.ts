import { describe, expect, it } from 'vitest'

import { STOCK_COMPANIES, stockCompanyFor } from './stockCompanies.js'
import { isStockInstrumentSymbol, stockInstrumentsFor, tradingViewUrl } from './stockInstruments.js'

describe('stockInstrumentsFor', () => {
  it('lists the main listing first, without duplicates, for every company', () => {
    for (const company of STOCK_COMPANIES) {
      const symbols = stockInstrumentsFor(company).map(i => i.symbol)
      expect(symbols[0]).toBe(company.symbol)
      expect(new Set(symbols).size).toBe(symbols.length)
    }
  })

  it('knows the Hyundai preferred lines and marks the Volkswagen chart symbol as preferred', () => {
    const hyundai = stockInstrumentsFor(stockCompanyFor('Hyundai')!)
    expect(hyundai.filter(i => i.kind === 'preferred').map(i => i.symbol)).toEqual([
      '005385.KS',
      '005387.KS',
      '005389.KS'
    ])
    expect(stockInstrumentsFor(stockCompanyFor('Volkswagen')!)[0]).toEqual({ symbol: 'VOW3.DE', kind: 'preferred' })
  })

  it('only accepts a symbol of the same company', () => {
    const kia = stockCompanyFor('Kia')!
    expect(isStockInstrumentSymbol(kia, '000270.KS')).toBe(true)
    expect(isStockInstrumentSymbol(kia, 'TSLA')).toBe(false)
  })
})

describe('tradingViewUrl', () => {
  it('prefixes the exchange and keeps or drops leading zeros per market', () => {
    expect(tradingViewUrl('000270.KS')).toBe('https://www.tradingview.com/symbols/KRX-000270/')
    expect(tradingViewUrl('7203.T')).toBe('https://www.tradingview.com/symbols/TSE-7203/')
    expect(tradingViewUrl('0175.HK')).toBe('https://www.tradingview.com/symbols/HKEX-175/')
    expect(tradingViewUrl('TSLA')).toBe('https://www.tradingview.com/symbols/TSLA/')
  })
})
