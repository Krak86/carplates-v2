import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useShareActions } from '@/components/use-share-actions'
import type { ShareSection } from '@/lib/share-section'

type Props = {
  section: ShareSection
  tab?: string
  label: string
}

/**
 * Copies a deep link to this expanded section (and, for ratings, its active
 * tab) — opening that link re-expands the same section and scrolls to it.
 */
export default function ShareButton({ section, tab, label }: Props): ReactNode {
  const { t } = useTranslation()
  const { copied, share } = useShareActions(section, tab)

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={share}
      className="flex items-center rounded-full bg-[var(--color-surface)]/20 px-2 py-1 text-[var(--color-primary)]"
    >
      <span aria-hidden>{copied ? '✅' : '🔗'}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? t('share.copied') : ''}
      </span>
    </button>
  )
}
