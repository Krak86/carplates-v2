import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import GoogleTranslateLink from '@/components/GoogleTranslateLink'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'

type Props = {
  label: string
  value: string
  /** Translated explainer; adds the ❓ popover next to the label. */
  about?: string
  /** Wikipedia edition the value's own words come from (`ru`, `en` …): tags the value and adds the Translate link under it. */
  sourceLang?: string
}

/** One label / value row, styled like the Specs block's rows (muted label chip with a ❓ explainer, value on the right). */
export default function WikiSpecRow({ label, value, about, sourceLang }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <span className="flex items-center gap-1.5 rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">
        {label}
        {about && (
          <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
            <InfoText text={about} />
          </InfoPopover>
        )}
      </span>
      <span className="min-w-0 text-right">
        <span lang={sourceLang} className="rounded bg-[var(--color-surface)]/20 px-1 py-0.5 font-medium">
          {value}
        </span>
        {sourceLang && (
          <span className="mt-0.5 block text-xs">
            <GoogleTranslateLink text={value} from={sourceLang} />
          </span>
        )}
      </span>
    </div>
  )
}
