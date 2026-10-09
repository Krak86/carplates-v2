import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import NewsGroups from '@/components/NewsGroups'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SIDE_WIDGETS_DESKTOP_QUERY, useScrolledOnRoute } from '@/hooks/useSideWidgetsVisible'
import { cn } from '@/lib/cn'
import { newsLangFilter } from '@/lib/news'
import { newsQuery } from '@/lib/queries'

/** The side panel is a teaser; the rest is behind the "more news" link. */
const WIDGET_ITEMS = 3

type Props = {
  brand: string
  model: string | null
  year: number | null
}

/**
 * Right-hand news panel on a plate / VIN result (positioned by the shared right column in SearchRoute): the car's make+model(+year) news first, then make-only news (decided
 * server-side). The request runs as soon as the result is known, so with nothing to show nothing is ever rendered;
 * with news, the panel fades in from the right once the user starts scrolling.
 */
export default function NewsWidget({ brand, model, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const { pathname } = useLocation()
  // Dismissal is per route: storing the path it was closed on makes it lapse on the next navigation.
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)
  const scrolled = useScrolledOnRoute()
  const news = useQuery({ ...newsQuery(brand, model, year, newsLangFilter(i18n.language)), enabled: isDesktop })

  const all = news.data?.items ?? []
  if (!isDesktop || !all.length || dismissedPath === pathname) return null

  const items = all.slice(0, WIDGET_ITEMS)
  // Same filter as the panel: make + model when the model itself has headlines, otherwise the make alone.
  const query = all.some(i => i.match === 'model') && model ? `${brand} ${model}` : brand
  const moreTo = `/news?${new URLSearchParams({ q: query })}`
  return (
    <aside
      aria-label={t('news.title')}
      aria-hidden={!scrolled}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        // Mounted only after the first scroll (see useSideWidgetsVisible), so it slides in on insertion.
        'starting:translate-x-8 starting:opacity-0',
        scrolled ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-8 opacity-0'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="px-1 text-sm font-semibold">
          <span aria-hidden>📰</span> {t('news.title')}
        </h2>

        <button
          type="button"
          aria-label={t('news.close')}
          title={t('news.close')}
          onClick={() => setDismissedPath(pathname)}
          className="rounded-md px-1.5 text-lg leading-none text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
        >
          ×
        </button>
      </div>

      <NewsGroups items={items} brand={brand} decorative={!scrolled} />

      <Link
        to={moreTo}
        tabIndex={scrolled ? undefined : -1}
        className="rounded-md px-2 py-1.5 text-center text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
      >
        {t('news.more')} <span aria-hidden>→</span>
      </Link>
    </aside>
  )
}
