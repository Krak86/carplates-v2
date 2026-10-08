import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import { FIELD_INFO } from '@/components/vin/field-info'
import { useVinText } from '@/components/vin/use-vin-text'
import type { FieldRow } from '@/components/vin/types'

type Props = {
  row: FieldRow
}

/** One decoded field: label (+ ❓ explanation when we have one) and a value that copies on click. Localized, with the English original beside it. */
export default function VinFieldRow({ row }: Props): ReactNode {
  const { t } = useTranslation()
  const { copied, copy } = useCopyFeedback()
  const infoKey = FIELD_INFO[row.variable]
  const text = useVinText()
  const label = text.label(row.variable)
  const value = text.value(row.variable, row.value)

  return (
    <div className="-mx-4 flex items-start justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <dt className="flex items-center gap-1.5 text-[var(--color-muted)]">
        <span>
          {label.text}
          {label.en && <span className="ml-1.5 text-xs opacity-70">{label.en}</span>}
        </span>
        {infoKey && (
          <InfoPopover label={t('vin.info.about', { field: label.text })} title={label.text}>
            <InfoText text={t(`vin.info.${infoKey}`)} />
          </InfoPopover>
        )}
      </dt>

      <dd className="text-right font-medium">
        <button
          type="button"
          title={t('copy.button', { label: label.text })}
          onClick={() => copy(value.en ?? value.text)}
          className="cursor-copy text-right hover:text-[var(--color-primary)]"
        >
          {copied ? `✅ ${t('copy.copied')}` : value.text}
          {!copied && value.en && <span className="block text-xs font-normal opacity-70">{value.en}</span>}
        </button>
      </dd>
    </div>
  )
}
