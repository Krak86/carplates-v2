import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import { toIntlLocale } from '@/lib/intl'
import { brandFromLabel } from '@/lib/vehicle-label'
import { markTransitionSource } from '@/lib/view-transition'

type Props = {
  value: string
  label: string | null
  date: number
  savedOffline?: boolean
  notFound?: boolean
  deleteLabel: string
  onDelete: () => void
}

/** A single row in the history/favorites lists: link to the plate/VIN, its date, and a delete button. */
export default function LocalRecordRow({
  value,
  label,
  date,
  savedOffline = false,
  notFound = false,
  deleteLabel,
  onDelete
}: Props): ReactNode {
  const { t, i18n } = useTranslation()

  // The row morphs into the result card it opens (`.card-vt`) — skipped for modified clicks, which don't navigate here.
  const handleOpen = (e: MouseEvent<HTMLAnchorElement>): void => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    markTransitionSource(e.currentTarget.parentElement, 'vehicle-card')
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
      <span className="flex w-6 shrink-0 justify-center">
        <BrandLogo brand={brandFromLabel(label)} size="sm" />
      </span>
      <Link
        viewTransition
        onClick={handleOpen}
        to={`/${value}`}
        title={label ? `${value} — ${label}` : value}
        className="min-w-0 flex-1 truncate text-[var(--color-primary)] underline"
      >
        {value}
        {label ? ` — ${label}` : ''}
      </Link>
      {notFound && (
        <span
          title={t('history.notFoundHint')}
          className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300"
        >
          {t('history.notFound')}
        </span>
      )}
      {savedOffline && (
        <span
          title={t('offline.savedHint')}
          className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
        >
          {t('offline.savedBadge')}
        </span>
      )}
      <span className="shrink-0 text-[var(--color-muted)]">
        {new Date(date).toLocaleDateString(toIntlLocale(i18n.language))}
      </span>
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={onDelete}
        className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        ✕
      </button>
    </div>
  )
}
