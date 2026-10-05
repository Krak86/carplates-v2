import { Inject, Injectable } from '@nestjs/common'
import { findWikiImage, upsertWikiImages } from '@carplates/db'
import type { WikiImageRow } from '@carplates/db'
import type { WikiImageKey, WikiImageRowValues } from '@carplates/shared'

import { DbService } from '../db/db.service.js'

/** `registry.wiki_image` access for `WikiService` — a seam so the service tests run without Postgres. */
@Injectable()
export class WikiImageStore {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  find(key: WikiImageKey): Promise<WikiImageRow | null> {
    return findWikiImage(this.dbService.db, key)
  }

  save(row: WikiImageRowValues): Promise<void> {
    return upsertWikiImages(this.dbService.db, [row])
  }
}
