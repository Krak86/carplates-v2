import { Inject, Injectable } from '@nestjs/common'
import { findWikiPaint, findWikiPaintMask } from '@carplates/db'
import type { WikiPaintInfo } from '@carplates/db'

import { DbService } from '../db/db.service.js'

/** `registry.wiki_image_paint` access for `WikiRecolorService` - a seam so the service tests run without Postgres. */
@Injectable()
export class WikiPaintStore {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  find(imageUrl: string): Promise<WikiPaintInfo | null> {
    return findWikiPaint(this.dbService.db, imageUrl)
  }

  mask(id: string): Promise<Buffer | null> {
    return findWikiPaintMask(this.dbService.db, id)
  }
}
