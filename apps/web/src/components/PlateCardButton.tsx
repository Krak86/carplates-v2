import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { usePlateCardActions } from '@/components/use-plate-card-actions'

type Props = {
  plate: string
  brand: string | null
  model: string | null
  year: number | null
  region: string | null
  regionLabel: string | null
  color: string | null
  kind: string | null
}

/** Chip that renders the vehicle as a shareable PNG card (plate, logo, flag, year, one fact). */
export default function PlateCardButton(props: Props): ReactNode {
  const { t } = useTranslation()
  const { busy, failed, save } = usePlateCardActions(props)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void save()}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60"
    >
      <span aria-hidden>🖼️</span>
      <span aria-live="polite">{failed ? t('share.cardFailed') : t('share.card')}</span>
    </button>
  )
}
