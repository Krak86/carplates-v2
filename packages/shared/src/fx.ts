import { z } from 'zod'

/** The currencies a value can be shown in. EUR is the base: RDW prices and the customs excise are in euros. */
export const CURRENCIES = ['EUR', 'USD', 'UAH'] as const
export type Currency = (typeof CURRENCIES)[number]

/**
 * GET /api/fx — the National Bank of Ukraine's official rates (bank.gov.ua, cached by the API for the day):
 * hryvnias per euro and per US dollar. Own file, not `schemas.ts`, so adding it does not bust offline caches.
 */
export const fxResponseSchema = z.object({
  /** Date of the NBU rate, ISO (YYYY-MM-DD). */
  date: z.string(),
  eurUah: z.number().positive(),
  usdUah: z.number().positive()
})
export type FxResponse = z.infer<typeof fxResponseSchema>

/** Converts euros to `currency` at the NBU rates; UAH per EUR / USD, so USD = EUR x eurUah / usdUah. */
export function convertEur(eur: number, currency: Currency, fx: Pick<FxResponse, 'eurUah' | 'usdUah'>): number {
  if (currency === 'UAH') return eur * fx.eurUah
  if (currency === 'USD') return (eur * fx.eurUah) / fx.usdUah
  return eur
}
