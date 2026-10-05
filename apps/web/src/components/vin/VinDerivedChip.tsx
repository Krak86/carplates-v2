import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { FallbackSource } from '@/components/vin/helpers'

type Props = {
  source: FallbackSource
}

/** Small "not from NHTSA" tag next to a value — hover/long-press explains where it came from. */
export default function VinDerivedChip({ source }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <span
      title={t(`vin.derived.${source}.hint`)}
      className="ml-1.5 inline-block rounded-full border border-dashed border-[var(--color-border)] px-1.5 py-px align-middle text-xs font-normal text-[var(--color-muted)]"
    >
      ≈ {t(`vin.derived.${source}.label`)}
    </span>
  )
}
