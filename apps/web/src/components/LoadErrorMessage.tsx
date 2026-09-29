import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'

type Props = {
  isChunkError: boolean
  compact?: boolean
}

export default function LoadErrorMessage({ isChunkError, compact = false }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const offlineChunk = isChunkError && !online

  // React.lazy caches a rejected import for the page's lifetime, so only a reload can retry it.
  const handleRetry = (): void => window.location.reload()

  return (
    <div
      role="alert"
      className={cn(
        'mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg bg-[var(--color-bg)]/85 text-center backdrop-blur-sm',
        compact ? 'p-3 text-sm' : 'mt-[10vh] p-6'
      )}
    >
      <p className="text-[var(--color-muted)]">{offlineChunk ? t('loadError.offline') : t('loadError.generic')}</p>
      <button
        type="button"
        onClick={handleRetry}
        disabled={offlineChunk}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 font-medium text-[var(--color-primary-fg)] hover:opacity-90 disabled:opacity-50"
      >
        {t('loadError.retry')}
      </button>
    </div>
  )
}
