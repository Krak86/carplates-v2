import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { FavoriteLabel } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import LabelChip from '@/components/LabelChip'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { brandFromLabel } from '@/lib/vehicle-label'
import { markTransitionSource } from '@/lib/view-transition'

type Props = {
  value: string
  label: string | null
  date: number
  /** Favorite labels to show under the plate (favorites list only). */
  labels?: FavoriteLabel[]
  /** Extra controls between the badges and the date (the favorites list puts the label picker here). */
  actions?: ReactNode
  savedOffline?: boolean
  notFound?: boolean
  deleteLabel: string
  disabled?: boolean
  onDelete: () => void
}

/** A single row in the history/favorites lists: link to the plate/VIN, its date, and a delete button. */
export default function LocalRecordRow({
  value,
  label,
  date,
  labels = [],
  actions,
  savedOffline = false,
  notFound = false,
  deleteLabel,
  disabled = false,
  onDelete
}: Props): ReactNode {
  const { t, i18n } = useTranslation()

  // The row morphs into the result card it opens (`.card-vt`) — skipped for modified clicks, which don't navigate here.
  const handleOpen = (e: MouseEvent<HTMLAnchorElement>): void => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    markTransitionSource(e.currentTarget.parentElement, 'vehicle-card')
  }

  const logo = <BrandLogo brand={brandFromLabel(label)} size="sm" />

  const badges = (
    <>
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
    </>
  )
  const dateText = (
    <span className="shrink-0 text-[var(--color-muted)]">
      {new Date(date).toLocaleDateString(toIntlLocale(i18n.language))}
    </span>
  )

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm sm:px-4">
      <span className="hidden w-6 shrink-0 justify-center sm:flex">{logo}</span>
      <div className="min-w-0 flex-1">
        <Link
          viewTransition
          onClick={handleOpen}
          to={`/${value}`}
          title={label ? `${value} - ${label}` : value}
          className="block truncate text-[var(--color-primary)] underline"
        >
          {value}
          {label ? ` - ${label}` : ''}
        </Link>

        {/* Mobile: a second row holds the brand logo, label chips, badges and date, so the title gets the full width. */}
        <div className={cn('mt-1 flex flex-wrap items-center gap-1', labels.length === 0 && 'sm:hidden')}>
          <span className="flex shrink-0 sm:hidden">{logo}</span>
          {labels.map(l => (
            <LabelChip key={l.id} label={l} />
          ))}
          <span className="ml-auto flex items-center gap-2 sm:hidden">
            {badges}
            {dateText}
          </span>
        </div>
      </div>
      <span className="hidden sm:contents">{badges}</span>
      {actions && <span className="hidden sm:contents">{actions}</span>}
      <span className="hidden sm:inline">{dateText}</span>
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={onDelete}
        disabled={disabled}
        className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  )
}
