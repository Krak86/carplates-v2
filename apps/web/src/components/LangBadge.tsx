import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  lang: 'ua' | 'ru' | 'en'
}

const HINT_KEYS = { ua: 'reviews.uaHint', ru: 'reviews.ruHint', en: 'reviews.enHint' } as const

/** Small "UA" / "RU" / "EN" chip: the language of the linked site, not of the UI. */
export default function LangBadge({ lang }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <span
      title={t(HINT_KEYS[lang])}
      className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal tracking-normal text-[var(--color-muted)] normal-case"
    >
      {lang.toUpperCase()}
    </span>
  )
}
