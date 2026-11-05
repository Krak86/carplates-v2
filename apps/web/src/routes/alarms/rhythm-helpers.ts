/** Below this many alerts the shape of the day is mostly noise: the view says so. */
export const MIN_ALERTS_FOR_SHAPE = 20

/** 24 counters from sparse `{ bucket: hour 0..23, crashes }` rows; missing or out-of-range hours count 0. */
export function hoursFromBuckets(buckets: readonly { bucket: number; crashes: number }[]): number[] {
  const hours = Array.from({ length: 24 }, () => 0)
  for (const b of buckets) {
    if (Number.isInteger(b.bucket) && b.bucket >= 0 && b.bucket < 24)
      hours[b.bucket] = (hours[b.bucket] ?? 0) + b.crashes
  }
  return hours
}

/** Share of the total per hour (0..1); all zeros when there is nothing to share. */
export function hourShares(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, n) => sum + n, 0)
  return counts.map(n => (total > 0 ? n / total : 0))
}

/** Hours (0..23) that hold the maximum, or none when every hour is 0. */
export function peakHours(counts: readonly number[]): number[] {
  const peak = Math.max(0, ...counts)
  return peak > 0 ? counts.flatMap((n, h) => (n === peak ? [h] : [])) : []
}

/** Two-digit hour label ("07"). */
export const hourLabel = (hour: number): string => String(hour).padStart(2, '0')
