import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import LocalRecordRow from '@/components/LocalRecordRow'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { favoritesQuery } from '@/lib/queries'
import { useFavoritesActions } from '@/routes/favorites/use-favorites-actions'

// Lazy-loaded (see App.tsx).
export default function FavoritesRoute(): ReactNode {
  const { t } = useTranslation()
  const favorites = useQuery(favoritesQuery())
  const { deleteOne } = useFavoritesActions()

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">{t('favorites.title')}</h1>

      {favorites.isPending && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {favorites.isSuccess && favorites.data.length === 0 && (
        <p className="text-[var(--color-muted)]">{t('favorites.empty')}</p>
      )}

      {favorites.isSuccess && favorites.data.length > 0 && (
        <Card className="divide-y divide-[var(--color-border)] p-0">
          {favorites.data.map(entry => (
            <LocalRecordRow
              key={entry.id}
              value={entry.value}
              label={entry.label}
              date={entry.date}
              deleteLabel={t('favorites.remove')}
              onDelete={() => deleteOne.mutate(entry.id)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
