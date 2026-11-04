import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AlarmRegion } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'
import { localizeRegion } from '@/lib/region-label'
import {
  alarmTypeIconOf,
  daysAgo,
  filterAlarmRegions,
  formatAlarmDuration,
  levelFill,
  regionRows
} from '@/routes/alarms/helpers'

type Props = {
  regions: readonly AlarmRegion[]
  /** ISO time of the snapshot: "now" for durations, so rendering stays pure and durations move with each refresh. */
  nowIso: string
}

/** Active alerts grouped by oblast, newest first inside a group, with start time and duration. Informational only. */
export default function ActiveAlarmList({ regions, nowIso }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  const visible = filterAlarmRegions(regions, query, r => localizeRegion(r, i18n.language))
  const units = { d: t('alarms.dur.d'), h: t('alarms.dur.h'), m: t('alarms.dur.m') }
  const nowMs = Date.parse(nowIso)

  const sinceLabel = (since: string): string => {
    const time = new Date(since).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Kyiv'
    })
    const days = daysAgo(since, nowIso)
    if (days === 0) return t('alarms.list.today', { time })
    if (days === 1) return t('alarms.list.yesterday', { time })
    const date = new Date(since).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'Europe/Kyiv' })
    return t('alarms.list.date', { date, time })
  }

  const toggle = (region: string): void =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (!next.delete(region)) next.add(region)
      return next
    })

  return (
    <section className="mt-4" aria-label={t('alarms.list.title')}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">
          <button
            type="button"
            aria-expanded={listOpen}
            onClick={() => setListOpen(v => !v)}
            className="flex items-center gap-2 text-left"
          >
            <span aria-hidden className="text-xs text-[var(--color-muted)]">
              {listOpen ? '▾' : '▸'}
            </span>
            {t('alarms.list.title')}
            <span className="text-sm font-normal text-[var(--color-muted)]">({regions.length})</span>
          </button>
        </h2>
        {listOpen && (
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('alarms.list.search')}
            aria-label={t('alarms.list.search')}
            className="ml-auto w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm sm:w-64"
          />
        )}
      </div>

      {listOpen && visible.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">{t(query ? 'alarms.list.noMatch' : 'alarms.list.none')}</p>
      )}

      <div className="grid gap-2" hidden={!listOpen}>
        {visible.map(r => {
          const open = !collapsed.has(r.region)
          const rows = regionRows(r)
          return (
            <div key={r.region}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(r.region)}
                className="flex w-full items-center gap-2 py-1 text-left text-sm font-semibold"
              >
                <span aria-hidden className="text-xs text-[var(--color-muted)]">
                  {open ? '▾' : '▸'}
                </span>
                {localizeRegion(r.region, i18n.language)}
                <span className="font-normal text-[var(--color-muted)]">
                  ({r.scope === 'full' ? t('alarms.status.full') : rows.length})
                </span>
              </button>
              {open && (
                <ul className="grid gap-1">
                  {rows.map(({ key, area, since }) => (
                    <li
                      key={key}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-md border border-l-4 border-[var(--color-border)] px-3 py-1.5 text-sm"
                      style={{ borderLeftColor: levelFill(area.level, false) }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{area.name}</span>
                        <span className="flex flex-wrap gap-x-3 text-xs text-[var(--color-muted)]">
                          {area.types.map(type => (
                            <span key={type} className="inline-flex items-center gap-1">
                              <span aria-hidden>{alarmTypeIconOf(type)}</span>
                              {t(`alarms.type.${type}`)}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="text-right text-[var(--color-muted)]">
                        {since ? (
                          <>
                            <span className="block">{sinceLabel(since)}</span>
                            <span className="block text-xs">
                              {formatAlarmDuration(nowMs - Date.parse(since), units)}
                            </span>
                          </>
                        ) : (
                          '-'
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
