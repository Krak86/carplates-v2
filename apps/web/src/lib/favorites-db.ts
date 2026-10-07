import { FAVORITES_LIMIT, SYNC_TOMBSTONE_TTL_MS } from '@carplates/shared'
import type { SyncEntry } from '@carplates/shared'

import { getAll, getOne, mergeEntries, openDb, runTx } from '@/lib/idb'
import { notifySavedChanged } from '@/lib/saved-events'

export type FavoriteKind = 'plate' | 'vin'

export type FavoriteEntry = {
  id: string
  kind: FavoriteKind
  value: string
  label: string | null
  /** Last-write time (ms): when it was added, or — on a tombstone — when it was removed. */
  date: number
  /** Ids of the user's favorite labels on this entry (signed-in users only); absent = none. */
  tags?: string[]
  /** Tombstone: removed locally, kept so the deletion syncs to the user's other devices. Never listed. */
  deleted?: boolean
}

const DB_NAME = 'carplates.favorites'
const DB_VERSION = 1
const STORE = 'favorites'

export function favoriteId(kind: FavoriteKind, value: string): string {
  return `${kind}:${value}`
}

export async function isFavorited(kind: FavoriteKind, value: string): Promise<boolean> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entry = await getOne<FavoriteEntry>(db, STORE, favoriteId(kind, value))
    db.close()
    return entry != null && !entry.deleted
  } catch {
    return false
  }
}

/**
 * Adds a favorite; past FAVORITES_LIMIT the oldest ones are dropped. Returns the dropped entries so the caller can
 * tell the user. Silently no-ops if storage is unavailable (private mode).
 */
export async function addFavorite(kind: FavoriteKind, value: string, label: string | null): Promise<FavoriteEntry[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const now = Date.now()
    const entry: FavoriteEntry = { id: favoriteId(kind, value), kind, value, label, date: now }
    await runTx(db, STORE, 'readwrite', store => store.put(entry))

    const live = (await getAll<FavoriteEntry>(db, STORE)).filter(e => !e.deleted).sort((a, b) => a.date - b.date)
    const evicted = live.slice(0, Math.max(0, live.length - FAVORITES_LIMIT))
    if (evicted.length) {
      await runTx(db, STORE, 'readwrite', store => {
        for (const e of evicted) store.put({ ...e, deleted: true, date: now })
      })
    }
    db.close()
    notifySavedChanged()
    return evicted
  } catch {
    /* private mode / disabled storage */
    return []
  }
}

export async function removeFavorite(id: string): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entry = await getOne<FavoriteEntry>(db, STORE, id)
    if (entry) await runTx(db, STORE, 'readwrite', store => store.put({ ...entry, deleted: true, date: Date.now() }))
    db.close()
    notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function listFavorites(): Promise<FavoriteEntry[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entries = await getAll<FavoriteEntry>(db, STORE)
    db.close()
    return entries.filter(e => !e.deleted).sort((a, b) => b.date - a.date)
  } catch {
    return []
  }
}

/**
 * Edits the labels on one favorite. Counts as a write — the entry's `date` moves — so it wins the sync conflict
 * against older copies on other devices.
 */
export async function updateFavoriteTags(id: string, change: (tags: string[]) => string[]): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entry = await getOne<FavoriteEntry>(db, STORE, id)
    if (entry && !entry.deleted) {
      const tags = change(entry.tags ?? [])
      await runTx(db, STORE, 'readwrite', store => store.put({ ...entry, tags, date: Date.now() }))
    }
    db.close()
    notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

/** Removes a deleted label's id from every favorite that carries it. */
export async function stripFavoriteTag(tagId: string): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const now = Date.now()
    const carrying = (await getAll<FavoriteEntry>(db, STORE)).filter(e => !e.deleted && e.tags?.includes(tagId))
    if (carrying.length) {
      await runTx(db, STORE, 'readwrite', store => {
        for (const e of carrying) store.put({ ...e, tags: e.tags?.filter(t => t !== tagId), date: now })
      })
    }
    db.close()
    if (carrying.length) notifySavedChanged()
  } catch {
    /* private mode / disabled storage */
  }
}

/** Everything the server needs to merge: live entries and tombstones. */
export async function exportFavoritesForSync(): Promise<SyncEntry[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entries = await getAll<FavoriteEntry>(db, STORE)
    db.close()
    return entries.map(({ kind, value, label, date, deleted, tags }) => ({
      kind,
      value,
      label,
      date,
      ...(tags?.length ? { tags } : {}),
      ...(deleted ? { deleted } : {})
    }))
  } catch {
    return []
  }
}

/** Applies the server's merged state (last-write-wins against what is stored here). */
export async function applySyncedFavorites(entries: readonly SyncEntry[]): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const incoming: FavoriteEntry[] = entries.map(e => ({
      id: favoriteId(e.kind, e.value),
      kind: e.kind,
      value: e.value,
      label: e.label,
      date: e.date,
      ...(e.tags?.length ? { tags: e.tags } : {}),
      ...(e.deleted ? { deleted: true } : {})
    }))
    await mergeEntries(db, STORE, incoming, Date.now() - SYNC_TOMBSTONE_TTL_MS)
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}
