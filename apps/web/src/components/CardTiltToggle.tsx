import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/ui-store'

type Props = {
  className?: string
}

export default function CardTiltToggle({ className }: Props): ReactNode {
  const { t } = useTranslation()
  const tiltEnabled = useUiStore(s => s.cardTiltEnabled)
  const toggleCardTilt = useUiStore(s => s.toggleCardTilt)

  return (
    <button
      type="button"
      aria-pressed={tiltEnabled}
      aria-label={tiltEnabled ? t('result.tiltDisable') : t('result.tiltEnable')}
      title={tiltEnabled ? t('result.tiltDisable') : t('result.tiltEnable')}
      onClick={toggleCardTilt}
      className={cn(
        'rounded-full bg-[var(--color-surface)]/20 px-2 py-1 text-lg leading-none',
        tiltEnabled ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]',
        className
      )}
    >
      <span aria-hidden>🔄</span>
    </button>
  )
}
