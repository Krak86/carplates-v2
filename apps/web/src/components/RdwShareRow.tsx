import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'

type Props = {
  /** Suffix of the `rdw.<key>` label and `rdw.about.<key>` explainer i18n keys. */
  rowKey: string
  /** Ready-made chip texts ("Hatchback 62%"), largest first. */
  chips: readonly string[]
}

/**
 * A non-range row of the Specs block (fuel mix, body type, colours, label, recall share): the same label chip with a ❓
 * explainer as `SpecRow`, and the value side as a few small pills instead of a median and a range.
 */
export default function RdwShareRow({ rowKey, chips }: Props): ReactNode {
  const { t } = useTranslation()
  const label = t(`rdw.${rowKey}`)

  return (
    <div className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <span className="flex items-center gap-1.5 self-start rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">
        {label}
        <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
          <InfoText text={t(`rdw.about.${rowKey}`)} />
        </InfoPopover>
      </span>

      <span className="flex flex-wrap items-center justify-end gap-1 py-0.5">
        {chips.map(chip => (
          <span
            key={chip}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-sm font-medium"
          >
            {chip}
          </span>
        ))}
      </span>
    </div>
  )
}
