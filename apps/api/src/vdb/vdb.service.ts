import { Inject, Injectable } from '@nestjs/common'
import { vdbModels } from '@carplates/db'
import {
  displayAliases,
  isUkraineOnly,
  makeKey,
  makeSynonymAliases,
  matchVdbModelAcrossMakes,
  vdbCatalogKinds,
  vdbRelatedMakeKeys,
  vdbVehicleClass
} from '@carplates/shared'
import type { VdbResponse } from '@carplates/shared'
import { inArray } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Injectable()
export class VdbService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Persisted catalog (pnpm ingest:vehiclesdb); matching lives in `@carplates/shared` (`matchVdbModel`). */
  async lookup(brand: string, model: string, registryKind?: string): Promise<VdbResponse> {
    const mk = makeKey(brand)
    if (!mk) return { brand, model, match: null }

    // No kind = the original any-kind lookup; a kind the catalog can't speak for (trailers, special vehicles) = no match.
    const cls = registryKind ? vdbVehicleClass(registryKind) : 'car'
    if (!cls) return { brand, model, match: null }
    const kinds = vdbCatalogKinds(cls)

    const rows = await this.dbService.db
      .select()
      .from(vdbModels)
      .where(inArray(vdbModels.makeKey, vdbRelatedMakeKeys(mk, model)))
    const found = matchVdbModelAcrossMakes(rows, mk, model, kinds)
    if (!found) return { brand, model, match: null }

    const { row, how } = found
    return {
      brand,
      model,
      match: {
        makeName: row.makeName,
        modelName: row.modelName,
        how,
        bodyTypes: row.bodyTypes,
        countries: row.countries,
        globalDecile: row.globalDecile,
        uaOnly: isUkraineOnly(row),
        crossMake: row.makeKey !== mk,
        aliases: [
          ...new Set([...makeSynonymAliases(mk, row.modelName), ...displayAliases(row.aliases, row.modelName)])
        ].filter(a => a.toLowerCase() !== `${row.makeName} ${row.modelName}`.toLowerCase())
      }
    }
  }
}
