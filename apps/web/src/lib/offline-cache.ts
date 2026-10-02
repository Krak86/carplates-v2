import type { QueryKey } from '@tanstack/react-query'
import type { PersistedClient } from '@tanstack/react-query-persist-client'

const DAY_MS = 24 * 60 * 60 * 1000

export const OFFLINE_MAX_AGE_MS = 30 * DAY_MS

/** Per-group entity caps. A plate entity is its lookup + history queries; ratings run up to 6 providers per vehicle.
 *  `stats` is deliberately absent — ~14 MB of JSON, so it stays online-only. */
export const OFFLINE_LIMITS = {
  plate: 200,
  vin: 200,
  safety: 1200,
  fuel: 400,
  wiki: 200
} as const

export type OfflineGroup = keyof typeof OFFLINE_LIMITS

const OFFLINE_GROUPS = Object.keys(OFFLINE_LIMITS) as OfflineGroup[]

export function offlineGroup(queryKey: QueryKey): OfflineGroup | null {
  const head = queryKey[0]
  return OFFLINE_GROUPS.find(group => group === head) ?? null
}

/** Plate/VIN entity ids match favorites' `${kind}:${value}` ids, so favorites can pin them. */
function entityId(group: OfflineGroup, queryKey: QueryKey, queryHash: string): string {
  return group === 'plate' || group === 'vin' ? `${group}:${String(queryKey[1])}` : queryHash
}

type Entity = {
  group: OfflineGroup
  id: string
  lastFetched: number
  queries: PersistedClient['clientState']['queries']
}

/** Keeps the most recently fetched entities per group within caps and max age; pinned ids are always kept and uncounted. */
export function pruneOfflineClient(client: PersistedClient, pinned: ReadonlySet<string>, now: number): PersistedClient {
  const entities = new Map<string, Entity>()

  for (const query of client.clientState.queries) {
    const group = offlineGroup(query.queryKey)
    if (!group || query.state.status !== 'success') continue
    const id = entityId(group, query.queryKey, query.queryHash)
    const entity = entities.get(id) ?? { group, id, lastFetched: 0, queries: [] }
    entity.lastFetched = Math.max(entity.lastFetched, query.state.dataUpdatedAt)
    entity.queries.push(query)
    entities.set(id, entity)
  }

  const counts = Object.fromEntries(OFFLINE_GROUPS.map(group => [group, 0])) as Record<OfflineGroup, number>
  const kept = [...entities.values()]
    .sort((a, b) => b.lastFetched - a.lastFetched)
    .filter(entity => {
      if (pinned.has(entity.id)) return true
      if (now - entity.lastFetched > OFFLINE_MAX_AGE_MS) return false
      if (counts[entity.group] >= OFFLINE_LIMITS[entity.group]) return false
      counts[entity.group] += 1
      return true
    })

  return {
    ...client,
    clientState: { ...client.clientState, queries: kept.flatMap(entity => entity.queries) }
  }
}
