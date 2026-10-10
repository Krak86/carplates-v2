import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import GoogleTranslateLink from '@/components/GoogleTranslateLink'

type Props = {
  /** The campaign's free-text fields (defect, consequences, remedy…); empty ones are skipped. */
  texts: (string | null | undefined)[]
  /** Language of the texts (`nl`, `en`). */
  from: string
}

/** One translate link for a whole campaign: its text fields joined by blank lines (only worth it from two fields up). */
export default function RecallTranslateAll({ texts, from }: Props): ReactNode {
  const { t } = useTranslation()
  const present = texts.filter((x): x is string => !!x?.trim())
  if (present.length < 2) return null
  return (
    <div className="mt-2 text-xs">
      <span className="mr-2 text-[var(--color-muted)]">{t('translate.all')}</span>
      <GoogleTranslateLink text={present.join('\n\n')} from={from} />
    </div>
  )
}
