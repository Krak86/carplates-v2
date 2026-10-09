import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  icon: string
  title: string
  /** The network's own search page for the same phrase. */
  moreUrl: string | undefined
  children: ReactNode
}

/** One labelled network in the Social section: a chip, a sideways-scrolling row of cards and a "more" link. */
export default function SocialGroup({ icon, title, moreUrl, children }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2.5 py-0.5 text-sm font-medium">
          <span aria-hidden>{icon}</span> {title}
        </span>

        {moreUrl && (
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

      <ul className="flex items-start gap-3 overflow-x-auto pb-2">{children}</ul>
    </div>
  )
}
