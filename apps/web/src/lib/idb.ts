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

export function getOne<T>(db: IDBDatabase, storeName: string, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(id)
    req.onsuccess = (): void => resolve(req.result as T | undefined)
    req.onerror = (): void => reject(req.error)
  })
}
