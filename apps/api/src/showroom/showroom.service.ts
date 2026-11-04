import { Inject, Injectable } from '@nestjs/common'
import { carModels360, carModels3d, oemLinks, tuningLinks, winner360 } from '@carplates/db'
import {
  MAX_MODELS_3D,
  SHOWROOM_PAGE_SIZE,
  showroomHas,
  showroomMatches,
  showroomTitleize,
  tuningKey,
  tuningMakeKey,
  winner360ModelSlug
} from '@carplates/shared'
import type { ShowroomDetail, ShowroomFilter, ShowroomItem, ShowroomList } from '@carplates/shared'
import { and, count, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** The catalog changes only on an ingest (`pnpm ingest:sketchfab|carshow360|winner360|3dtuning`), so it is rebuilt once an hour. */
const CATALOG_TTL_MS = 3_600_000

type Query = { q?: string; kind: ShowroomFilter; offset: number; limit?: number }

/** Entries are keyed on our make slug + the squashed model key (`tuningKey`), so `Golf` and `golf` are one entry. */
const keyOf = (brandSlug: string, modelSlug: string): string => `${tuningMakeKey(brandSlug)}/${tuningKey(modelSlug)}`

const titleOf = (brandSlug: string, modelSlug: string): string =>
  `${showroomTitleize(brandSlug)} ${showroomTitleize(modelSlug)}`

@Injectable()
export class ShowroomService {
  private cached: { items: ShowroomItem[]; at: number } | null = null

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async list({ q, kind, offset, limit = SHOWROOM_PAGE_SIZE }: Query): Promise<ShowroomList> {
    const all = await this.catalog()
    const counts = {
      all: all.length,
      '360': all.filter(i => showroomHas(i, '360')).length,
      '3d': all.filter(i => showroomHas(i, '3d')).length,
      tuning: all.filter(i => showroomHas(i, 'tuning')).length,
      oem: all.filter(i => showroomHas(i, 'oem')).length
    }
    const hits = all.filter(i => showroomHas(i, kind) && (!q || showroomMatches(i, q)))
    return { items: hits.slice(offset, offset + limit), total: hits.length, counts }
  }

  /** Everything one entry opens (the shapes the car-card modals take), looked up by the slugs the list returned. */
  async detail(brandSlug: string, modelSlug: string): Promise<ShowroomDetail | null> {
    const { db } = this.dbService

    const [rows3d, rows360, rowsWinner, tuningRows, oemRows] = await Promise.all([
      db
        .select()
        .from(carModels3d)
        .where(and(eq(carModels3d.brandSlug, brandSlug), eq(carModels3d.modelSlug, modelSlug)))
        .orderBy(desc(carModels3d.likeCount))
        .limit(MAX_MODELS_3D),
      db
        .select()
        .from(carModels360)
        .where(and(eq(carModels360.brandSlug, brandSlug), eq(carModels360.modelSlug, modelSlug)))
        .orderBy(desc(carModels360.id)),
      db.select().from(winner360).where(eq(winner360.brandSlug, brandSlug)),
      // ~2.5k small rows and slugs differ in punctuation (`alfa-romeo` / `alfa.romeo`), so they are compared squashed, in memory.
      db.select().from(tuningLinks),
      // A few dozen rows; compared squashed, in memory, like the tuning pages.
      db.select().from(oemLinks)
    ])
    const oem = oemRows
      .filter(
        r => tuningMakeKey(r.makeSlug) === tuningMakeKey(brandSlug) && tuningKey(r.modelSlug) === tuningKey(modelSlug)
      )
      .sort((a, b) => a.variant.localeCompare(b.variant) || a.kind.localeCompare(b.kind))
    const winnerRows = rowsWinner
      .filter(r => winner360ModelSlug(r.model) === modelSlug)
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    const tuning = tuningRows
      .filter(
        r => tuningMakeKey(r.makeSlug) === tuningMakeKey(brandSlug) && tuningKey(r.modelSlug) === tuningKey(modelSlug)
      )
      .sort((a, b) => b.startYear - a.startYear)
    if (rows3d.length + rows360.length + winnerRows.length + tuning.length + oem.length === 0) return null

    const entry = (await this.catalog()).find(i => keyOf(i.brandSlug, i.modelSlug) === keyOf(brandSlug, modelSlug))
    return {
      label: entry?.label ?? titleOf(brandSlug, modelSlug),
      models3d: rows3d.map(r => ({
        uid: r.uid,
        name: r.name,
        year: r.year,
        authorName: r.authorName,
        authorUrl: r.authorUrl,
        thumbUrl: r.thumbUrl,
        viewCount: r.viewCount,
        likeCount: r.likeCount,
        license: r.license
      })),
      models360: rows360.map(r => ({
        id: r.id,
        brandSlug: r.brandSlug,
        modelSlug: r.modelSlug,
        slug: r.slug,
        label: r.label,
        title: r.title
      })),
      winner: winnerRows.map(r => ({ photoRecid: r.photoRecid, year: r.year, version: r.version, fuel: r.fuel })),
      tuning: tuning.map(r => ({ path: r.path, body: r.body, generation: r.generation, startYear: r.startYear })),
      oem: oem.flatMap(r =>
        r.kind === 'configurator' || r.kind === 'model-page' ? [{ url: r.url, variant: r.variant, kind: r.kind }] : []
      )
    }
  }

  /** One entry per make/model across the four persisted catalogs; most immersive kinds first, then by label. */
  private async catalog(): Promise<ShowroomItem[]> {
    if (this.cached && Date.now() - this.cached.at < CATALOG_TTL_MS) return this.cached.items
    const { db } = this.dbService

    const [rows3d, rows360, rowsWinner, rowsTuning, rowsOem] = await Promise.all([
      db
        .select({
          brandSlug: carModels3d.brandSlug,
          modelSlug: carModels3d.modelSlug,
          modelName: sql<string>`max(${carModels3d.modelName})`,
          n: count(),
          thumbUrl: sql<
            string | null
          >`(array_agg(${carModels3d.thumbUrl} order by ${carModels3d.likeCount} desc) filter (where ${carModels3d.thumbUrl} is not null))[1]`
        })
        .from(carModels3d)
        .groupBy(carModels3d.brandSlug, carModels3d.modelSlug),
      db
        .select({ brandSlug: carModels360.brandSlug, modelSlug: carModels360.modelSlug, n: count() })
        .from(carModels360)
        .groupBy(carModels360.brandSlug, carModels360.modelSlug),
      db
        .select({ brandSlug: winner360.brandSlug, brand: winner360.brand, model: winner360.model, n: count() })
        .from(winner360)
        .groupBy(winner360.brandSlug, winner360.brand, winner360.model),
      db
        .select({ makeSlug: tuningLinks.makeSlug, modelSlug: tuningLinks.modelSlug, n: count() })
        .from(tuningLinks)
        .groupBy(tuningLinks.makeSlug, tuningLinks.modelSlug),
      db
        .select({ makeSlug: oemLinks.makeSlug, modelSlug: oemLinks.modelSlug, n: count() })
        .from(oemLinks)
        .groupBy(oemLinks.makeSlug, oemLinks.modelSlug)
    ])

    const items = new Map<string, ShowroomItem>()
    const names = new Map<string, string>()
    const touch = (brandSlug: string, modelSlug: string): ShowroomItem => {
      const key = keyOf(brandSlug, modelSlug)
      let item = items.get(key)
      if (!item) {
        item = { brandSlug, modelSlug, label: '', n360: 0, n3d: 0, nTuning: 0, nOem: 0, thumbUrl: null }
        items.set(key, item)
      }
      return item
    }

    for (const r of rows3d) {
      const item = touch(r.brandSlug, r.modelSlug)
      item.n3d += r.n
      item.thumbUrl ??= r.thumbUrl
      names.set(keyOf(r.brandSlug, r.modelSlug), `${showroomTitleize(r.brandSlug)} ${r.modelName}`)
    }
    for (const r of rows360) touch(r.brandSlug, r.modelSlug).n360 += r.n
    for (const r of rowsWinner) {
      const modelSlug = winner360ModelSlug(r.model)
      touch(r.brandSlug, modelSlug).n360 += r.n
      const key = keyOf(r.brandSlug, modelSlug)
      if (!names.has(key)) names.set(key, `${r.brand} ${r.model}`)
    }
    // 3DTuning's own slugs only create an entry when no other catalog knows the model.
    for (const r of rowsTuning) touch(r.makeSlug, r.modelSlug).nTuning += r.n
    for (const r of rowsOem) touch(r.makeSlug, r.modelSlug).nOem += r.n

    const list = [...items.entries()].map(([key, item]) => ({
      ...item,
      label: names.get(key) ?? titleOf(item.brandSlug, item.modelSlug)
    }))
    const kinds = (i: ShowroomItem): number =>
      Number(i.n360 > 0) + Number(i.n3d > 0) + Number(i.nTuning > 0) + Number(i.nOem > 0)
    list.sort((a, b) => kinds(b) - kinds(a) || a.label.localeCompare(b.label))

    this.cached = { items: list, at: Date.now() }
    return list
  }
}
