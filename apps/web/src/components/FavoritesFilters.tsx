import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { FavoriteLabel } from '@carplates/shared'

import { cn } from '@/lib/cn'
import { labelColorVar } from '@/lib/favorite-labels'

type Props = {
  query: string
  onQueryChange: (query: string) => void
  /** The user's labels; the chip row is hidden when there are none. */
  labels: FavoriteLabel[]
  selected: string[]
  onToggleLabel: (id: string) => void
}

/** Search box + label chips (any-of) above the favorites list. */
export default function FavoritesFilters({ query, onQueryChange, labels, selected, onToggleLabel }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="mb-3 space-y-2">
      <input
        type="search"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder={t('favorites.search')}
        aria-label={t('favorites.search')}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
      />

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('favorites.filterByLabel')}>
          {labels.map(label => {
            const isSelected = selected.includes(label.id)
            return (
              <button
                key={label.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggleLabel(label.id)}
                className={cn(
                  'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors',
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/40'
                )}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: labelColorVar(label.color) }}
                />
                <span className="truncate">{label.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
