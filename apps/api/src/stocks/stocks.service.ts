import { Injectable, Logger } from '@nestjs/common'
import { stockCompanyFor, yahooFinanceUrl } from '@carplates/shared'
import type { StockRange, StockResponse } from '@carplates/shared'
import { z } from 'zod'

const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UPSTREAM_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX = 200
const INTERVAL: Record<StockRange, string> = { '1d': '5m', '1mo': '1d', '1y': '1d' }

const chartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({
            currency: z.string().optional(),
            regularMarketPrice: z.number().optional(),
            chartPreviousClose: z.number().optional()
          }),
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullable()).optional() })) })
        })
      )
      .nullable()
  })
})

const EMPTY: StockResponse = { company: null, currency: null, price: null, baseline: null, points: [] }

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name)
  private readonly cache = new Map<string, { at: number; value: StockResponse }>()

  async lookup(brand: string, range: StockRange): Promise<StockResponse> {
    const company = stockCompanyFor(brand)
    if (!company) return EMPTY

    const key = `${company.symbol}|${range}`
    const hit = this.cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

    try {
      const value = await this.fetchChart(company, range)
      if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value!)
      this.cache.set(key, { at: Date.now(), value })
      return value
    } catch (err) {
      this.logger.warn(`Stock fetch failed for ${company.symbol}: ${err instanceof Error ? err.message : err}`)
      // Serve a stale series rather than hiding the widget on a transient upstream error.
      return hit?.value ?? EMPTY
    }
  }

  private async fetchChart(
    company: NonNullable<ReturnType<typeof stockCompanyFor>>,
    range: StockRange
  ): Promise<StockResponse> {
    const url = `${CHART_URL}/${encodeURIComponent(company.symbol)}?range=${range}&interval=${INTERVAL[range]}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; carsua.app)', Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const result = chartSchema.parse(await res.json()).chart.result?.[0]
    if (!result) throw new Error('no result')

    const closes = result.indicators.quote[0]?.close ?? []
    const points = (result.timestamp ?? []).flatMap((t, i): [number, number][] => {
      const c = closes[i]
      return typeof c === 'number' ? [[t, c]] : []
    })
    // 1d: change vs the previous session's close; longer ranges: vs the first close of the range.
    const baseline =
      range === '1d' ? (result.meta.chartPreviousClose ?? points[0]?.[1] ?? null) : (points[0]?.[1] ?? null)

    return {
      company: { id: company.id, name: company.name, symbol: company.symbol, url: yahooFinanceUrl(company.symbol) },
      currency: result.meta.currency ?? null,
      price: result.meta.regularMarketPrice ?? points.at(-1)?.[1] ?? null,
      baseline,
      points
    }
  }
}
