import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FAVORITES_LIMIT } from '@carplates/shared'

import Spinner from '@/components/ui/Spinner'
import { useIsSyncing, useSavedSyncActions } from '@/components/use-saved-sync-actions'
import { cn } from '@/lib/cn'
import { useSyncStore } from '@/store/sync-store'

const PILL =
  'absolute inset-x-0 mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-sm shadow-lg backdrop-blur-md transition-[transform,opacity] duration-200 ease-out will-change-transform'

/**
 * Runs the favorites/history sync and shows its progress, plus the "oldest favorites were dropped" notice.
 * Both messages are a fixed overlay under the header that is always mounted and only toggles `transform`/`opacity`
 * (compositor-only), so showing or hiding it never moves the page content.
 */
export default function SyncBanner(): ReactNode {
  const { t } = useTranslation()
  useSavedSyncActions()
  const isSyncing = useIsSyncing()
  const trimmedFavorites = useSyncStore(s => s.trimmedFavorites)
  const setTrimmedFavorites = useSyncStore(s => s.setTrimmedFavorites)
  const showTrimmed = !isSyncing && trimmedFavorites > 0

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 px-4">
      <div
        role="status"
        inert={!isSyncing}
        className={cn(
          PILL,
          'border-[var(--color-border)] bg-[var(--color-surface)]/90',
          isSyncing ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
        )}
      >
        <Spinner /> {t('sync.syncing')}
      </div>

      <div
        role="status"
        inert={!showTrimmed}
        className={cn(
          PILL,
          'border-amber-500/40 bg-amber-500/15 font-medium text-amber-800 dark:text-amber-300',
          showTrimmed ? 'pointer-events-auto translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
        )}
      >
        <span>{t('sync.favoritesTrimmed', { limit: FAVORITES_LIMIT, count: trimmedFavorites })}</span>
        <button type="button" aria-label={t('sync.dismiss')} onClick={() => setTrimmedFavorites(0)}>
          ✕
        </button>
      </div>
    </div>
  )
}
