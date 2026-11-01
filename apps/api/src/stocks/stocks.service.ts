import { Injectable, Logger } from '@nestjs/common'
import { isStockInstrumentSymbol, stockCompanyFor, yahooFinanceNewsUrl, yahooFinanceUrl } from '@carplates/shared'
import type { StockNewsResponse, StockQuoteResponse, StockRange, StockResponse } from '@carplates/shared'
import { z } from 'zod'

const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UPSTREAM_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX = 200
const NEWS_RSS_URL = 'https://feeds.finance.yahoo.com/rss/2.0/headline'
const NEWS_CACHE_TTL_MS = 15 * 60 * 1000
const NEWS_SUMMARY_MAX = 280
const NEWS_MAX = 20
const NEWS_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search'
const NEWS_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; carsua.app)', Accept: 'application/json, text/xml' }
const INTERVAL: Record<StockRange, string> = { '1d': '5m', '1mo': '1d', '1y': '1d' }

const chartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({
            currency: z.string().optional(),
            regularMarketPrice: z.number().optional(),
            chartPreviousClose: z.number().optional(),
            longName: z.string().optional(),
            fullExchangeName: z.string().optional(),
            fiftyTwoWeekHigh: z.number().optional(),
            fiftyTwoWeekLow: z.number().optional(),
            regularMarketVolume: z.number().optional()
          }),
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullable()).optional() })) })
        })
      )
      .nullable()
  })
})

const EMPTY: StockResponse = { company: null, currency: null, price: null, baseline: null, points: [] }

const EMPTY_QUOTE: StockQuoteResponse = {
  symbol: '',
  name: null,
  exchange: null,
  currency: null,
  price: null,
  baseline: null,
  points: []
}

const EMPTY_NEWS: StockNewsResponse = { company: null, moreUrl: null, items: [] }

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name)
  private readonly cache = new Map<string, { at: number; value: StockResponse }>()
  private readonly quoteCache = new Map<string, { at: number; value: StockQuoteResponse }>()
  private readonly newsCache = new Map<string, { at: number; value: StockNewsResponse }>()

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

  /** One instrument of the brand's listed company (main listing, preferred, ADR, other venue); anything else is empty. */
  async quote(brand: string, symbol: string, range: StockRange): Promise<StockQuoteResponse> {
    const company = stockCompanyFor(brand)
    const empty: StockQuoteResponse = { ...EMPTY_QUOTE, symbol }
    if (!company || !isStockInstrumentSymbol(company, symbol)) return empty

    const key = `${symbol}|${range}`
    const hit = this.quoteCache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

    try {
      const { result, points, baseline } = await this.fetchSeries(symbol, range)
      // Yahoo reports 0 for a fact it does not have (a closed or thinly traded venue).
      const fact = (n: number | undefined): number | null => (n ? n : null)
      const value: StockQuoteResponse = {
        symbol,
        name: result.meta.longName ?? null,
        exchange: result.meta.fullExchangeName ?? null,
        currency: result.meta.currency ?? null,
        price: result.meta.regularMarketPrice ?? points.at(-1)?.[1] ?? null,
        baseline,
        points,
        yearLow: fact(result.meta.fiftyTwoWeekLow),
        yearHigh: fact(result.meta.fiftyTwoWeekHigh),
        volume: fact(result.meta.regularMarketVolume)
      }
      if (this.quoteCache.size >= CACHE_MAX) this.quoteCache.delete(this.quoteCache.keys().next().value!)
      this.quoteCache.set(key, { at: Date.now(), value })
      return value
    } catch (err) {
      this.logger.warn(`Stock quote failed for ${symbol}: ${err instanceof Error ? err.message : err}`)
      return hit?.value ?? empty
    }
  }

  private async fetchSeries(
    symbol: string,
    range: StockRange
  ): Promise<{
    result: NonNullable<z.infer<typeof chartSchema>['chart']['result']>[number]
    points: [number, number][]
    baseline: number | null
  }> {
    const url = `${CHART_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${INTERVAL[range]}`
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

    return { result, points, baseline }
  }

  private async fetchChart(
    company: NonNullable<ReturnType<typeof stockCompanyFor>>,
    range: StockRange
  ): Promise<StockResponse> {
    const { result, points, baseline } = await this.fetchSeries(company.symbol, range)

    return {
      company: { id: company.id, name: company.name, symbol: company.symbol, url: yahooFinanceUrl(company.symbol) },
      currency: result.meta.currency ?? null,
      price: result.meta.regularMarketPrice ?? points.at(-1)?.[1] ?? null,
      baseline,
      points
    }
  }

  private async fetchSearchNews(name: string, symbol: string): Promise<StockNewsResponse['items']> {
    // Yahoo tags news with the primary line ("VOW.DE") while the chart symbol may be a share class ("VOW3.DE").
    const tickers = new Set([symbol, symbol.replace(/^([A-Z]+)\d+(?=\.)/, '$1')])
    // A legal suffix ("Volkswagen Group") makes the word search match nothing.
    const q = name.replace(/\s+(group|ag|se|sa|nv|plc|inc\.?|corp(oration)?|co\.?|ltd)$/i, '')
    const params = new URLSearchParams({ q, newsCount: '25', quotesCount: '0', listsCount: '0' })
    const res = await fetch(`${NEWS_SEARCH_URL}?${params}`, {
      headers: NEWS_HEADERS,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return searchSchema
      .parse(await res.json())
      .news.filter(n => n.link.startsWith('https://') && n.relatedTickers?.some(t => tickers.has(t)))
      .map(n => {
        // Smallest thumbnail that is still sharp in a 240px panel.
        const sizes = (n.thumbnail?.resolutions ?? []).filter(r => r.url.startsWith('https://'))
        const image = sizes.filter(r => r.width >= 400).sort((a, b) => a.width - b.width)[0] ?? sizes[0]
        return {
          id: n.uuid,
          title: n.title,
          url: n.link,
          publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
          summary: '',
          publisher: n.publisher ?? null,
          imageUrl: image?.url ?? null
        }
      })
  }

  private async fetchRssNews(symbol: string): Promise<StockNewsResponse['items']> {
    const res = await fetch(`${NEWS_RSS_URL}?${new URLSearchParams({ s: symbol, region: 'US', lang: 'en-US' })}`, {
      headers: NEWS_HEADERS,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return parseNewsRss(await res.text())
  }

  async news(brand: string): Promise<StockNewsResponse> {
    const company = stockCompanyFor(brand)
    if (!company) return EMPTY_NEWS

    const hit = this.newsCache.get(company.symbol)
    if (hit && Date.now() - hit.at < NEWS_CACHE_TTL_MS) return hit.value

    try {
      // The search feed carries images + publishers but is keyed by words, the RSS feed by ticker: use both, deduped.
      const [rich, rss] = await Promise.all([
        this.fetchSearchNews(company.name, company.symbol).catch(() => []),
        this.fetchRssNews(company.symbol).catch(() => [])
      ])
      const seen = new Set<string>()
      const items = [...rich, ...rss]
        .filter(i => !seen.has(i.id) && !!seen.add(i.id))
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, NEWS_MAX)
      if (!items.length && hit) return hit.value

      const value: StockNewsResponse = {
        company: { id: company.id, name: company.name, symbol: company.symbol, url: yahooFinanceUrl(company.symbol) },
        moreUrl: yahooFinanceNewsUrl(company.symbol),
        items
      }
      if (this.newsCache.size >= CACHE_MAX) this.newsCache.delete(this.newsCache.keys().next().value!)
      this.newsCache.set(company.symbol, { at: Date.now(), value })
      return value
    } catch (err) {
      this.logger.warn(`Stock news fetch failed for ${company.symbol}: ${err instanceof Error ? err.message : err}`)
      return hit?.value ?? EMPTY_NEWS
    }
  }
}

const searchSchema = z.object({
  news: z
    .array(
      z.object({
        uuid: z.string(),
        title: z.string(),
        publisher: z.string().optional(),
        link: z.string(),
        providerPublishTime: z.number(),
        relatedTickers: z.array(z.string()).optional(),
        thumbnail: z
          .object({ resolutions: z.array(z.object({ url: z.string(), width: z.number() })).optional() })
          .optional()
      })
    )
    .default([])
})

const decodeXml = (s: string): string =>
  s
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()

const tagText = (block: string, tag: string): string => {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block)
  return m ? decodeXml(m[1]!) : ''
}

/** Items of a Yahoo Finance headline feed; entries without a title, an https link or a valid date are dropped. */
export function parseNewsRss(xml: string): StockNewsResponse['items'] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, block]) => {
    const title = tagText(block!, 'title')
    const url = tagText(block!, 'link')
    const published = new Date(tagText(block!, 'pubDate'))
    if (!title || !url.startsWith('https://') || Number.isNaN(published.getTime())) return []
    return [
      {
        id: tagText(block!, 'guid') || url,
        title,
        url,
        publishedAt: published.toISOString(),
        summary: tagText(block!, 'description').slice(0, NEWS_SUMMARY_MAX),
        publisher: null,
        imageUrl: null
      }
    ]
  })
}
