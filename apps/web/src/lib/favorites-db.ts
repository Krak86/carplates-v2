import { getAll, getOne, openDb, runTx } from '@/lib/idb'

export type FavoriteKind = 'plate' | 'vin'

export type FavoriteEntry = {
  id: string
  kind: FavoriteKind
  value: string
  label: string | null
  date: number
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
    return entry != null
  } catch {
    return false
  }
}

/** Silently no-ops if storage is unavailable (private mode). */
export async function addFavorite(kind: FavoriteKind, value: string, label: string | null): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entry: FavoriteEntry = { id: favoriteId(kind, value), kind, value, label, date: Date.now() }
    await runTx(db, STORE, 'readwrite', store => store.put(entry))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function removeFavorite(id: string): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    await runTx(db, STORE, 'readwrite', store => store.delete(id))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function listFavorites(): Promise<FavoriteEntry[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entries = await getAll<FavoriteEntry>(db, STORE)
    db.close()
    return entries.sort((a, b) => b.date - a.date)
  } catch {
    return []
  }
}
