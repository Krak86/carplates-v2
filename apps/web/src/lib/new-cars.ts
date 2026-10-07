/** Ad lines `newCarsWidget.ad1` … `ad<N>` in every locale file — keep at least 6 so a row of 3 never has to repeat. */
export const NEW_CARS_AD_COUNT = 8
/** Ad lines `newCarsSection.used1` … `used<N>` for the used-cars row (same rule: at least 6). */
export const USED_CARS_AD_COUNT = 6
/** Cards per row in the stock section. */
export const STOCK_ROW_MAX = 3

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** `count` different random ad numbers (1-based) out of `total` — a row never shows the same line twice. */
export function pickDistinctAds(count: number, total = NEW_CARS_AD_COUNT): number[] {
  return pickRandom(
    Array.from({ length: total }, (_, i) => i + 1),
    count
  )
}

/** `count` different random items out of `items`, in random order. */
export function pickRandom<T>(items: readonly T[], count: number): T[] {
  const pool = [...items]
  const picked: T[] = []
  while (pool.length && picked.length < count) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!)
  return picked
}
