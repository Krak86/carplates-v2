import { HISTORY_LIMIT, SYNC_TOMBSTONE_TTL_MS } from '@carplates/shared'
import type { SyncEntry } from '@carplates/shared'

import { getAll, mergeEntries, openDb, runTx } from '@/lib/idb'
import { notifySavedChanged } from '@/lib/saved-events'

export type HistoryKind = 'plate' | 'vin'

export type HistoryEntry = {
  id: string
  kind: HistoryKind
  value: string
  label: string | null
  /** Last-write time (ms): the latest visit, or — on a tombstone — when it was deleted. */
  date: number
  /** `false` = a format-valid search that matched nothing in the registry; absent on older entries (= found). */
  found?: boolean
  /** Tombstone: deleted locally, kept so the deletion syncs to the user's other devices. Never listed. */
  deleted?: boolean
}

const DB_NAME = 'carplates.history'
const DB_VERSION = 1
const STORE = 'visits'

/**
 * Upserts a visit keyed by kind+value, refreshing its date on revisit; past HISTORY_LIMIT the oldest visits are
 * dropped automatically. Silently no-ops if storage is unavailable (private mode).
 */
export async function recordVisit(kind: HistoryKind, value: string, label: string | null, found = true): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const now = Date.now()
    const entry: HistoryEntry = {
      id: `${kind}:${value}`,
      kind,
      value,
      label,
      date: now,
      ...(found ? {} : { found: false })
    }
    await runTx(db, STORE, 'readwrite', store => store.put(entry))

    const live = (await getAll<HistoryEntry>(db, STORE)).filter(e => !e.deleted).sort((a, b) => a.date - b.date)
    const evicted = live.slice(0, Math.max(0, live.length - HISTORY_LIMIT))
    if (evicted.length) {
      await runTx(db, STORE, 'readwrite', store => {
        for (const e of evicted) store.put({ ...e, deleted: true, date: now })
      })
    }
    db.close()
    notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function listVisits(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entries = await getAll<HistoryEntry>(db, STORE)
    db.close()
    return entries.filter(e => !e.deleted).sort((a, b) => b.date - a.date)
  } catch {
    return []
  }
}

export async function deleteVisit(id: string): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entry = (await getAll<HistoryEntry>(db, STORE)).find(e => e.id === id)
    if (entry) await runTx(db, STORE, 'readwrite', store => store.put({ ...entry, deleted: true, date: Date.now() }))
    db.close()
    notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function clearVisits(): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const now = Date.now()
    const live = (await getAll<HistoryEntry>(db, STORE)).filter(e => !e.deleted)
    await runTx(db, STORE, 'readwrite', store => {
      for (const e of live) store.put({ ...e, deleted: true, date: now })
    })
    db.close()
    notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

/** Everything the server needs to merge: live visits and tombstones. */
export async function exportVisitsForSync(): Promise<SyncEntry[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entries = await getAll<HistoryEntry>(db, STORE)
    db.close()
    return entries.map(({ kind, value, label, date, found, deleted }) => ({
      kind,
      value,
      label,
      date,
      ...(found === undefined ? {} : { found }),
      ...(deleted ? { deleted } : {})
    }))
  } catch {
    return []
  }
}

/** Applies the server's merged state (last-write-wins against what is stored here). */
export async function applySyncedVisits(entries: readonly SyncEntry[]): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const incoming: HistoryEntry[] = entries.map(e => ({
      id: `${e.kind}:${e.value}`,
      kind: e.kind,
      value: e.value,
      label: e.label,
      date: e.date,
      ...(e.found === undefined ? {} : { found: e.found }),
      ...(e.deleted ? { deleted: true } : {})
    }))
    await mergeEntries(db, STORE, incoming, Date.now() - SYNC_TOMBSTONE_TTL_MS)
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}
