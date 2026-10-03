import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  lang: 'ua' | 'ru'
}

/** Small "UA" / "RU" chip: the language of the linked site, not of the UI. */
export default function LangBadge({ lang }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <span
      title={t(lang === 'ru' ? 'reviews.ruHint' : 'reviews.uaHint')}
      className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal tracking-normal text-[var(--color-muted)] normal-case"
    >
      {lang === 'ru' ? 'RU' : 'UA'}
    </span>
  )
}
