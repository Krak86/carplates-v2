import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import { FIELD_INFO } from '@/components/vin/field-info'
import { formatFieldValue } from '@/components/vin/helpers'
import type { FieldRow } from '@/components/vin/types'

type Props = {
  row: FieldRow
}

/** One decoded field: label (+ ❓ explanation when we have one) and a value that copies on click. */
export default function VinFieldRow({ row }: Props): ReactNode {
  const { t } = useTranslation()
  const { copied, copy } = useCopyFeedback()
  const infoKey = FIELD_INFO[row.variable]
  const value = formatFieldValue(row.variable, row.value)

  return (
    <div className="-mx-4 flex items-start justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <dt className="flex items-center gap-1.5 text-[var(--color-muted)]">
        {row.variable}
        {infoKey && (
          <InfoPopover label={t('vin.info.about', { field: row.variable })} title={row.variable}>
            <p>{t(`vin.info.${infoKey}`)}</p>
          </InfoPopover>
        )}
      </dt>

      <dd className="text-right font-medium">
        <button
          type="button"
          title={t('copy.button', { label: row.variable })}
          onClick={() => copy(value)}
          className="cursor-copy text-right hover:text-[var(--color-primary)]"
        >
          {copied ? `✅ ${t('copy.copied')}` : value}
        </button>
      </dd>
    </div>
  )
}
