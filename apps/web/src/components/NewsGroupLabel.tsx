import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  icon: string
  title: string
  /** The source's own page for the same topic. */
  moreUrl?: string
}

/** Label chip above one group of headlines in the News section, with an optional "more" link (same look as the Social groups). */
export default function NewsGroupLabel({ icon, title, moreUrl }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2.5 py-0.5 text-sm font-medium">
        <span aria-hidden>{icon}</span> {title}
      </span>

      {!!moreUrl && (
        <a
          href={moreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-2 py-1 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        >
          {t('social.more')} <span aria-hidden>↗</span>
        </a>
      )}
    </div>
  )
}
