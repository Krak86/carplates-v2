import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'

type Props = {
  /** Suffix of the `ev.about.<field>` explainer i18n key. */
  field: 'battery' | 'consumption' | 'ac' | 'dc'
  label: string
  value: string
}

/** One label / value pair of an electric variant, with a "?" explaining the figure. */
export default function OpenEvRow({ field, label, value }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <>
      <dt className="flex items-center gap-1 text-[var(--color-muted)]">
        {label}
        <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
          <InfoText text={t(`ev.about.${field}`)} />
        </InfoPopover>
      </dt>
      <dd>{value}</dd>
    </>
  )
}
