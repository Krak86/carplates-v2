import { Inject, Injectable, Logger } from '@nestjs/common'
import { registrations } from '@carplates/db'
import type { PlateCandidate } from '@carplates/shared'
import { inArray } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { plateGroupsWithAlternatives, promoteRegistered } from './registry-rank.js'

@Injectable()
export class RegistryRankService {
  private readonly logger = new Logger(RegistryRankService.name)

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Re-ranks alternative readings of one plate by whether they exist in the registry; the OCR order stands if the lookup fails. */
  async rank(candidates: PlateCandidate[]): Promise<PlateCandidate[]> {
    const plates = plateGroupsWithAlternatives(candidates)
    if (plates.length === 0) return candidates
    try {
      const rows = await this.dbService.db
        .selectDistinct({ plate: registrations.plate })
        .from(registrations)
        .where(inArray(registrations.plate, plates))
      return promoteRegistered(candidates, new Set(rows.flatMap(r => (r.plate ? [r.plate] : []))))
    } catch (err) {
      this.logger.warn(`Registry check of alternative plate reads failed: ${(err as Error).message}`)
      return candidates
    }
  }
}
