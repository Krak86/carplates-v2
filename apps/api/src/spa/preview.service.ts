import { Inject, Injectable, Logger } from '@nestjs/common'
import { brandSlug, classifyQuery, fallbackVehicleColor, resolveVehicleColor } from '@carplates/shared'
import type { VehicleColor } from '@carplates/shared'

import { PlateService } from '../plate/plate.service.js'
import { VinService } from '../vin/vin.service.js'
import { Lru } from './lru.js'
import { vehiclePageText, type Lang } from './spa-text.js'

export type Preview = {
  kind: 'plate' | 'vin'
  /** Canonical plate or VIN — the share URL path and the big text on the card. */
  value: string
  title: string
  description: string
  card: { plate: string; title: string; subtitle: string; color: VehicleColor }
  brandSlug: string | null
}

const TTL_MS = 10 * 60_000

const cap = (s: string | null | undefined): string | null =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : null

/** Turns a plate/VIN into everything a link preview needs. Shared by the meta tags and the /og image. */
@Injectable()
export class PreviewService {
  private readonly logger = new Logger('Preview')
  private readonly cache = new Lru<{ at: number; preview: Preview | null }>(500)

  constructor(
    @Inject(PlateService) private readonly plateService: PlateService,
    @Inject(VinService) private readonly vinService: VinService
  ) {}

  /** `null` when the query isn't a known plate/VIN (or a lookup fails) — callers fall back to the generic preview. */
  async describe(query: string, lang: Lang): Promise<Preview | null> {
    const key = `${lang}:${query}`
    const hit = this.cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS) return hit.preview

    let preview: Preview | null = null
    try {
      preview =
        classifyQuery(query) === 'vin' ? await this.describeVin(query, lang) : await this.describePlate(query, lang)
    } catch (err) {
      this.logger.debug(`no preview for "${query}": ${(err as Error).message}`)
    }
    this.cache.set(key, { at: Date.now(), preview })
    return preview
  }

  private async describePlate(query: string, lang: Lang): Promise<Preview> {
    const res = await this.plateService.lookup(query)
    const c = res.current
    const car = [c.brand, c.model].filter(Boolean).join(' ') || null
    const year = c.makeYear ? String(c.makeYear) : null
    const color = cap(c.color)
    return {
      kind: 'plate',
      value: res.plate,
      ...vehiclePageText(lang, { value: res.plate, car, year, extra: [c.fuel, res.region] }, 'plate'),
      card: {
        plate: res.plate,
        title: [car ?? '—', year].filter(Boolean).join(' · '),
        subtitle: [res.region, cap(c.fuel), color].filter(Boolean).join(' · '),
        color: resolveVehicleColor(c.color) ?? fallbackVehicleColor(res.plate)
      },
      brandSlug: brandSlug(c.brand)
    }
  }

  private async describeVin(query: string, lang: Lang): Promise<Preview> {
    const res = await this.vinService.decode(query)
    const latest = res.registry?.actions[0]
    const pick = (name: string): string | null => res.results.find(r => r.variable === name)?.value ?? null
    const brand = latest?.brand ?? pick('Make')
    const model = latest?.model ?? pick('Model')
    const car = [brand, model].filter(Boolean).join(' ') || null
    const year = latest?.makeYear ? String(latest.makeYear) : pick('Model Year')
    const fuel = latest?.fuel ?? pick('Fuel Type - Primary')
    return {
      kind: 'vin',
      value: res.vin,
      ...vehiclePageText(lang, { value: res.vin, car, year, extra: [fuel] }, 'vin'),
      card: {
        plate: res.vin,
        title: [car ?? 'VIN', year].filter(Boolean).join(' · '),
        subtitle: ['VIN', cap(fuel), cap(latest?.color)].filter(Boolean).join(' · '),
        color: resolveVehicleColor(latest?.color) ?? fallbackVehicleColor(res.vin)
      },
      brandSlug: brandSlug(brand)
    }
  }
}
