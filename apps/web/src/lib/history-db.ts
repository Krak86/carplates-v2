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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (): void => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = (): void => resolve(req.result)
    req.onerror = (): void => reject(req.error)
  })
}

function runTx(db: IDBDatabase, run: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    run(tx.objectStore(STORE))
    tx.oncomplete = (): void => resolve()
    tx.onerror = (): void => reject(tx.error)
  })
}

/** Upserts a visit keyed by kind+value, refreshing its date on revisit. Silently no-ops if storage is unavailable (private mode). */
export async function recordVisit(kind: HistoryKind, value: string, label: string | null): Promise<void> {
  try {
    const db = await openDb()
    const entry: HistoryEntry = { id: `${kind}:${value}`, kind, value, label, date: Date.now() }
    await runTx(db, store => store.put(entry))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function listVisits(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb()
    const entries = await new Promise<HistoryEntry[]>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
      req.onsuccess = (): void => resolve(req.result as HistoryEntry[])
      req.onerror = (): void => reject(req.error)
    })
    db.close()
    return entries.sort((a, b) => b.date - a.date)
  } catch {
    return []
  }
}

export async function deleteVisit(id: string): Promise<void> {
  try {
    const db = await openDb()
    await runTx(db, store => store.delete(id))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function clearVisits(): Promise<void> {
  try {
    const db = await openDb()
    await runTx(db, store => store.clear())
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}
