import { SAVED_COMPARISONS_LIMIT, SYNC_TOMBSTONE_TTL_MS } from '@carplates/shared'
import type { SyncComparison } from '@carplates/shared'

import { getAll, getOne, mergeEntries, openDb, runTx } from '@/lib/idb'
import { notifySavedChanged } from '@/lib/saved-events'

export type SavedComparison = {
  /** `<a>|<b>` in the URL form of the refs (`formatCompareRef`). */
  id: string
  a: string
  b: string
  labelA: string
  labelB: string
  /** When it was last written (ms): saved, or removed when `deleted`. */
  date: number
  /** Tombstone: removed here, kept so the removal syncs to the user's other devices. */
  deleted?: boolean
}

const DB_NAME = 'carplates.compare'
const DB_VERSION = 1
const STORE = 'comparisons'

export const comparisonId = (a: string, b: string): string => `${a}|${b}`

/** Saves (or refreshes) a comparison; past the limit the oldest are tombstoned. Silently no-ops without storage. */
export async function saveComparison(entry: Omit<SavedComparison, 'id' | 'date' | 'deleted'>): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const now = Date.now()
    const saved: SavedComparison = { ...entry, id: comparisonId(entry.a, entry.b), date: now }
    await runTx(db, STORE, 'readwrite', store => store.put(saved))
    const live = (await getAll<SavedComparison>(db, STORE)).filter(e => !e.deleted).sort((x, y) => x.date - y.date)
    const extra = live.slice(0, Math.max(0, live.length - SAVED_COMPARISONS_LIMIT))
    if (extra.length) {
      await runTx(db, STORE, 'readwrite', store => extra.forEach(e => store.put({ ...e, deleted: true, date: now })))
    }
    db.close()
    notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function listComparisons(): Promise<SavedComparison[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const all = await getAll<SavedComparison>(db, STORE)
    db.close()
    return all.filter(e => !e.deleted).sort((x, y) => y.date - x.date)
  } catch {
    return []
  }
}

export async function removeComparison(id: string): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entry = await getOne<SavedComparison>(db, STORE, id)
    if (entry && !entry.deleted) {
      await runTx(db, STORE, 'readwrite', store => store.put({ ...entry, deleted: true, date: Date.now() }))
    }
    db.close()
    if (entry && !entry.deleted) notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

/** Everything the server needs to merge: live comparisons and tombstones. */
export async function exportComparisonsForSync(): Promise<SyncComparison[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entries = await getAll<SavedComparison>(db, STORE)
    db.close()
    return entries.map(({ id, a, b, labelA, labelB, date, deleted }) => ({
      id,
      a,
      b,
      labelA,
      labelB,
      date,
      ...(deleted ? { deleted } : {})
    }))
  } catch {
    return []
  }
}

/** Applies the server's merged state (last-write-wins against what is stored here). */
export async function applySyncedComparisons(entries: readonly SyncComparison[]): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const incoming: SavedComparison[] = entries.map(e => ({
      id: e.id,
      a: e.a,
      b: e.b,
      labelA: e.labelA,
      labelB: e.labelB,
      date: e.date,
      ...(e.deleted ? { deleted: true } : {})
    }))
    await mergeEntries(db, STORE, incoming, Date.now() - SYNC_TOMBSTONE_TTL_MS)
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}
