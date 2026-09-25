import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { toIntlLocale } from '@/lib/intl'

type Props = {
  value: string
  label: string | null
  date: number
  deleteLabel: string
  onDelete: () => void
}

/** A single row in the history/favorites lists: link to the plate/VIN, its date, and a delete button. */
export default function LocalRecordRow({ value, label, date, deleteLabel, onDelete }: Props): ReactNode {
  const { i18n } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
      <Link to={`/${value}`} className="min-w-0 flex-1 truncate text-[var(--color-primary)] underline">
        {value}
        {label ? ` — ${label}` : ''}
      </Link>
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
