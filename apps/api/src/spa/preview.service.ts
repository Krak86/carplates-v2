import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  brandSlug,
  classifyQuery,
  fallbackVehicleColor,
  normalizePlate,
  REGION_IDS,
  regionName,
  resolveVehicleColor,
  resolveVehicleKind,
  vehicleKindFromTitle
} from '@carplates/shared'
import type { VehicleColor } from '@carplates/shared'

import { AuctionsService } from '../auctions/auctions.service.js'
import { PlateService } from '../plate/plate.service.js'
import { RdwService } from '../rdw/rdw.service.js'
import { VinService } from '../vin/vin.service.js'
import { WantedService } from '../wanted/wanted.service.js'
import { Lru } from './lru.js'
import { KIND_LABEL, valuePageText, vehiclePageText, type Lang } from './spa-text.js'

export type Preview = {
  kind: 'plate' | 'vin'
  /** Canonical plate or VIN — the share URL path and the big text on the card. */
  value: string
  title: string
  description: string
  card: { plate: string; title: string; subtitle: string; color: VehicleColor }
  brandSlug: string | null
  /** Plates only: the region's short id (names its link-preview flag), when it has one. */
  regionId?: string | null
  /** Plates only: what the RDW estimate needs for a `?section=value` link. */
  vehicle?: { brand: string; model: string; year: number; kind: string | null }
}

const TTL_MS = 10 * 60_000

/** Feed placeholders for a colour nobody recorded: not worth a card line. */
const UNKNOWN_COLORS = new Set(['', 'невідомо', 'unknown'])

const cap = (s: string | null | undefined): string | null =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : null

/** Turns a plate/VIN into everything a link preview needs. Shared by the meta tags and the /og image. */
@Injectable()
export class PreviewService {
  private readonly logger = new Logger('Preview')
  private readonly cache = new Lru<{ at: number; preview: Preview | null }>(500)

  constructor(
    @Inject(PlateService) private readonly plateService: PlateService,
    @Inject(VinService) private readonly vinService: VinService,
    @Inject(RdwService) private readonly rdwService: RdwService,
    @Inject(WantedService) private readonly wantedService: WantedService,
    @Inject(AuctionsService) private readonly auctionsService: AuctionsService
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
    let res: Awaited<ReturnType<PlateService['lookup']>>
    try {
      res = await this.plateService.lookup(query)
    } catch (err) {
      if (err instanceof NotFoundException) return this.describeOtherSources(query, lang, err)
      throw err
    }
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
        title: [car ?? '-', year].filter(Boolean).join(' · '),
        subtitle: [res.region, cap(c.fuel), color].filter(Boolean).join(' · '),
        color: resolveVehicleColor(c.color) ?? fallbackVehicleColor(res.plate)
      },
      brandSlug: brandSlug(c.brand),
      regionId: (REGION_IDS as Readonly<Record<string, string>>)[res.region ?? ''] ?? null,
      vehicle:
        c.brand && c.model && c.makeYear
          ? { brand: c.brand, model: c.model, year: c.makeYear, kind: c.kind }
          : undefined
    }
  }

  /**
   * A plate the registry does not hold but the wanted lists or the auction lots do: the same card, built from what those
   * sources know (make, model, year, colour, type from the lot title). Rethrows the registry's 404 when they know nothing.
   */
  private async describeOtherSources(query: string, lang: Lang, notFound: NotFoundException): Promise<Preview> {
    const plate = normalizePlate(query)
    const [wanted, auctions] = await Promise.all([
      this.wantedService.lookup(plate, null),
      this.auctionsService.lookup(plate, null)
    ])
    if (wanted.records.length === 0 && (wanted.plates ?? []).length === 0 && auctions.lots.length === 0) throw notFound

    const first = <T>(values: (T | null | undefined)[]): T | null => values.find(v => !!v) ?? null
    const lotVehicle = auctions.vehicle
    const brand = first([...wanted.records.map(r => r.brand), lotVehicle?.make])
    const model = first([...wanted.records.map(r => r.model), lotVehicle?.model])
    const year = lotVehicle?.year ? String(lotVehicle.year) : null
    const colorText = first(
      [...wanted.records.map(r => r.color), lotVehicle?.color].filter(c => !UNKNOWN_COLORS.has(c?.toLowerCase() ?? ''))
    )
    const kind =
      first(wanted.records.map(r => resolveVehicleKind(r.vehicleType))) ??
      first(auctions.lots.map(l => vehicleKindFromTitle(l.title)))
    const kindLabel = kind ? KIND_LABEL[kind][lang] : null
    const car = [brand, model].filter(Boolean).join(' ') || null
    const region = regionName(plate) ?? null

    return {
      kind: 'plate',
      value: plate,
      ...vehiclePageText(lang, { value: plate, car, year, extra: [kindLabel, region] }, 'other'),
      card: {
        plate,
        title: [car ?? kindLabel ?? '-', year].filter(Boolean).join(' · '),
        subtitle: [region, car ? kindLabel : null, cap(colorText)].filter(Boolean).join(' · '),
        color: resolveVehicleColor(colorText) ?? fallbackVehicleColor(plate)
      },
      brandSlug: brandSlug(brand),
      regionId: (REGION_IDS as Readonly<Record<string, string>>)[region ?? ''] ?? null
    }
  }

  /** Title/description for a `?section=value` link; the plain preview when there is no estimate. */
  async describeValue(preview: Preview, lang: Lang): Promise<{ title: string; description: string }> {
    const v = preview.vehicle
    if (!v) return preview
    try {
      const res = await this.rdwService.lookup(v.brand, v.model, v.year, v.kind ?? undefined)
      const est = res.match?.valueEstimate
      return est ? valuePageText(lang, preview, est.lowEur, est.highEur) : preview
    } catch (err) {
      this.logger.debug(`no value preview for "${preview.value}": ${(err as Error).message}`)
      return preview
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
