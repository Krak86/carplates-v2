import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useFavoriteToggle } from '@/components/use-favorite-toggle'
import { cn } from '@/lib/cn'
import type { FavoriteKind } from '@/lib/favorites-db'

type Props = {
  kind: FavoriteKind
  value: string
  label: string | null
  className?: string
}

export default function FavoriteButton({ kind, value, label, className }: Props): ReactNode {
  const { t } = useTranslation()
  const { isFavorite, isPending, toggle } = useFavoriteToggle(kind, value, label)

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t('favorites.remove') : t('favorites.add')}
      onClick={toggle}
      disabled={isPending}
      className={cn(
        'text-2xl leading-none disabled:opacity-50',
        isFavorite ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]',
        className
      )}
    >
      {isFavorite ? '★' : '☆'}
    </button>
  )
}
