import { Inject, Injectable } from '@nestjs/common'
import { findWikiCandidates } from '@carplates/db'
import type { WikiCandidateInfo } from '@carplates/db'

import { DbService } from '../db/db.service.js'

/** `registry.wiki_image_candidate` access for `WikiPhotosService` - a seam so the service tests run without Postgres. */
@Injectable()
export class WikiCandidateStore {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  find(brand: string, model: string): Promise<WikiCandidateInfo[]> {
    return findWikiCandidates(this.dbService.db, brand, model)
  }
}
