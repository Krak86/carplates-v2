import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import FavoriteLabelsButton from '@/components/FavoriteLabelsButton'
import FavoritesFilters from '@/components/FavoritesFilters'
import LocalRecordRow from '@/components/LocalRecordRow'
import LocalRecordsExportButton from '@/components/LocalRecordsExportButton'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { useFavoriteLabels } from '@/components/use-favorite-labels'
import { useOfflineAvailability } from '@/components/use-offline-availability'
import { useIsSyncing } from '@/components/use-saved-sync-actions'
import { filterFavorites, labelsOf, toggleTag } from '@/lib/favorite-labels'
import { favoritesQuery } from '@/lib/queries'
import { useFavoritesActions } from '@/routes/favorites/use-favorites-actions'

// Lazy-loaded (see App.tsx).
export default function FavoritesRoute(): ReactNode {
  const { t } = useTranslation()
  const favorites = useQuery(favoritesQuery())
  const { deleteOne } = useFavoritesActions()
  const isSavedOffline = useOfflineAvailability()
  const isSyncing = useIsSyncing()
  const labels = useFavoriteLabels()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Drop ids of labels deleted meanwhile, so a stale selection can't hide everything.
  const activeIds = selectedIds.filter(id => labels.some(l => l.id === id))
  const visible = favorites.data ? filterFavorites(favorites.data, query, activeIds) : []

  return (
    <div className="mx-auto w-full max-w-content">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('favorites.title')}</h1>
        {favorites.isSuccess && favorites.data.length > 0 && (
          <LocalRecordsExportButton title={t('favorites.title')} entries={favorites.data} />
        )}
      </div>

      {favorites.isPending && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {favorites.isSuccess && favorites.data.length === 0 && (
        <p className="text-[var(--color-muted)]">{t('favorites.empty')}</p>
      )}

      {favorites.isSuccess && favorites.data.length > 0 && (
        <FavoritesFilters
          query={query}
          onQueryChange={setQuery}
          labels={labels}
          selected={activeIds}
          onToggleLabel={id => setSelectedIds(ids => toggleTag(ids, id))}
        />
      )}

      {favorites.isSuccess && favorites.data.length > 0 && visible.length === 0 && (
        <p className="text-[var(--color-muted)]">{t('favorites.noMatches')}</p>
      )}

      {visible.length > 0 && (
        <Card className="divide-y divide-[var(--color-border)] p-2!">
          {visible.map(entry => (
            <LocalRecordRow
              key={entry.id}
              value={entry.value}
              label={entry.label}
              date={entry.date}
              labels={labelsOf(labels, entry.tags)}
              actions={<FavoriteLabelsButton kind={entry.kind} value={entry.value} />}
              savedOffline={isSavedOffline(entry.kind, entry.value)}
              deleteLabel={t('favorites.remove')}
              onDelete={() => deleteOne.mutate(entry.id)}
              disabled={isSyncing}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
