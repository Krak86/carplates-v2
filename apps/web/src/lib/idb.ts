/** Tiny IndexedDB helpers shared by the local history/favorites stores — each keyed-by-`id` single-store database. */

export function openDb(name: string, version: number, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version)
    req.onupgradeneeded = (): void => {
      const db = req.result
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id' })
    }
    req.onsuccess = (): void => resolve(req.result)
    req.onerror = (): void => reject(req.error)
  })
}

export function runTx(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    run(tx.objectStore(storeName))
    tx.oncomplete = (): void => resolve()
    tx.onerror = (): void => reject(tx.error)
  })
}

export function getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    req.onsuccess = (): void => resolve(req.result as T[])
    req.onerror = (): void => reject(req.error)
  })
}

type Dated = { id: string; date: number; deleted?: boolean }

function isExpiredTombstone(entry: Dated, cutoff: number): boolean {
  return entry.deleted === true && entry.date < cutoff
}

/**
 * Applies synced entries in ONE transaction, last-write-wins: an incoming entry replaces the stored one only if it is
 * newer, so a local change made while the sync request was in flight survives. Expired tombstones are purged.
 */
export function mergeEntries<T extends Dated>(
  db: IDBDatabase,
  storeName: string,
  incoming: readonly T[],
  tombstoneCutoff: number
): Promise<void> {
  return runTx(db, storeName, 'readwrite', store => {
    for (const entry of incoming) {
      store.get(entry.id).onsuccess = (event): void => {
        const local = (event.target as IDBRequest<T | undefined>).result
        if (local && local.date >= entry.date) return
        if (isExpiredTombstone(entry, tombstoneCutoff)) store.delete(entry.id)
        else store.put(entry)
      }
    }
    store.openCursor().onsuccess = (event): void => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
      if (!cursor) return
      if (isExpiredTombstone(cursor.value as T, tombstoneCutoff)) cursor.delete()
      cursor.continue()
    }
  })
}

export function getOne<T>(db: IDBDatabase, storeName: string, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(id)
    req.onsuccess = (): void => resolve(req.result as T | undefined)
    req.onerror = (): void => reject(req.error)
  })
}
