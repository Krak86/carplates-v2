import { denormalizePlate, isUaPlate } from '@carplates/shared'
import type { MyShare } from '@carplates/shared'

/**
 * Shared photo links the user created on THIS device. The API stores only the token's SHA-256 and returns the token once
 * (POST /api/shares), so "Copy link" in My shares can only work for these; a share made elsewhere offers Delete only.
 */
const STORAGE_KEY = 'carplates.share-links'

type Saved = Record<string, { token: string; expiresAt: string }>

function read(): Saved {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Saved) : {}
  } catch {
    return {}
  }
}

function write(saved: Saved): void {
  try {
    if (Object.keys(saved).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    /* private mode / disabled storage */
  }
}

export function saveShareToken(id: string, token: string, expiresAt: string): void {
  write({ ...read(), [id]: { token, expiresAt } })
}

export function forgetShareToken(id: string): void {
  const { [id]: _removed, ...rest } = read()
  write(rest)
}

/** Token of one of this device's shares, or null (made elsewhere, expired, or storage cleared). */
export function savedShareToken(id: string): string | null {
  const entry = read()[id]
  if (!entry || Date.parse(entry.expiresAt) <= Date.now()) return null
  return entry.token
}

/** Keeps only the ids the server still lists, so an expired or deleted share leaves no token behind. */
export function pruneShareTokens(live: readonly Pick<MyShare, 'id'>[]): void {
  const ids = new Set(live.map(s => s.id))
  const saved = read()
  const kept = Object.fromEntries(Object.entries(saved).filter(([id]) => ids.has(id)))
  if (Object.keys(kept).length !== Object.keys(saved).length) write(kept)
}

/** Sign-out: the links are capabilities of that account. */
export function clearShareTokens(): void {
  write({})
}

export function shareUrl(plate: string, token: string, origin = window.location.origin): string {
  // Latin look-alikes keep the link readable (a Cyrillic path pastes as `%D0%92…`); the API normalizes both.
  return `${origin}/${encodeURIComponent(isUaPlate(plate) ? denormalizePlate(plate) : plate)}?p=${token}`
}

/** Whole days left, rounded up, never below 0. */
/** Whether the browser has a native share sheet to hand the link to. */
export const canNativeShare = (): boolean => typeof navigator.share === 'function'

/** Opens the native share sheet with the link; a dismissed sheet is not an error. */
export async function nativeShareLink(url: string, title: string): Promise<void> {
  try {
    await navigator.share({ title, url })
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) throw e
  }
}

export function daysLeft(expiresAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 86_400_000))
}
