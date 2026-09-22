import type { HistoryEntry } from '@/lib/history-db'
import { toIntlLocale } from '@/lib/intl'

export type HistoryGroup = {
  key: string
  entries: HistoryEntry[]
}

/** Groups already-DESC-sorted entries by calendar month, preserving that order. */
export function groupByMonth(entries: HistoryEntry[]): HistoryGroup[] {
  const groups = new Map<string, HistoryEntry[]>()
  for (const entry of entries) {
    const d = new Date(entry.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const list = groups.get(key)
    if (list) list.push(entry)
    else groups.set(key, [entry])
  }
  return [...groups.entries()].map(([key, groupEntries]) => ({ key, entries: groupEntries }))
}

export function formatMonthLabel(key: string, lang: string): string {
  const [yearStr, monthStr] = key.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return new Intl.DateTimeFormat(toIntlLocale(lang), { month: 'long', year: 'numeric' }).format(date)
}
