import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { resolveFuelCategories } from '@carplates/shared'
import type { CardBundleResponse } from '@carplates/shared'

import { EvService } from '../ev/ev.service.js'
import { FxService } from '../fx/fx.service.js'
import { Models360Service } from '../models360/models360.service.js'
import { Models3dService } from '../models3d/models3d.service.js'
import { PlateService } from '../plate/plate.service.js'
import { RdwService } from '../rdw/rdw.service.js'
import { VdbService } from '../vdb/vdb.service.js'
import { WikiService } from '../wiki/wiki.service.js'

/**
 * Everything the top of a result card needs beyond the plate row, from local data only (see `cardBundleResponseSchema`).
 * Each part is the very answer of its own endpoint, computed with the same inputs the web would send, so the web can seed
 * those endpoints' caches with it. A part that cannot be answered locally — or fails — is null and the client asks for it.
 */
@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name)

  constructor(
    @Inject(PlateService) private readonly plates: PlateService,
    @Inject(VdbService) private readonly vdb: VdbService,
    @Inject(RdwService) private readonly rdw: RdwService,
    @Inject(EvService) private readonly ev: EvService,
    @Inject(Models3dService) private readonly models3d: Models3dService,
    @Inject(Models360Service) private readonly models360: Models360Service,
    @Inject(WikiService) private readonly wiki: WikiService,
    @Inject(FxService) private readonly fx: FxService
  ) {}

  async bundle(rawPlate: string): Promise<CardBundleResponse> {
    const current = await this.plates.current(rawPlate)
    if (!current) throw new NotFoundException('No registration found for this plate')

    const { brand, model, makeYear: year, kind, fuel } = current
    const hasModel = !!(brand && model)
    const isElectric = resolveFuelCategories(fuel).includes('electric')

    const [vdb, rdw, ev, models3d, models360, wikiImage] = await Promise.all([
      hasModel ? this.part('vdb', () => this.vdb.lookup(brand, model, kind ?? undefined)) : null,
      hasModel && year ? this.part('rdw', () => this.rdw.lookup(brand, model, year, kind ?? undefined)) : null,
      hasModel && isElectric ? this.part('ev', () => this.ev.lookup(brand, model)) : null,
      hasModel ? this.part('models3d', () => this.models3d.lookup(brand, model)) : null,
      hasModel ? this.part('models360', () => this.models360.lookup(brand, model)) : null,
      brand || model ? this.part('wikiImage', () => this.wiki.peekImage(brand ?? '', model ?? '', year ?? null)) : null
    ])

    // The NBU rates only matter once there is an estimate to convert.
    const fx = rdw?.match?.valueEstimate ? this.fx.peek() : null

    return { plate: current.plate ?? '', vdb, rdw, ev, models3d, models360, fx, wikiImage }
  }

  /** One failing part must not take the others down — the client falls back to that part's own endpoint. */
  private async part<T>(name: string, run: () => Promise<T>): Promise<T | null> {
    try {
      return await run()
    } catch (err) {
      this.logger.warn(`card bundle: ${name} failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
