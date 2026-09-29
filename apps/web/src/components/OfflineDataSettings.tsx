import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useOfflineDataActions } from '@/components/use-offline-data-actions'
import { toIntlLocale } from '@/lib/intl'

export default function OfflineDataSettings(): ReactNode {
  const { t, i18n } = useTranslation()
  const { estimate, isClearing, clear } = useOfflineDataActions()

  const handleClear = (): void => {
    if (window.confirm(t('offline.confirmClear'))) clear()
  }

  const size = estimate
    ? new Intl.NumberFormat(toIntlLocale(i18n.language), {
        style: 'unit',
        unit: 'megabyte',
        maximumFractionDigits: 1
      }).format(estimate.usage / (1024 * 1024))
    : null

  return (
    <>
      <div className="mt-4 px-3 text-xs tracking-wide text-[var(--color-muted)] uppercase">
        {t('offline.settingsTitle')}
      </div>
      {size && <p className="px-3 text-sm text-[var(--color-muted)]">{t('offline.usage', { size })}</p>}
      <button
        type="button"
        onClick={handleClear}
        disabled={isClearing}
        className="rounded-lg bg-[var(--color-surface)]/60 px-3 py-1.5 text-left text-sm text-[var(--color-muted)] transition-colors duration-200 hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)] disabled:opacity-50"
      >
        {t('offline.clear')}
      </button>
    </>
  )
}
