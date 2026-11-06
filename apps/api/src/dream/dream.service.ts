import { Inject, Injectable } from '@nestjs/common'
import { dreamProjects } from '@carplates/db'
import { dreamSummaryResponseSchema } from '@carplates/shared'
import type { DreamSummaryResponse } from '@carplates/shared'

import { DbService } from '../db/db.service.js'

import { summarizeProjects } from './dream.helpers.js'

/**
 * DREAM recovery projects from our own copy (`registry.dream_projects`, filled by `pnpm ingest:dream`). Reads never touch the
 * upstream API, so the view survives an outage. ~16,000 narrow rows: grouped in memory, the response is cached at the edge.
 */
@Injectable()
export class DreamService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Null when nothing is stored yet: the controller answers 404 and the view hides itself. */
  async summary(): Promise<DreamSummaryResponse | null> {
    const rows = await this.dbService.db
      .select({
        status: dreamProjects.status,
        projectType: dreamProjects.projectType,
        oblastCode: dreamProjects.oblastCode,
        committedUah: dreamProjects.committedUah,
        updatedAt: dreamProjects.updatedAt
      })
      .from(dreamProjects)
    const summary = summarizeProjects(rows)
    return summary ? dreamSummaryResponseSchema.parse(summary) : null
  }
}
