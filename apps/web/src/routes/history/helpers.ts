import type { Lang } from '@/i18n'
import type { HistoryEntry } from '@/lib/history-db'

export type HistoryGroup = {
  key: string
  entries: HistoryEntry[]
}

const INTL_LOCALE: Record<Lang, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-US' }

export function toIntlLocale(lang: string): string {
  return INTL_LOCALE[lang as Lang] ?? lang
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
