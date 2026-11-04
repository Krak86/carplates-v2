import type { AlarmArea, AlarmRegion } from '@carplates/shared'

/** Static shape files in `apps/web/public/` (UN OCHA COD-AB Ukraine, 2020 raions and communities). */
export const ALARM_GEO_LAYERS = ['oblasts', 'raions', 'hromadas'] as const
export type AlarmGeoLayer = (typeof ALARM_GEO_LAYERS)[number]

/** `o` = oblast name (COD, no "область"), `n` = raion / community name (absent on the oblast layer). */
export type AlarmGeoProperties = { o: string; n?: string }

const APOSTROPHES = /[’ʼ`]/g

const norm = (value: string): string => value.replace(APOSTROPHES, "'").toLowerCase().trim()

/** COD oblast name of one of our plate region names (`АР Крим` → `Автономна Республіка Крим`). */
export const oblastOfRegion = (region: string): string =>
  region === 'АР Крим' ? 'Автономна Республіка Крим' : region.replace(/ область$/, '')

/** Our plate region name of a COD oblast name. */
export const regionOfOblast = (oblast: string): string => {
  if (oblast === 'Автономна Республіка Крим') return 'АР Крим'
  if (oblast === 'Київ' || oblast === 'Севастополь') return oblast
  return `${oblast} область`
}

/** Key of a raion / community shape inside the layer index. */
export const shapeKey = (oblast: string, name: string): string => `${norm(oblast)}|${norm(name)}`

export type AreaTarget = { layer: 'raions' | 'hromadas'; key: string }

/**
 * Which shape an upstream area is drawn on. Only raions ("... район") and communities
 * ("... територіальна громада", also "м. X та Xська територіальна громада") have shapes;
 * anything else (a whole oblast, a city entry) returns `null`.
 */
export function areaTarget(region: string, area: Pick<AlarmArea, 'name'>): AreaTarget | null {
  const oblast = oblastOfRegion(region)
  if (/ район$/.test(area.name)) return { layer: 'raions', key: shapeKey(oblast, area.name.replace(/ район$/, '')) }
  if (/ територіальна громада$/.test(area.name)) {
    const name = area.name.replace(/ територіальна громада$/, '').replace(/^.* та /, '')
    return { layer: 'hromadas', key: shapeKey(oblast, name) }
  }
  return null
}

/** Index of a layer's features by `shapeKey` (first one wins). */
export function indexLayer(features: readonly { properties: AlarmGeoProperties }[]): Map<string, number> {
  const index = new Map<string, number>()
  features.forEach((feature, i) => {
    const { o, n } = feature.properties
    if (n === undefined) return
    const key = shapeKey(o, n)
    if (!index.has(key)) index.set(key, i)
  })
  return index
}

export type AlarmPlan = {
  /** Oblasts painted whole: `full` alerts, or `fallback` when a partial alert has an area we cannot place. */
  oblasts: Map<string, { kind: 'full' | 'fallback'; level: string | null | undefined }>
  /** Raion / community shapes painted with their own level. */
  shapes: { layer: AlarmGeoLayer; index: number; level: string | null | undefined; region: string }[]
}

/**
 * Turns the alert list into paint instructions. Fail closed: a partial alert whose area has no shape
 * (or whose layer is not loaded yet) falls back to painting the whole oblast softly, never to "no alert".
 */
export function planAlarmPaint(
  regions: readonly AlarmRegion[],
  layers: Readonly<Partial<Record<'raions' | 'hromadas', Map<string, number>>>>
): AlarmPlan {
  const plan: AlarmPlan = { oblasts: new Map(), shapes: [] }
  for (const region of regions) {
    const oblast = oblastOfRegion(region.region)
    if (region.scope === 'full') {
      plan.oblasts.set(oblast, { kind: 'full', level: region.level })
      continue
    }
    let placedAll = true
    for (const area of region.areas) {
      const target = areaTarget(region.region, area)
      const index = target ? layers[target.layer]?.get(target.key) : undefined
      if (!target || index === undefined) {
        placedAll = false
        continue
      }
      plan.shapes.push({ layer: target.layer, index, level: area.level ?? region.level, region: region.region })
    }
    if (!placedAll) plan.oblasts.set(oblast, { kind: 'fallback', level: region.level })
  }
  return plan
}
