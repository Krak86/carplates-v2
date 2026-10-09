/**
 * Rebuilds `registry.stats_weight` — the /stats heaviest / lightest model boards — from `current_registration` + `rdw_specs`.
 *
 *   pnpm db:refresh-weight-stats
 *
 * The registry's own_weight has typos (1 kg, 141 t on a 1.9 t car), so every model is judged on weights that pass a
 * gross-weight check and its edges are the 1st / 99th percentile, not a raw min / max. Passenger cars that RDW knows
 * (the same `matchRdwModel` the Specs block uses) take RDW's type-approval year-medians instead — an independent source.
 * Trucks, buses, motorcycles, trailers and the rest are not in RDW and stay on the registry. Re-run after any registry
 * ingest or `ingest:rdw`; `db:refresh-derived` does it.
 */
import { createDb, statsWeight } from '@carplates/db'
import type { StatsWeightInsert } from '@carplates/db'
import {
  makeKey,
  matchRdwModel,
  RDW_MIN_DISPLAY_N,
  vdbRelatedMakeKeys,
  weightGroupOfKind,
  type RdwReferenceRow
} from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000
/** A model needs this many weight-checked vehicles to be ranked at all (the API raises the bar for passenger cars). */
const MIN_VEHICLES = 200
/** Unladen weight is at least this share of the gross weight; below it the pair is a typo. Cars are tighter than trucks/trailers. */
const MIN_UNLADEN_SHARE_CAR = 0.45
const MIN_UNLADEN_SHARE_OTHER = 0.15
const PASSENGER_KIND = 'ЛЕГКОВИЙ'
/**
 * Lightest real unladen mass (kg) per registry kind; anything below is a fake weight (1 kg, 20 kg) and is ignored. Cars
 * and trucks start at 300; two-wheelers and trailers really do weigh 50-100 kg, so their floor is low.
 */
const MIN_WEIGHT_KG: Readonly<Record<string, number>> = {
  ЛЕГКОВИЙ: 300,
  ВАНТАЖНИЙ: 300,
  АВТОБУС: 500,
  МОТОЦИКЛ: 50,
  МОПЕД: 50,
  КВАДРОЦИКЛ: 50,
  ТРИЦИКЛ: 50,
  МОТОТРИЦИКЛ: 50,
  ПРИЧІП: 50,
  НАПІВПРИЧІП: 50
}
/** The floor for kinds not listed above (specialized / special vehicles). */
const MIN_WEIGHT_KG_DEFAULT = 200

type RdwModel = RdwReferenceRow & { maxN: number; minKg: number; maxKg: number }
type RdwRow = {
  kind: string
  makeKey: string
  modelKey: string
  make: string
  model: string
  maxN: number
  minKg: number | null
  maxKg: number | null
}
type RegistryRow = { kind: string; brand: string; model: string; n: number; lo: number; hi: number }

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    // One row per RDW model; the edges are year-medians over well-sampled years, so a bad entry can't set a record.
    const { rows: rdw } = await db.execute<RdwRow>(sql`
      SELECT kind, make_key AS "makeKey", model_key AS "modelKey", max(make) AS make, max(model) AS model,
             max(n)::int AS "maxN",
             (min(mass_kg_median) FILTER (WHERE n >= ${RDW_MIN_DISPLAY_N} AND mass_kg_median > 0))::float8 AS "minKg",
             (max(mass_kg_median) FILTER (WHERE n >= ${RDW_MIN_DISPLAY_N}))::float8 AS "maxKg"
      FROM registry.rdw_specs
      GROUP BY kind, make_key, model_key
    `)
    const byMake = new Map<string, RdwModel[]>()
    for (const r of rdw) {
      // Passenger cars only: RDW files vans as "truck", and the matcher would otherwise let a Sprinter rank as a car.
      if (r.kind !== 'car' || r.minKg == null || r.maxKg == null) continue
      const model: RdwModel = { ...r, minKg: r.minKg, maxKg: r.maxKg, aliases: [] }
      byMake.set(r.makeKey, [...(byMake.get(r.makeKey) ?? []), model])
    }
    log(`loaded ${rdw.length} RDW model(s) for ${byMake.size} make(s)`)

    // Brand tidied so the registry's "ЗАЗ  1102" / "ЗАЗ" spellings of one model group together.
    const { rows: registry } = await db.execute<RegistryRow>(sql`
      SELECT kind, brand, model, count(*)::int AS n,
             (percentile_cont(0.01) WITHIN GROUP (ORDER BY own_weight))::float8 AS lo,
             (percentile_cont(0.99) WITHIN GROUP (ORDER BY own_weight))::float8 AS hi
      FROM (
        SELECT kind, own_weight, model,
               btrim(CASE WHEN tidy LIKE '% ' || model THEN left(tidy, length(tidy) - length(model) - 1) ELSE tidy END) AS brand
        FROM (
          SELECT kind, own_weight, model, btrim(regexp_replace(brand, '[[:space:]]+', ' ', 'g')) AS tidy
          FROM registry.current_registration
          WHERE brand IS NOT NULL AND model IS NOT NULL AND own_weight >= (CASE kind ${sql.join(
            Object.entries(MIN_WEIGHT_KG).map(([kind, kg]) => sql`WHEN ${kind} THEN ${kg}::int`),
            sql` `
          )} ELSE ${MIN_WEIGHT_KG_DEFAULT}::int END)
            AND total_weight > own_weight
            AND own_weight >= (CASE WHEN kind = ${PASSENGER_KIND} THEN ${MIN_UNLADEN_SHARE_CAR}::numeric ELSE ${MIN_UNLADEN_SHARE_OTHER}::numeric END) * total_weight
        ) cleaned
      ) t
      WHERE brand <> ''
      GROUP BY kind, brand, model
      HAVING count(*) >= ${MIN_VEHICLES}
    `)
    log(`${registry.length} registry model group(s)`)

    // (group, brand, model) -> row. Kinds of one group (moped + motorcycle) merge: counts add, edges widen.
    const rows = new Map<string, StatsWeightInsert>()
    // Passenger cars RDW recognises: registry spellings of one RDW model merge here; the biggest spelling names the row.
    const rdwRows = new Map<string, { row: StatsWeightInsert; top: number }>()
    let matched = 0

    for (const r of registry) {
      const group = weightGroupOfKind(r.kind)
      if (!group) continue

      if (r.kind === PASSENGER_KIND) {
        const mk = makeKey(r.brand)
        const candidates = mk ? vdbRelatedMakeKeys(mk, r.model).flatMap(k => byMake.get(k) ?? []) : []
        const found = mk
          ? (matchRdwModel(
              candidates.filter(m => m.maxN >= RDW_MIN_DISPLAY_N),
              mk,
              r.model,
              'car'
            ) ?? matchRdwModel(candidates, mk, r.model, 'car'))
          : null
        if (found) {
          matched += r.n
          const { row } = found
          const key = `${row.makeKey}|${row.modelKey}`
          const cur = rdwRows.get(key)
          if (!cur) {
            rdwRows.set(key, {
              row: {
                kindGroup: group,
                source: 'rdw',
                brand: r.brand,
                model: r.model,
                n: r.n,
                minKg: row.minKg,
                maxKg: row.maxKg
              },
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
          continue
        }
      }

      const key = `${group}|${r.brand}|${r.model}`
      const cur = rows.get(key)
      if (cur) {
        cur.n += r.n
        cur.minKg = Math.min(cur.minKg, r.lo)
        cur.maxKg = Math.max(cur.maxKg, r.hi)
      } else {
        rows.set(key, {
          kindGroup: group,
          source: 'registry',
          brand: r.brand,
          model: r.model,
          n: r.n,
          minKg: r.lo,
          maxKg: r.hi
        })
      }
    }

    // Two RDW models can land on one registry (brand, model) pair; the first's figures stay, the cars add up.
    for (const { row } of rdwRows.values()) {
      const key = `${row.kindGroup}|${row.brand}|${row.model}`
      const cur = rows.get(key)
      if (cur) cur.n += row.n
      else rows.set(key, row)
    }
    const values = [...rows.values()]

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_weight`)
      for (let i = 0; i < values.length; i += BATCH) await tx.insert(statsWeight).values(values.slice(i, i + BATCH))
    })
    const byGroup = new Map<string, number>()
    for (const v of values) byGroup.set(v.kindGroup, (byGroup.get(v.kindGroup) ?? 0) + 1)
    log(`wrote ${values.length} model row(s) (${matched} passenger cars on RDW masses):`, Object.fromEntries(byGroup))
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
