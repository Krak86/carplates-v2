import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'

type Props = {
  label: string
  value: string
  /** True when `value` is RDW's original Dutch (not translated): tagged `lang="nl"`. */
  dutch?: boolean
  /** Explainer behind the "?" next to the label. */
  info?: string
}

/** One labelled line of a recall campaign (a `<dl>` row), with an optional "?" explaining the field. */
export default function RdwRecallField({ label, value, dutch = false, info }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
        {label}
        {info && (
          <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
            <InfoText text={info} />
          </InfoPopover>
        )}
      </dt>
      <dd lang={dutch ? 'nl' : undefined}>{value}</dd>
    </div>
  )
}
