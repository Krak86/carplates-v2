/** 63 -> "1:03", 3723 -> "1:02:03". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = String(totalSeconds % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** The `v` id of a `youtube.com/watch?v=…` link, or null for anything else. */
export function youtubeIdOf(url: string): string | null {
  try {
    return new URL(url).searchParams.get('v')
  } catch {
    return null
  }
}
