import { Inject, Injectable } from '@nestjs/common'
import { wikiPaintMaskId } from '@carplates/db'
import { wikiRecolorSchema } from '@carplates/shared'
import type { WikiRecolorResponse } from '@carplates/shared'

import { WikiPaintStore } from './wiki-paint.store.js'
import { WikiService } from './wiki.service.js'

export const WIKI_PAINT_MASK_PATH = '/api/wiki/paint'

/** Colour-filter data for the hero photo. Reads stored rows only (never Wikimedia), so it is cheap to ask on every result. */
@Injectable()
export class WikiRecolorService {
  constructor(
    @Inject(WikiService) private readonly wiki: WikiService,
    @Inject(WikiPaintStore) private readonly store: WikiPaintStore
  ) {}

  async lookup(brand: string, model: string, year: number | null): Promise<WikiRecolorResponse> {
    const stored = await this.wiki.peekImage(brand, model, year)
    const url = stored?.image?.url
    if (!url) return { recolor: null }
    const paint = await this.store.find(url)
    if (!paint) return { recolor: null }
    // `?v=algo`: the mask URL is immutable-cached, so a rescan with a better algorithm needs a new URL.
    const parsed = wikiRecolorSchema.safeParse({
      imageUrl: url,
      bucket: paint.bucket,
      lab: paint.lab,
      maskUrl: `${WIKI_PAINT_MASK_PATH}/${wikiPaintMaskId(url)}.webp?v=${paint.algo}`,
      w: paint.w,
      h: paint.h
    })
    return { recolor: parsed.success ? parsed.data : null }
  }

  mask(id: string): Promise<Buffer | null> {
    return this.store.mask(id)
  }
}
