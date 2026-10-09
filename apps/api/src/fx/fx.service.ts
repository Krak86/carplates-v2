import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { z } from 'zod'
import type { FxResponse } from '@carplates/shared'

/** NBU official rates, one JSON array for every currency (https://bank.gov.ua/NBUStatService/v1/statdirectory/exchangenew). */
const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchangenew?json'

const REFRESH_MS = 6 * 60 * 60 * 1000
const TIMEOUT_MS = 8000

const nbuRowSchema = z.object({ cc: z.string(), rate: z.number(), exchangedate: z.string() })

/** "09.10.2026" → "2026-10-09"; null when the NBU changes the format. */
const toIsoDate = (nbuDate: string): string | null => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(nbuDate)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name)
  private cached: { at: number; value: FxResponse } | null = null

  /** NBU rates (UAH per EUR / USD), refetched at most every 6 hours; the last good answer is served if the NBU is down. */
  async rates(): Promise<FxResponse> {
    if (this.cached && Date.now() - this.cached.at < REFRESH_MS) return this.cached.value
    try {
      const value = await this.fetchRates()
      this.cached = { at: Date.now(), value }
      return value
    } catch (err) {
      this.logger.warn(`NBU rate fetch failed: ${err instanceof Error ? err.message : String(err)}`)
      if (this.cached) return this.cached.value
      throw new ServiceUnavailableException('Exchange rates are unavailable')
    }
  }

  private async fetchRates(): Promise<FxResponse> {
    const res = await fetch(NBU_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`NBU status ${res.status}`)
    const rows = z.array(nbuRowSchema).parse(await res.json())
    const eur = rows.find(r => r.cc === 'EUR')
    const usd = rows.find(r => r.cc === 'USD')
    const date = eur ? toIsoDate(eur.exchangedate) : null
    if (!eur || !usd || !date) throw new Error('EUR/USD rate missing from the NBU answer')
    return { date, eurUah: eur.rate, usdUah: usd.rate }
  }
}
