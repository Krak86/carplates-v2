import type { ReactNode } from 'react'
import type { WantedStatsRow } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'

type Props = {
  rows: WantedStatsRow[]
}

/** Stolen (solid) and found (faded) per theft year as paired columns; each tooltip carries both counts. */
export default function WantedYearChart({ rows }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const biggest = Math.max(1, ...rows.map(r => Math.max(r.stolen, r.found)))

  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={t('wanted.stats.byYear')}>
        {rows.map(r => (
          <span
            key={r.label}
            title={`${r.label}: ${t('wanted.stats.col.stolen')} ${numberFormat.format(r.stolen)} · ${t('wanted.stats.col.found')} ${numberFormat.format(r.found)}`}
            className="flex h-full flex-1 items-end gap-px"
          >
            <span
              className="flex-1 rounded-t-sm bg-[var(--color-primary)]"
              style={{ height: `${Math.max(2, (r.stolen / biggest) * 100)}%` }}
            />
            <span
              className="flex-1 rounded-t-sm bg-[var(--color-primary)] opacity-35"
              style={{ height: `${Math.max(2, (r.found / biggest) * 100)}%` }}
            />
          </span>
        ))}
      </div>

      <div className="mt-1 flex gap-1 text-xs text-[var(--color-muted)] tabular-nums">
        {rows.map(r => (
          <span key={r.label} className="flex-1 truncate text-center">
            {r.label}
          </span>
        ))}
      </div>

      <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-[var(--color-muted)]">
        <span>
          <span aria-hidden>■</span> {t('wanted.stats.col.stolen')}
        </span>
        <span className="opacity-60">
          <span aria-hidden>■</span> {t('wanted.stats.col.found')}
        </span>
      </p>
    </div>
  )
}
