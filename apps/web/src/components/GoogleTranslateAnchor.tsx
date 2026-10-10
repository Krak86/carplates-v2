import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { googleTranslateUrl } from '@/lib/google-translate'

type Props = {
  text: string
  /** Language of `text` (`nl`, `en`). */
  from: string
  className?: string
}

/** External link to translate.google.com with `text` prefilled, UI language as the target: Google logo, label, ↗. */
export default function GoogleTranslateAnchor({ text, from, className }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  return (
    <a
      href={googleTranslateUrl(text, from, i18n.language)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 underline hover:no-underline ${className ?? ''}`}
    >
      <img src="/logos/google-translate.svg" alt="" width={14} height={14} className="h-3.5 w-3.5" />
      {t('recalls.translateGoogle')}
      <span aria-hidden>↗</span>
    </a>
  )
}
