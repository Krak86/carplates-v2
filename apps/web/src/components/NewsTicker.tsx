import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { NewsItem } from '@carplates/shared'

import NewsCard from '@/components/NewsCard'

type Props = {
  items: NewsItem[]
}

// Seconds each card takes to cross — the loop speed stays constant however many items there are.
const SECONDS_PER_CARD = 14

/**
 * Homepage strip of the latest headlines that scrolls itself, endlessly and smoothly (a CSS-only loop over two copies
 * of the list). Pauses on hover / focus; with reduced motion it is a plain horizontally scrollable row.
 */
export default function NewsTicker({ items }: Props): ReactNode {
  const { t } = useTranslation()
  if (!items.length) return null

  return (
    <section aria-label={t('news.latest')} className="w-full rounded-xl bg-[var(--color-surface)]/20 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-lg font-semibold">
          <span aria-hidden>📰</span> {t('news.latest')}
        </h2>

        <Link
          viewTransition
          to="/news"
          className="shrink-0 text-sm text-[var(--color-primary)] underline hover:no-underline"
        >
          {t('news.more')} →
        </Link>
      </div>

      <div className="news-marquee">
        <ul className="news-track" style={{ animationDuration: `${items.length * SECONDS_PER_CARD}s` }}>
          {[false, true].flatMap(decorative =>
            items.map(item => (
              <li key={`${decorative ? 'copy' : 'main'}-${item.url}`} className="contents">
                <NewsCard item={item} decorative={decorative} />
              </li>
            ))
          )}
        </ul>
      </div>

      <p className="mt-1.5 px-1 text-xs text-[var(--color-muted)]">{t('news.disclaimer')}</p>
    </section>
  )
}
