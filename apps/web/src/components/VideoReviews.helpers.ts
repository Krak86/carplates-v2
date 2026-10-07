/** 63 -> "1:03", 3723 -> "1:02:03". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = String(totalSeconds % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Videos in the UI language first (stable: the API's best-first order is kept within each group). */
export function preferLanguage<T extends { lang: string | null }>(videos: T[], uiLang: string): T[] {
  const rank = (v: T): number => (v.lang === uiLang ? 0 : 1)
  return [...videos].sort((a, b) => rank(a) - rank(b))
}

/** The `v` id of a `youtube.com/watch?v=…` link, or null for anything else. */
export function youtubeIdOf(url: string): string | null {
  try {
    return new URL(url).searchParams.get('v')
  } catch {
    return null
  }
}
