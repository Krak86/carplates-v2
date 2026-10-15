/**
 * Rebuilds `registry.stats_spec` — the /stats highest / lowest passenger-car boards for power, engine displacement,
 * height, length and fuel tank — from `current_registration`, `rdw_specs` and `model_spec_wiki`.
 *
 *   pnpm db:refresh-spec-stats
 *
 * Power and displacement come straight from the registry (5th / 95th percentile of the model's cars, after a sanity
 * range: the columns carry typos). Height, length and fuel tank are catalogue figures the registry does not hold, so each
 * Ukrainian model is matched (the shared `matchRdwModel`) to its RDW row (measured year-medians; no tank there) and,
 * where RDW has none, to its Wikipedia generations (`ingest:wikispecs`); the model's edges are the lowest / highest value
 * over its years or generations. Re-run after a registry, RDW or wikispecs ingest; `db:refresh-derived` does it.
 */
import { createDb, statsDistribution, statsSpec } from '@carplates/db'
import type { StatsDistributionInsert, StatsSpecInsert } from '@carplates/db'
import {
  DISTRIBUTION_BUCKET_WIDTH,
  makeKey,
  matchRdwModel,
  RDW_MIN_DISPLAY_N,
  SPEC_METRIC_COLUMN,
  vdbRelatedMakeKeys,
  type RdwReferenceRow
} from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000
/** A model needs this many registry passenger cars to be ranked at all (the API raises the bar). */
const MIN_VEHICLES = 200
const PASSENGER_KIND = 'ЛЕГКОВИЙ'
/** Real passenger-car ranges; values outside are typos (a 3 kW or 9 999 cc "car"). */
const POWER_KW_RANGE = [15, 900] as const
const DISPLACEMENT_CC_RANGE = [500, 9000] as const
/** Sane own mass (kg) for the power-to-weight histogram; the column carries typos. */
const OWN_WEIGHT_RANGE = [600, 4000] as const
/** Metric horsepower per kW (same constant as the web's `kwToHp`). */
const HP_PER_KW = 1.35962

/** Model edges are the 5th / 95th percentile: power and capacity typos reach a few percent of a model (a 835 kW Kyron at the 99th). */
const EDGE_LO = 0.05
const EDGE_HI = 0.95
/** Pure electric cars carry a placeholder capacity; they have no displacement to rank. */
const ELECTRIC_FUEL = 'ЕЛЕКТРО'

type Edge = RdwReferenceRow & { source: 'rdw' | 'wiki'; lo: number; hi: number }
type RegistryRow = {
  brand: string
  model: string
  n: number
  powerLo: number | null
  powerHi: number | null
  ccLo: number | null
  ccHi: number | null
}
type RdwRow = {
  makeKey: string
  modelKey: string
  make: string
  model: string
  lenLo: number | null
  lenHi: number | null
  heightLo: number | null
  heightHi: number | null
}
type WikiRow = {
  makeKey: string
  modelKey: string
  lenLo: number | null
  lenHi: number | null
  heightLo: number | null
  heightHi: number | null
  tankLo: number | null
  tankHi: number | null
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const METRIC = {
  power: SPEC_METRIC_COLUMN.power.key,
  displacement: SPEC_METRIC_COLUMN.displacement.key,
  height: SPEC_METRIC_COLUMN.height.key,
  length: SPEC_METRIC_COLUMN.length.key,
  fuelTank: SPEC_METRIC_COLUMN.fuelTank.key
} as const

/** Reference rows of one metric: RDW first, then Wikipedia for models RDW has no figure for. */
function edgeIndex(
  rdw: readonly RdwRow[],
  wiki: readonly WikiRow[],
  rdwEdges: (r: RdwRow) => [number | null, number | null],
  wikiEdges: (r: WikiRow) => [number | null, number | null]
): Map<string, Edge[]> {
  const byMake = new Map<string, Edge[]>()
  const seen = new Set<string>()
  const add = (e: Edge): void => {
    seen.add(`${e.makeKey}|${e.modelKey}`)
    byMake.set(e.makeKey, [...(byMake.get(e.makeKey) ?? []), e])
  }
  for (const r of rdw) {
    const [lo, hi] = rdwEdges(r)
    if (lo == null || hi == null) continue
    add({
      kind: 'car',
      makeKey: r.makeKey,
      modelKey: r.modelKey,
      aliases: [],
      make: r.make,
      model: r.model,
      source: 'rdw',
      lo,
      hi
    })
  }
  for (const r of wiki) {
    if (seen.has(`${r.makeKey}|${r.modelKey}`)) continue
    const [lo, hi] = wikiEdges(r)
    if (lo == null || hi == null) continue
    add({
      kind: 'car',
      makeKey: r.makeKey,
      modelKey: r.modelKey,
      aliases: [],
      make: r.makeKey,
      model: r.modelKey,
      source: 'wiki',
      lo,
      hi
    })
  }
  return byMake
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    // RDW: year-medians over well-sampled years only (a thin year can't set a record); lengths are cm -> mm.
    const { rows: rdw } = await db.execute<RdwRow>(sql`
      SELECT make_key AS "makeKey", model_key AS "modelKey", max(make) AS make, max(model) AS model,
             (min(length_cm_median) FILTER (WHERE length_cm_n >= ${RDW_MIN_DISPLAY_N} AND length_cm_median > 0) * 10)::float8 AS "lenLo",
             (max(length_cm_median) FILTER (WHERE length_cm_n >= ${RDW_MIN_DISPLAY_N}) * 10)::float8 AS "lenHi",
             (min(height_cm_median) FILTER (WHERE height_cm_n >= ${RDW_MIN_DISPLAY_N} AND height_cm_median > 0) * 10)::float8 AS "heightLo",
             (max(height_cm_median) FILTER (WHERE height_cm_n >= ${RDW_MIN_DISPLAY_N}) * 10)::float8 AS "heightHi"
      FROM registry.rdw_specs
      WHERE kind = 'car'
      GROUP BY make_key, model_key
    `)
    const { rows: wiki } = await db.execute<WikiRow>(sql`
      SELECT make_key AS "makeKey", model_key AS "modelKey",
             (min(length_mm) FILTER (WHERE length_mm > 0))::float8 AS "lenLo", max(length_mm)::float8 AS "lenHi",
             (min(height_mm) FILTER (WHERE height_mm > 0))::float8 AS "heightLo", max(height_mm)::float8 AS "heightHi",
             (min(fuel_tank_l) FILTER (WHERE fuel_tank_l > 0))::float8 AS "tankLo", max(fuel_tank_l)::float8 AS "tankHi"
      FROM registry.model_spec_wiki
      GROUP BY make_key, model_key
    `)
    log(`loaded ${rdw.length} RDW and ${wiki.length} Wikipedia model(s)`)

    const dims = {
      [METRIC.length]: edgeIndex(
        rdw,
        wiki,
        r => [r.lenLo, r.lenHi],
        r => [r.lenLo, r.lenHi]
      ),
      [METRIC.height]: edgeIndex(
        rdw,
        wiki,
        r => [r.heightLo, r.heightHi],
        r => [r.heightLo, r.heightHi]
      ),
      // RDW has no tank figure.
      [METRIC.fuelTank]: edgeIndex(
        [],
        wiki,
        () => [null, null],
        r => [r.tankLo, r.tankHi]
      )
    }

    // Passenger cars grouped like weight-stats (brand tidied so "ЗАЗ  1102" / "ЗАЗ" group together).
    const { rows: registry } = await db.execute<RegistryRow>(sql`
      SELECT brand, model, count(*)::int AS n,
             (percentile_cont(${EDGE_LO}) WITHIN GROUP (ORDER BY power_kwt) FILTER (WHERE power_kwt BETWEEN ${POWER_KW_RANGE[0]} AND ${POWER_KW_RANGE[1]}))::float8 AS "powerLo",
             (percentile_cont(${EDGE_HI}) WITHIN GROUP (ORDER BY power_kwt) FILTER (WHERE power_kwt BETWEEN ${POWER_KW_RANGE[0]} AND ${POWER_KW_RANGE[1]}))::float8 AS "powerHi",
             (percentile_cont(${EDGE_LO}) WITHIN GROUP (ORDER BY capacity) FILTER (WHERE fuel IS DISTINCT FROM ${ELECTRIC_FUEL} AND capacity BETWEEN ${DISPLACEMENT_CC_RANGE[0]} AND ${DISPLACEMENT_CC_RANGE[1]}))::float8 AS "ccLo",
             (percentile_cont(${EDGE_HI}) WITHIN GROUP (ORDER BY capacity) FILTER (WHERE fuel IS DISTINCT FROM ${ELECTRIC_FUEL} AND capacity BETWEEN ${DISPLACEMENT_CC_RANGE[0]} AND ${DISPLACEMENT_CC_RANGE[1]}))::float8 AS "ccHi"
      FROM (
        SELECT power_kwt, capacity, fuel, model,
               btrim(CASE WHEN tidy LIKE '% ' || model THEN left(tidy, length(tidy) - length(model) - 1) ELSE tidy END) AS brand
        FROM (
          SELECT power_kwt, capacity, fuel, model, btrim(regexp_replace(brand, '[[:space:]]+', ' ', 'g')) AS tidy
          FROM registry.current_registration
          WHERE brand IS NOT NULL AND model IS NOT NULL AND kind = ${PASSENGER_KIND}
        ) cleaned
      ) t
      WHERE brand <> ''
      GROUP BY brand, model
      HAVING count(*) >= ${MIN_VEHICLES}
    `)
    log(`${registry.length} registry passenger model group(s)`)

    const out = new Map<string, StatsSpecInsert>()
    const put = (
      metric: string,
      source: string,
      brand: string,
      model: string,
      n: number,
      lo: number,
      hi: number
    ): void => {
      const key = `${metric}|${brand}|${model}`
      const cur = out.get(key)
      if (cur) {
        cur.n += n
        cur.minVal = Math.min(cur.minVal, lo)
        cur.maxVal = Math.max(cur.maxVal, hi)
      } else out.set(key, { metric, source, brand, model, n, minVal: lo, maxVal: hi })
    }
    // Registry spellings of one reference model merge (counts add, the biggest spelling names the row).
    const merged = new Map<string, { row: StatsSpecInsert; top: number }>()

    for (const r of registry) {
      if (r.powerLo != null && r.powerHi != null)
        put(METRIC.power, 'registry', r.brand, r.model, r.n, r.powerLo, r.powerHi)
      if (r.ccLo != null && r.ccHi != null) put(METRIC.displacement, 'registry', r.brand, r.model, r.n, r.ccLo, r.ccHi)

      const mk = makeKey(r.brand)
      if (!mk) continue
      for (const [metric, index] of Object.entries(dims)) {
        const candidates = vdbRelatedMakeKeys(mk, r.model).flatMap(k => index.get(k) ?? [])
        const found = matchRdwModel(candidates, mk, r.model, 'car')
        if (!found) continue
        const { row } = found
        const key = `${metric}|${row.makeKey}|${row.modelKey}`
        const cur = merged.get(key)
        if (!cur) {
          merged.set(key, {
            row: { metric, source: row.source, brand: r.brand, model: r.model, n: r.n, minVal: row.lo, maxVal: row.hi },
            top: r.n
          })
        } else {
          cur.row.n += r.n
          if (r.n > cur.top) {
            cur.top = r.n
            cur.row.brand = r.brand
            cur.row.model = r.model
          }
        }
      }
    }
    for (const { row } of merged.values()) {
      const key = `${row.metric}|${row.brand}|${row.model}`
      if (!out.has(key)) out.set(key, row)
    }
    const values = [...out.values()]

    // Fleet histograms for the card's percentile bars: one SQL pass per metric over the sane-range passenger cars.
    const histogram = (
      metric: string,
      width: number,
      expr: ReturnType<typeof sql>,
      where: ReturnType<typeof sql>
    ): ReturnType<typeof sql> =>
      sql`SELECT ${metric}::text AS metric, (floor((${expr})::float8 / ${width}::int) * ${width}::int)::int AS bucket, count(*)::int AS n
          FROM registry.current_registration
          WHERE kind = ${PASSENGER_KIND} AND ${where}
          GROUP BY 2`
    const { rows: distribution } = await db.execute<StatsDistributionInsert>(sql`
      ${histogram('power_kw', DISTRIBUTION_BUCKET_WIDTH.power_kw, sql`power_kwt`, sql`power_kwt BETWEEN ${POWER_KW_RANGE[0]} AND ${POWER_KW_RANGE[1]}`)}
      UNION ALL
      ${histogram(
        'hp_per_tonne',
        DISTRIBUTION_BUCKET_WIDTH.hp_per_tonne,
        sql`power_kwt * ${HP_PER_KW}::float8 / own_weight * 1000`,
        sql`power_kwt BETWEEN ${POWER_KW_RANGE[0]} AND ${POWER_KW_RANGE[1]} AND own_weight BETWEEN ${OWN_WEIGHT_RANGE[0]} AND ${OWN_WEIGHT_RANGE[1]}`
      )}
      UNION ALL
      ${histogram(
        'displacement_cc',
        DISTRIBUTION_BUCKET_WIDTH.displacement_cc,
        sql`capacity`,
        sql`fuel IS DISTINCT FROM ${ELECTRIC_FUEL} AND capacity BETWEEN ${DISPLACEMENT_CC_RANGE[0]} AND ${DISPLACEMENT_CC_RANGE[1]}`
      )}
    `)

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_spec`)
      for (let i = 0; i < values.length; i += BATCH) await tx.insert(statsSpec).values(values.slice(i, i + BATCH))
      await tx.execute(sql`TRUNCATE registry.stats_distribution`)
      if (distribution.length > 0) await tx.insert(statsDistribution).values(distribution)
    })
    log(`wrote ${distribution.length} distribution bucket(s)`)
    const byMetric = new Map<string, number>()
    for (const v of values) byMetric.set(v.metric, (byMetric.get(v.metric) ?? 0) + 1)
    log(`wrote ${values.length} spec row(s):`, Object.fromEntries(byMetric))
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
