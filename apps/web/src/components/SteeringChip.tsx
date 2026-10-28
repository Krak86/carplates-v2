import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { parseSteeringSide } from '@/components/vin/helpers'

type Props = {
  /** NHTSA "Steering Location" ("Left-Hand Drive (LHD)"), when the VIN was decoded. */
  steering: string | undefined
}

const CHIP =
  'chip-market chip-tone inline-flex animate-chip-in items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs text-[var(--color-fg)]'

/** "RHD" chip from the decoded VIN. Left-hand drive is the norm in Ukraine, so only the unusual side is flagged. */
export default function SteeringChip({ steering }: Props): ReactNode {
  const { t } = useTranslation()
  if (parseSteeringSide(steering) !== 'rhd') return null

  return (
    <span className={CHIP} title={t('chip.tip.steering.rhd')}>
      <span aria-hidden>🛞</span>
      RHD
    </span>
  )
}
