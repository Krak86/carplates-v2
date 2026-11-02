import { getOne, openDb, runTx } from '@/lib/idb'

/**
 * A photo parked while an anonymous user signs in to share it. One record, JPEG blob (the already shrunk, metadata-free
 * file), deleted on use, on sign-out and after `PENDING_SHARE_TTL_MS`. `localStorage` holds a marker so the page knows a
 * share was started even when the record is gone ("pick the photo again").
 */
const DB_NAME = 'carplates-pending-share'
const STORE = 'pending'
const RECORD_ID = 'photo'
const MARKER_KEY = 'carplates.pending-share'

export const PENDING_SHARE_TTL_MS = 60 * 60 * 1000

type PendingRecord = { id: string; blob: Blob; savedAt: number }

export type TakenShare = { file: File | null }

function setMarker(expiresAt: number | null): void {
  try {
    if (expiresAt === null) localStorage.removeItem(MARKER_KEY)
    else localStorage.setItem(MARKER_KEY, String(expiresAt))
  } catch {
    /* private mode / disabled storage */
  }
}

/** True while a share was started less than an hour ago and has not been resumed. */
export function hasPendingShare(now = Date.now()): boolean {
  try {
    const expiresAt = Number(localStorage.getItem(MARKER_KEY))
    return Number.isFinite(expiresAt) && expiresAt > now
  } catch {
    return false
  }
}

export async function savePendingShare(file: Blob, now = Date.now()): Promise<void> {
  setMarker(now + PENDING_SHARE_TTL_MS)
  try {
    const db = await openDb(DB_NAME, 1, STORE)
    const record: PendingRecord = { id: RECORD_ID, blob: file, savedAt: now }
    await runTx(db, STORE, 'readwrite', store => void store.put(record))
    db.close()
  } catch {
    /* IndexedDB unavailable: after sign-in the user is asked to pick the photo again */
  }
}

export async function clearPendingShare(): Promise<void> {
  setMarker(null)
  try {
    const db = await openDb(DB_NAME, 1, STORE)
    await runTx(db, STORE, 'readwrite', store => void store.delete(RECORD_ID))
    db.close()
  } catch {
    /* nothing stored */
  }
}

/** Reads and deletes the parked photo; `file` is null when it expired or was never stored. */
export async function takePendingShare(now = Date.now()): Promise<TakenShare> {
  let record: PendingRecord | undefined
  try {
    const db = await openDb(DB_NAME, 1, STORE)
    record = await getOne<PendingRecord>(db, STORE, RECORD_ID)
    db.close()
  } catch {
    record = undefined
  }
  await clearPendingShare()
  if (!record || now - record.savedAt > PENDING_SHARE_TTL_MS) return { file: null }
  return { file: new File([record.blob], 'photo.jpg', { type: record.blob.type || 'image/jpeg' }) }
}
