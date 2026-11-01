import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'

type Props = {
  label: string
  value: ReactNode
  /** A `field.about.<info>` i18n key - adds a ❓ with a plain-language explanation of the field. */
  info?: string
  /** Rendered under that explanation inside the same popover. */
  infoExtra?: ReactNode
}

/** One label / value line of a card's data list (the registry card's "Basic data" rows); renders nothing without a value. */
export default function FieldRow({ label, value, info, infoExtra }: Props): ReactNode {
  const { t } = useTranslation()
  if (value == null || value === '') return null
  return (
    <div className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <span className="flex items-center gap-1.5 rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">
        {label}
        {info && (
          <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
            <InfoText text={t(`field.about.${info}`)} />
            {infoExtra}
          </InfoPopover>
        )}
      </span>
      <span className="rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-right font-medium">{value}</span>
    </div>
  )
}
