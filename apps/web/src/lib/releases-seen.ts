const SEEN_STORAGE_KEY = 'carplates.releasesSeen'

/** Date (YYYY-MM-DD) of the newest release day the visitor has opened the bell or /releases for; null = never. */
export function readReleasesSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeReleasesSeen(date: string): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, date)
  } catch {
    /* private mode / disabled storage */
  }
}
