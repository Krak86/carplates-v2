import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CURRENCIES } from '@carplates/shared'
import type { Currency, FxResponse } from '@carplates/shared'

import { fxQuery } from '@/lib/queries'
import { DEFAULT_MARKET_CURRENCY, effectiveMarketCurrency } from './helpers'

const STORAGE_KEY = 'market-currency'

function readStored(): Currency {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return (CURRENCIES as readonly string[]).includes(value ?? '') ? (value as Currency) : DEFAULT_MARKET_CURRENCY
  } catch {
    return DEFAULT_MARKET_CURRENCY
  }
}

export type MarketCurrency = {
  /** What the visitor picked (kept in this browser). */
  wanted: Currency
  /** What the prices are really shown in: USD until the NBU rates arrive. */
  shown: Currency
  rates: FxResponse | null
  setWanted: (currency: Currency) => void
}

/**
 * Currency of the asking prices. The feed is in USD; EUR / UAH are converted at the NBU rate of the day (`/api/fx`, the
 * same query as the value chip). Rates are requested only for a non-USD choice or when `needRates` (the list modal's switch).
 */
export function useMarketCurrency(needRates: boolean): MarketCurrency {
  const [wanted, setWantedState] = useState<Currency>(readStored)
  const fx = useQuery({ ...fxQuery(), enabled: wanted !== DEFAULT_MARKET_CURRENCY || needRates })
  const rates = fx.data ?? null

  const setWanted = (currency: Currency): void => {
    setWantedState(currency)
    try {
      localStorage.setItem(STORAGE_KEY, currency)
    } catch {
      // private mode: the choice just lasts until reload
    }
  }

  return { wanted, shown: effectiveMarketCurrency(wanted, rates), rates, setWanted }
}
