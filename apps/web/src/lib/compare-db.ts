import { getAll, getOne, openDb, runTx } from '@/lib/idb'

export type SavedComparison = {
  /** `<a>|<b>` in the URL form of the refs (`formatCompareRef`). */
  id: string
  a: string
  b: string
  labelA: string
  labelB: string
  /** When it was saved (ms). */
  date: number
}

const DB_NAME = 'carplates.compare'
const DB_VERSION = 1
const STORE = 'comparisons'
export const SAVED_COMPARISONS_LIMIT = 50

export const comparisonId = (a: string, b: string): string => `${a}|${b}`

/** Saves (or refreshes) a comparison; past the limit the oldest are dropped. Silently no-ops without storage. */
export async function saveComparison(entry: Omit<SavedComparison, 'id' | 'date'>): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const saved: SavedComparison = { ...entry, id: comparisonId(entry.a, entry.b), date: Date.now() }
    await runTx(db, STORE, 'readwrite', store => store.put(saved))
    const all = (await getAll<SavedComparison>(db, STORE)).sort((x, y) => x.date - y.date)
    const extra = all.slice(0, Math.max(0, all.length - SAVED_COMPARISONS_LIMIT))
    if (extra.length) await runTx(db, STORE, 'readwrite', store => extra.forEach(e => store.delete(e.id)))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}

export async function listComparisons(): Promise<SavedComparison[]> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    const all = await getAll<SavedComparison>(db, STORE)
    db.close()
    return all.sort((x, y) => y.date - x.date)
  } catch {
    return []
  }
}

export async function removeComparison(id: string): Promise<void> {
  try {
    const db = await openDb(DB_NAME, DB_VERSION, STORE)
    if (await getOne<SavedComparison>(db, STORE, id)) await runTx(db, STORE, 'readwrite', store => store.delete(id))
    db.close()
  } catch {
    /* private mode / disabled storage */
  }
}
