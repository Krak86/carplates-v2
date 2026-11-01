import { toIntlLocale } from '@/lib/intl'

/** A price in the instrument's own currency; thousands get no decimals (KRW, JPY). */
export function formatStockMoney(n: number, currency: string | null, language: string): string {
  return new Intl.NumberFormat(toIntlLocale(language), {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: n >= 1000 ? 0 : 2
  }).format(n)
}

/** Lowest and highest close of a series, or null for a series too short to draw. */
export function seriesRange(points: ReadonlyArray<readonly [number, number]>): { low: number; high: number } | null {
  if (points.length < 2) return null
  const values = points.map(p => p[1])
  return { low: Math.min(...values), high: Math.max(...values) }
}
