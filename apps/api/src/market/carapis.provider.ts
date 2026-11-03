import { Injectable, Logger } from '@nestjs/common'
import { MARKET_BODY_FILTER } from '@carplates/shared'
import type { MarketCard } from '@carplates/shared'

import { loadEnv } from '../env.js'
import { mapDetail, mapPage, pickModelSlug } from './carapis-parse.js'
import type { MappedDetail } from './carapis-parse.js'
import { MarketUpstreamError } from './market-provider.js'
import type { ListParams, MarketProvider } from './market-provider.js'

const TIMEOUT_MS = 12_000
const PAGE_SIZE = 50

/**
 * CarAPIS (`carapis.com`) catalogue: every method is exactly one upstream request. The budget and the cache live in
 * `MarketService`; this class only talks HTTP, validates the answer and maps it. The key goes in `X-API-Key` and nowhere else
 * (never logged, never in a URL). No key = `enabled` false.
 */
@Injectable()
export class CarapisProvider implements MarketProvider {
  private readonly log = new Logger(CarapisProvider.name)
  private readonly env = loadEnv()

  get enabled(): boolean {
    return !!this.env.CARAPIS_API_KEY
  }

  async list(p: ListParams): Promise<MarketCard[]> {
    const q = new URLSearchParams({
      brand: p.brand,
      model: p.model,
      page_size: String(PAGE_SIZE),
      available_only: 'true'
    })
    if (p.country) q.set('country', p.country)
    const body = MARKET_BODY_FILTER[p.kind]
    if (body) q.set('body_type', body)
    return mapPage(await this.get(`/vehicles/?${q}`))
  }

  async detail(id: string): Promise<MappedDetail | null> {
    return mapDetail(await this.get(`/vehicles/${encodeURIComponent(id)}/`))
  }

  async modelSlug(brand: string, model: string): Promise<string | null> {
    const q = new URLSearchParams({ brand, search: model })
    return pickModelSlug(await this.get(`/models/?${q}`), model)
  }

  private async get(path: string): Promise<unknown> {
    const key = this.env.CARAPIS_API_KEY
    if (!key) throw new MarketUpstreamError('unavailable', 'CarAPIS is not configured')
    let res: Response
    try {
      res = await fetch(`${this.env.CARAPIS_BASE_URL}${path}`, {
        headers: { 'X-API-Key': key, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
    } catch (err) {
      this.log.warn(`CarAPIS request failed: ${(err as Error).name}`)
      throw new MarketUpstreamError('unavailable', 'CarAPIS did not answer')
    }
    if (res.status === 429) throw new MarketUpstreamError('rate', 'CarAPIS daily limit reached')
    if (res.status >= 500) throw new MarketUpstreamError('unavailable', `CarAPIS HTTP ${res.status}`)
    if (!res.ok) {
      // 401 / 403 = a bad key, 400 = a parameter it does not know; both are our bug, not the user's.
      this.log.warn(`CarAPIS rejected a request: HTTP ${res.status}`)
      throw new MarketUpstreamError('rejected', `CarAPIS HTTP ${res.status}`)
    }
    try {
      return await res.json()
    } catch {
      throw new MarketUpstreamError('unavailable', 'CarAPIS sent a body that is not JSON')
    }
  }
}
