import { Inject, Injectable } from '@nestjs/common'
import { wikiImageKey } from '@carplates/shared'
import type { VehicleColor, WikiPhotosResponse } from '@carplates/shared'

import { GenerationsService } from '../generations/generations.service.js'
import { WikiCandidateStore } from './wiki-candidate.store.js'
import { rankWikiPhotos } from './wiki-photos.rank.js'

/** Extra photos of a model for the strip and the colour-matched hero. Stored rows only (never Wikimedia). */
@Injectable()
export class WikiPhotosService {
  constructor(
    @Inject(WikiCandidateStore) private readonly store: WikiCandidateStore,
    @Inject(GenerationsService) private readonly generations: GenerationsService
  ) {}

  async lookup(
    brand: string,
    model: string,
    year: number | null,
    color: VehicleColor | null
  ): Promise<WikiPhotosResponse> {
    const key = wikiImageKey(brand, model)
    const rows = await this.store.find(key.brand, key.model)
    if (!rows.length) return { photos: [] }
    // The generation is only a filter: a lookup failure must not hide the photos, so it degrades to "no generation".
    const current = year
      ? await this.generations
          .generations(brand, model, year)
          .then(r => r.match?.current ?? null)
          .catch(() => null)
      : null
    return { photos: rankWikiPhotos(rows, { color, span: current }) }
  }
}
