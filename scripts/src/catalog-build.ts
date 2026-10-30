/**
 * Rebuilds the model catalog tables (`catalog_alias`, `catalog_model`, `catalog_make`) behind `/cars/:make/:model`:
 * every passenger-car (brand, model) pair of `current_registration` goes through `catalogSlugs` (@carplates/shared), the
 * pairs of one page are summed, and each kept model gets its "In Ukraine" rollup in one grouping-sets pass.
 *
 *   pnpm db:refresh-catalog
 *
 * Known models (never folded, fold targets) come from the MOT real-model list, VehiclesDB, `model_generations` and
 * `catalog-overrides.csv`. Run after `db:refresh-stats` and `ingest:vehiclesdb`; `db:refresh-derived` runs it. Writes only the
 * `catalog_*` tables.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { catalogAlias, catalogMake, catalogModel, catalogYearStats, createDb } from '@carplates/db'
import type { CatalogMakeInsert, CatalogModelInsert, CatalogYearStatsInsert } from '@carplates/db'
import type { CatalogStats, CatalogYearStats } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { parseCatalogOverrides } from './catalog-overrides.js'
import { buildTaxonomy, makeNameFromSlug, modelNameFromKey } from './catalog-taxonomy.js'
import type { AliasRow, ModelAgg, RawPair } from './catalog-taxonomy.js'

const PASSENGER_KIND = 'ЛЕГКОВИЙ'
const BATCH = 2000
/** Years with fewer cars than this share of the model are registry noise, not part of its year range. */
const YEAR_NOISE_SHARE = 0.001
const TOP = { fuel: 8, body: 6, color: 8, regions: 10 }
/** Per-year lists are capped harder: a model has up to ~40 years, and the generation stats sum several of them. */
const TOP_PER_YEAR = 5
/** MOT keys are `kind|makeKey|modelKey`, with the UK's make names. */
const MOT_MAKE_TO_REGISTRY: Readonly<Record<string, string>> = { vauxhall: 'opel' }

const log = (...m: unknown[]): void => {
  console.log(...m)
}

function loadKnown(extra: readonly string[]): Set<string> {
  const mot = JSON.parse(readFileSync(resolve(import.meta.dirname, 'mot-real-models.json'), 'utf8')) as string[]
  const known = new Set<string>(extra)
  for (const k of mot) {
    const [, make = '', model = ''] = k.split('|')
    known.add(`${MOT_MAKE_TO_REGISTRY[make] ?? make}|${model}`)
  }
  return known
}

type Dim = 'year' | 'fuel' | 'body' | 'color' | 'region' | 'regYear'
const DIMS: readonly Dim[] = ['year', 'fuel', 'body', 'color', 'region', 'regYear']
/** `GROUPING(year, fuel, …)` bitmask of the set that groups only `dim` (the first argument is the highest bit). */
const groupingOf = (dim: Dim): number => 63 - (1 << (DIMS.length - 1 - DIMS.indexOf(dim)))

type StatRow = {
  make_slug: string
  model_slug: string
  g: number
  year: number | null
  fuel: string | null
  body: string | null
  color: string | null
  region: string | null
  reg_year: number | null
  n: number
}

type Counts = [string, number][]
const emptyStats = (): CatalogStats => ({ years: [], registered: [], fuel: [], body: [], color: [], regions: [] })
const top = (rows: Counts, k: number): Counts => rows.sort((a, b) => b[1] - a[1]).slice(0, k)
const byLabel = (rows: Counts): Counts => rows.sort((a, b) => Number(a[0]) - Number(b[0]))

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const overrides = parseCatalogOverrides(readFileSync(resolve(import.meta.dirname, 'catalog-overrides.csv'), 'utf8'))

    const total = await db.execute<{ n: string }>(sql`SELECT count(*)::text AS n FROM registry.registrations`)
    log(`registry rows: ${total.rows[0]?.n ?? '?'} (read-only; only catalog_* tables are written)`)

    const { rows: pairs } = await db.execute<RawPair>(sql`
      SELECT brand, model, count(*)::int AS n
      FROM registry.current_registration
      WHERE kind = ${PASSENGER_KIND} AND brand IS NOT NULL AND model IS NOT NULL
      GROUP BY brand, model
    `)
    const known = loadKnown(overrides.known)
    const vdb = await db.execute<{ make_key: string; model_key: string; make_name: string; model_name: string }>(
      sql`SELECT make_key, model_key, make_name, model_name FROM registry.vdb_models`
    )
    const gens = await db.execute<{ make_key: string; model_key: string; make: string; model: string }>(
      sql`SELECT DISTINCT make_key, model_key, make, model FROM registry.model_generations`
    )
    const makeNames = new Map<string, string>()
    const modelNames = new Map<string, string>()
    for (const r of [...vdb.rows, ...gens.rows.map(g => ({ ...g, make_name: g.make, model_name: g.model }))]) {
      const key = `${r.make_key}|${r.model_key}`
      known.add(key)
      makeNames.set(r.make_key, makeNames.get(r.make_key) ?? r.make_name)
      modelNames.set(key, modelNames.get(key) ?? r.model_name)
    }
    log(`${pairs.length} passenger pair(s), ${known.size} known model(s)`)

    const { aliases, models } = buildTaxonomy(pairs, known, overrides)
    log(
      `${aliases.length} aliased pair(s) -> ${models.length} model page(s), ${models.filter(m => m.indexable).length} indexable`
    )

    const { stats, byYear } = await rollup(db, models, aliases)

    const makeAgg = new Map<string, CatalogMakeInsert>()
    const modelRows: CatalogModelInsert[] = models.map(m => {
      const mk = m.makeSlug.replace(/[^a-z0-9]/g, '')
      const makeName = makeNames.get(mk) ?? makeNameFromSlug(m.makeSlug)
      const modelName =
        overrides.names.get(`${m.makeSlug}/${m.modelSlug}`) ??
        modelNames.get(`${mk}|${m.modelSlug}`) ??
        modelNameFromKey(m.modelSlug, m.topModel)
      const s = stats.get(`${m.makeSlug}/${m.modelSlug}`) ?? emptyStats()
      const noise = Math.max(3, m.n * YEAR_NOISE_SHARE)
      const years = s.years.filter(([, n]) => n >= noise).map(([y]) => Number(y))
      const make = makeAgg.get(m.makeSlug) ?? { makeSlug: m.makeSlug, makeName, n: 0, models: 0 }
      make.n += m.n
      make.models++
      makeAgg.set(m.makeSlug, make)
      return {
        makeSlug: m.makeSlug,
        modelSlug: m.modelSlug,
        makeName,
        modelName,
        n: m.n,
        yearMin: years.length ? Math.min(...years) : null,
        yearMax: years.length ? Math.max(...years) : null,
        topRawBrand: m.topBrand,
        topRawModel: m.topModel,
        kindGroup: PASSENGER_KIND,
        rank: m.rank,
        indexable: m.indexable,
        stats: s
      }
    })

    await db.transaction(async tx => {
      await tx.execute(
        sql`TRUNCATE registry.catalog_alias, registry.catalog_model, registry.catalog_make, registry.catalog_year_stats`
      )
      for (let i = 0; i < aliases.length; i += BATCH) await tx.insert(catalogAlias).values(aliases.slice(i, i + BATCH))
      for (let i = 0; i < modelRows.length; i += 200) await tx.insert(catalogModel).values(modelRows.slice(i, i + 200))
      await tx.insert(catalogMake).values([...makeAgg.values()])
      const yearRows: CatalogYearStatsInsert[] = [...byYear].map(([key, stats]) => {
        const [makeSlug = '', modelSlug = ''] = key.split('/')
        return { makeSlug, modelSlug, byYear: stats }
      })
      for (let i = 0; i < yearRows.length; i += 200)
        await tx.insert(catalogYearStats).values(yearRows.slice(i, i + 200))
    })
    log(`wrote ${aliases.length} alias(es), ${modelRows.length} model(s), ${makeAgg.size} make(s)`)
    for (const m of modelRows.slice(0, 15))
      log(`  ${m.rank}. ${m.makeSlug}/${m.modelSlug} (${m.makeName} ${m.modelName}) n=${m.n}`)
  } finally {
    await close()
  }
}

/** One scan of `current_registration` (joined to a temp table of the kept models' raw pairs) for every kept model's rollup. */
async function rollup(
  db: ReturnType<typeof createDb>['db'],
  models: readonly ModelAgg[],
  aliases: readonly AliasRow[]
): Promise<{ stats: Map<string, CatalogStats>; byYear: Map<string, CatalogYearStats> }> {
  const kept = new Set(models.map(m => `${m.makeSlug}/${m.modelSlug}`))
  const pairs = aliases.filter(a => kept.has(`${a.makeSlug}/${a.modelSlug}`))
  const out = new Map<string, CatalogStats>()
  const byYear = new Map<string, CatalogYearStats>()
  const year = new Date().getFullYear()

  await db.transaction(async tx => {
    await tx.execute(
      sql`CREATE TEMP TABLE catalog_pair (brand text, model text, make_slug text, model_slug text) ON COMMIT DROP`
    )
    for (let i = 0; i < pairs.length; i += 5000) {
      const part = pairs.slice(i, i + 5000)
      await tx.execute(sql`
        INSERT INTO catalog_pair
        SELECT * FROM unnest(${sql.param(part.map(p => p.brand))}::text[], ${sql.param(part.map(p => p.model))}::text[],
                             ${sql.param(part.map(p => p.makeSlug))}::text[], ${sql.param(part.map(p => p.modelSlug))}::text[])
      `)
    }
    await tx.execute(sql`CREATE INDEX ON catalog_pair (brand, model)`)
    await tx.execute(sql`ANALYZE catalog_pair`)

    const { rows } = await tx.execute<StatRow>(sql`
      SELECT make_slug, model_slug,
             GROUPING(year, fuel, body, color, region, reg_year)::int AS g,
             year, fuel, body, color, region, reg_year, count(*)::int AS n
      FROM (
        SELECT p.make_slug, p.model_slug,
               CASE WHEN c.make_year BETWEEN 1950 AND ${year + 1} THEN c.make_year END AS year,
               c.fuel, c.body, c.color, r.region,
               CASE WHEN c.d_reg IS NOT NULL THEN extract(year FROM c.d_reg)::int END AS reg_year
        FROM registry.current_registration c
        JOIN catalog_pair p ON p.brand = c.brand AND p.model = c.model
        LEFT JOIN registry.plate_regions r ON r.prefix = left(c.plate, 2)
        WHERE c.kind = ${PASSENGER_KIND}
      ) s
      GROUP BY s.make_slug, s.model_slug, GROUPING SETS ((year), (fuel), (body), (color), (region), (reg_year))
    `)
    const grouped = new Map<string, Record<Dim, Counts>>()
    for (const r of rows) {
      const key = `${r.make_slug}/${r.model_slug}`
      let g = grouped.get(key)
      if (!g) {
        g = { year: [], fuel: [], body: [], color: [], region: [], regYear: [] }
        grouped.set(key, g)
      }
      const dim = DIMS.find(d => groupingOf(d) === r.g)
      const value = dim === 'regYear' ? r.reg_year : dim ? r[dim] : null
      if (dim && value !== null && value !== undefined) g[dim].push([String(value), r.n])
    }

    // Same scan shape, per make year: each year's total and its top fuel / body / colour / regions (generation stats).
    const perYear = await tx.execute<{
      make_slug: string
      model_slug: string
      g: number
      year: number
      fuel: string | null
      body: string | null
      color: string | null
      region: string | null
      n: number
    }>(sql`
      SELECT make_slug, model_slug, GROUPING(fuel, body, color, region)::int AS g, year, fuel, body, color, region, count(*)::int AS n
      FROM (
        SELECT p.make_slug, p.model_slug, c.make_year AS year, c.fuel, c.body, c.color, r.region
        FROM registry.current_registration c
        JOIN catalog_pair p ON p.brand = c.brand AND p.model = c.model
        LEFT JOIN registry.plate_regions r ON r.prefix = left(c.plate, 2)
        WHERE c.kind = ${PASSENGER_KIND} AND c.make_year BETWEEN 1950 AND ${year + 1}
      ) s
      GROUP BY s.make_slug, s.model_slug, s.year, GROUPING SETS ((), (fuel), (body), (color), (region))
    `)
    const perYearAcc = new Map<string, Map<number, CatalogYearStats['byYear'][string]>>()
    for (const r of perYear.rows) {
      const key = `${r.make_slug}/${r.model_slug}`
      const years = perYearAcc.get(key) ?? new Map()
      perYearAcc.set(key, years)
      const row = years.get(r.year) ?? { n: 0, fuel: [], body: [], color: [], regions: [] }
      years.set(r.year, row)
      // GROUPING(fuel, body, color, region): 15 = no dimension (the year total), then one bit cleared per grouped column.
      if (r.g === 15) row.n = r.n
      else if (r.g === 7 && r.fuel) row.fuel.push([r.fuel, r.n])
      else if (r.g === 11 && r.body) row.body.push([r.body, r.n])
      else if (r.g === 13 && r.color) row.color.push([r.color, r.n])
      else if (r.g === 14 && r.region) row.regions.push([r.region, r.n])
    }
    for (const [key, years] of perYearAcc) {
      const rows: CatalogYearStats['byYear'] = {}
      for (const [y, row] of years) {
        rows[String(y)] = {
          n: row.n,
          fuel: top(row.fuel, TOP_PER_YEAR),
          body: top(row.body, TOP_PER_YEAR),
          color: top(row.color, TOP_PER_YEAR),
          regions: top(row.regions, TOP_PER_YEAR)
        }
      }
      byYear.set(key, { byYear: rows })
    }

    const pct = await tx.execute<{ make_slug: string; model_slug: string; cap: number | null; pwr: number | null }>(sql`
      SELECT p.make_slug, p.model_slug,
             percentile_disc(0.5) WITHIN GROUP (ORDER BY c.capacity) FILTER (WHERE c.capacity > 0) AS cap,
             percentile_disc(0.5) WITHIN GROUP (ORDER BY c.power_kwt) FILTER (WHERE c.power_kwt > 0) AS pwr
      FROM registry.current_registration c
      JOIN catalog_pair p ON p.brand = c.brand AND p.model = c.model
      WHERE c.kind = ${PASSENGER_KIND}
      GROUP BY p.make_slug, p.model_slug
    `)
    const medians = new Map(pct.rows.map(r => [`${r.make_slug}/${r.model_slug}`, r]))

    for (const [key, g] of grouped) {
      const med = medians.get(key)
      out.set(key, {
        years: byLabel(g.year),
        registered: byLabel(g.regYear),
        fuel: top(g.fuel, TOP.fuel),
        body: top(g.body, TOP.body),
        color: top(g.color, TOP.color),
        regions: top(g.region, TOP.regions),
        capacityP50: med?.cap ?? null,
        powerP50: med?.pwr ?? null
      })
    }
  })
  return { stats: out, byYear }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
