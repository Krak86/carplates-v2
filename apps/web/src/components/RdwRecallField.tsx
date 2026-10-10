import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'

type Props = {
  label: string
  value: string
  /** True when `value` is RDW's original Dutch (not translated): tagged `lang="nl"`. */
  dutch?: boolean
  /** Language tag of an untranslated `value` from another source (NHTSA: `en`); `dutch` wins when both are set. */
  lang?: string
  /** Keep the line breaks of `value` (Transport Canada's "Issue: … Safety Risk: …" blocks). */
  multiline?: boolean
  /** Explainer behind the "?" next to the label. */
  info?: string
  /** Machine translation of `value` into the UI language; shown first, labelled, with a switch to the original. */
  translated?: string | null
}

/** One labelled line of a recall campaign (a `<dl>` row), with an optional "?" explaining the field. */
export default function RdwRecallField({
  label,
  value,
  dutch = false,
  lang,
  multiline = false,
  info,
  translated
}: Props): ReactNode {
  const { t } = useTranslation()
  const [showOriginal, setShowOriginal] = useState(false)
  const isTranslated = !!translated && !showOriginal
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
      <dd
        lang={isTranslated ? undefined : dutch ? 'nl' : lang}
        className={multiline ? 'whitespace-pre-line' : undefined}
      >
        {isTranslated ? translated : value}
      </dd>
      {translated && (
        <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
          <span>{isTranslated ? t('recalls.aiTranslation') : t('recalls.originalNl')}</span>
          <button type="button" onClick={() => setShowOriginal(v => !v)} className="underline hover:no-underline">
            {isTranslated ? t('recalls.showOriginal') : t('recalls.showTranslation')}
          </button>
        </dd>
      )}
    </div>
  )
}
