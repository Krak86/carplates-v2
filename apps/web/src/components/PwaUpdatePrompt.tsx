import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { usePwaActions } from '@/components/use-pwa-actions'

export default function PwaUpdatePrompt(): ReactNode {
  const { t } = useTranslation()
  const { needRefresh, offlineReady, handleUpdate, handleDismiss } = usePwaActions()

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 left-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-3 text-sm shadow-lg backdrop-blur-md"
    >
      <span className="flex-1">{needRefresh ? t('pwa.updateAvailable') : t('pwa.offlineReady')}</span>

      {needRefresh && (
        <button
          type="button"
          onClick={handleUpdate}
          className="rounded-md bg-[var(--color-primary)] px-3 py-1 font-medium text-[var(--color-primary-fg)] hover:opacity-90"
        >
          {t('pwa.update')}
        </button>
      )}

      <button
        type="button"
        onClick={handleDismiss}
        className="rounded-md px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        {needRefresh ? t('pwa.later') : t('pwa.close')}
      </button>
    </div>
  )
}
