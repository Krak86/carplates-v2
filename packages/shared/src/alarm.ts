import { z } from 'zod'

import { REGION_NAMES } from './regions.js'

/**
 * Air-raid alerts (docs/alarm-plan.md). Own contract file: online-only, never part of `schemas.ts` / the offline cache.
 * New fields here are `.nullable().optional()`.
 */

/** Ukraine Alarm API v3 `GET /api/v3/alerts`, checked against the live API 2026-11-04. Enums stay strings so a new upstream value never breaks parsing. */
const upstreamLevelSchema = z.object({
  alertLevel: z.string().nullish(),
  reason: z.string().nullish(),
  createdAt: z.string().nullish()
})

const upstreamAlertSchema = z.object({
  regionId: z.string().nullish(),
  regionType: z.string().nullish(),
  type: z.string().nullish(),
  lastUpdate: z.string().nullish(),
  activeAlertLevels: z.array(upstreamLevelSchema).nullish()
})

export const upstreamRegionAlertsSchema = z.object({
  regionId: z.string(),
  regionType: z.string(),
  regionName: z.string(),
  regionEngName: z.string().nullish(),
  lastUpdate: z.string().nullish(),
  activeAlerts: z.array(upstreamAlertSchema).nullish()
})
export const upstreamAlertsResponseSchema = z.array(upstreamRegionAlertsSchema)
export type UpstreamRegionAlerts = z.infer<typeof upstreamRegionAlertsSchema>

/** `GET /api/v3/regions`: the State > District > Community tree. */
export type UpstreamRegionNode = {
  regionId: string
  regionName: string
  regionType: string
  regionChildIds?: UpstreamRegionNode[] | null
}
const upstreamRegionNodeSchema: z.ZodType<UpstreamRegionNode> = z.lazy(() =>
  z.object({
    regionId: z.string(),
    regionName: z.string(),
    regionType: z.string(),
    regionChildIds: z.array(upstreamRegionNodeSchema).nullish()
  })
)
export const upstreamRegionsResponseSchema = z.object({ states: z.array(upstreamRegionNodeSchema) })

/** Alert kinds we show. Anything else upstream is shown as `OTHER`: we never name or guess a weapon. */
export const ALARM_TYPES = ['AIR', 'ARTILLERY', 'URBAN_FIGHTS', 'CHEMICAL', 'NUCLEAR', 'OTHER'] as const
export type AlarmType = (typeof ALARM_TYPES)[number]

export const alarmTypeOf = (raw: string | null | undefined): AlarmType => {
  const up = raw?.toUpperCase()
  return ALARM_TYPES.find(t => t === up) ?? 'OTHER'
}

/** Upstream state-level name → our `REGIONS` value (the plate region name). The few that differ are listed; the rest match as is. */
const UPSTREAM_REGION_ALIASES: Readonly<Record<string, string>> = {
  'Автономна Республіка Крим': 'АР Крим',
  'м. Севастополь': 'Севастополь',
  'м. Київ': 'Київ'
}

/** Cities the API lists as top-level `State`s although they belong to an oblast of ours (they have no children in `/regions`). */
const UPSTREAM_CITY_OBLASTS: Readonly<Record<string, string>> = {
  'м. Запоріжжя та Запорізька територіальна громада': 'Запорізька область',
  'м. Харків та Харківська територіальна громада': 'Харківська область'
}

const clean = (s: string): string =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[’‘`ʼ]/g, "'")

/** Our region name for an upstream state-level name, or `undefined` when it is not one of ours (district, community, unknown). */
export function alarmRegionName(upstream: string): string | undefined {
  const name = clean(upstream)
  const alias = UPSTREAM_REGION_ALIASES[name]
  if (alias) return alias
  return REGION_NAMES.find(r => clean(r) === name)
}

/** upstream regionId → our region name, for every state and every district / community below it. Built once from `/regions`. */
export type OblastIndex = ReadonlyMap<string, { region: string; isRoot: boolean }>

export function buildOblastIndex(states: readonly UpstreamRegionNode[]): OblastIndex {
  const index = new Map<string, { region: string; isRoot: boolean }>()
  const walk = (node: UpstreamRegionNode, region: string): void => {
    for (const child of node.regionChildIds ?? []) {
      index.set(child.regionId, { region, isRoot: false })
      walk(child, region)
    }
  }
  for (const state of states) {
    const city = UPSTREAM_CITY_OBLASTS[clean(state.regionName)]
    const region = city ?? alarmRegionName(state.regionName)
    if (!region) continue
    index.set(state.regionId, { region, isRoot: !city })
    walk(state, region)
  }
  return index
}

/** `GET /api/alarms`. Minimal own shape, not a mirror of the upstream API. */
export const ALARM_SCOPES = ['full', 'partial'] as const
export type AlarmScope = (typeof ALARM_SCOPES)[number]

export const alarmAreaSchema = z.object({
  name: z.string(),
  /** Upstream granularity: `State`, `District` or `Community`. */
  kind: z.string(),
  types: z.array(z.enum(ALARM_TYPES)),
  /** Upstream level as is (`Red`, `Yellow`, ...). Meaning of the levels not yet confirmed with the provider. */
  level: z.string().nullable().optional()
})
export type AlarmArea = z.infer<typeof alarmAreaSchema>

export const alarmRegionSchema = z.object({
  /** Plate region name, as in `REGIONS`. */
  region: z.string(),
  /** `full` = the whole oblast has an alert; `partial` = only some districts / communities. */
  scope: z.enum(ALARM_SCOPES),
  types: z.array(z.enum(ALARM_TYPES)),
  /** Strongest level among the areas. */
  level: z.string().nullable().optional(),
  /** ISO time the upstream last updated the newest area. */
  updatedAt: z.string().nullable().optional(),
  areas: z.array(alarmAreaSchema)
})
export type AlarmRegion = z.infer<typeof alarmRegionSchema>

export const alarmsResponseSchema = z.object({
  /** ISO time of our last successful poll. The server answers 503 instead when this is too old, so clients never see stale "no alert". */
  fetchedAt: z.string(),
  regions: z.array(alarmRegionSchema)
})
export type AlarmsResponse = z.infer<typeof alarmsResponseSchema>

const LEVEL_RANK: Readonly<Record<string, number>> = { Red: 2, Yellow: 1 }
const levelRank = (level: string | null | undefined): number => (level ? (LEVEL_RANK[level] ?? 0) : -1)

/** Strongest level on an upstream entry, taken from the levels of its alerts. */
const entryLevel = (entry: UpstreamRegionAlerts): string | null => {
  let best: string | null = null
  for (const alert of entry.activeAlerts ?? []) {
    for (const l of alert.activeAlertLevels ?? []) {
      if (l.alertLevel && levelRank(l.alertLevel) > levelRank(best)) best = l.alertLevel
    }
  }
  return best
}

/** Every entry with an active alert, grouped under our region (oblast). Pure, so it is unit-tested. */
export function activeAlarmRegions(upstream: readonly UpstreamRegionAlerts[], index: OblastIndex): AlarmRegion[] {
  const byRegion = new Map<string, AlarmRegion>()
  for (const entry of upstream) {
    const alerts = entry.activeAlerts ?? []
    if (alerts.length === 0) continue
    const hit = index.get(entry.regionId)
    if (!hit) continue
    const types = [...new Set(alerts.map(a => alarmTypeOf(a.type)))]
    const level = entryLevel(entry)
    const area: AlarmArea = { name: entry.regionName, kind: entry.regionType, types, level }
    const current = byRegion.get(hit.region) ?? {
      region: hit.region,
      scope: 'partial' as AlarmScope,
      types: [],
      level: null,
      updatedAt: null,
      areas: []
    }
    current.areas.push(area)
    if (hit.isRoot) current.scope = 'full'
    current.types = [...new Set([...current.types, ...types])]
    if (levelRank(level) > levelRank(current.level)) current.level = level
    if (entry.lastUpdate && (!current.updatedAt || entry.lastUpdate > current.updatedAt)) {
      current.updatedAt = entry.lastUpdate
    }
    byRegion.set(hit.region, current)
  }
  return [...byRegion.values()].sort((a, b) => a.region.localeCompare(b.region, 'uk'))
}
