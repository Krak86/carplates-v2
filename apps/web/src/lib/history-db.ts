import { getAll, openDb, runTx } from '@/lib/idb'

export type HistoryKind = 'plate' | 'vin'

export type HistoryEntry = {
  id: string
  kind: HistoryKind
  value: string
  label: string | null
  date: number
}

const DB_NAME = 'carplates.history'
const DB_VERSION = 1
const STORE = 'visits'

/** Upserts a visit keyed by kind+value, refreshing its date on revisit. Silently no-ops if storage is unavailable (private mode). */
export async function recordVisit(kind: HistoryKind, value: string, label: string | null): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entry: HistoryEntry = { id: `${kind}:${value}`, kind, value, label, date: Date.now() }
    await runTx(db, STORE, 'readwrite', store => store.put(entry))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function listVisits(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const entries = await getAll<HistoryEntry>(db, STORE)
    db.close()
    return entries.sort((a, b) => b.date - a.date)
  } catch {
    return []
  }
}

export async function deleteVisit(id: string): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    await runTx(db, STORE, 'readwrite', store => store.delete(id))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function clearVisits(): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    await runTx(db, STORE, 'readwrite', store => store.clear())
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}
