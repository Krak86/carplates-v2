import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import NewsGroups from '@/components/NewsGroups'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { newsLangFilter } from '@/lib/news'
import { newsQuery } from '@/lib/queries'

type Props = {
  brand: string
  model: string | null
  year: number | null
}

/** Wide enough that the card (max-w-2xl, centred) leaves the right-hand gutter free. Tablets / phones never get the widget. */
const DESKTOP_QUERY = '(min-width: 1400px)'
const SHOW_AFTER_SCROLL_PX = 80

/**
 * Right-hand news panel on a plate / VIN result: the car's make+model(+year) news first, then make-only news (decided
 * server-side). The request runs as soon as the result is known, so with nothing to show nothing is ever rendered;
 * with news, the panel fades in from the right once the user starts scrolling.
 */
export default function NewsWidget({ brand, model, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { pathname } = useLocation()
  // Dismissal is per route: storing the path it was closed on makes it lapse on the next navigation.
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState<boolean>(() => window.scrollY > SHOW_AFTER_SCROLL_PX)
  const news = useQuery({ ...newsQuery(brand, model, year, newsLangFilter(i18n.language)), enabled: isDesktop })

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > SHOW_AFTER_SCROLL_PX)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => window.removeEventListener('scroll', handleScroll)
  }, [])

  const items = news.data?.items ?? []
  if (!isDesktop || !items.length || dismissedPath === pathname) return null

  return (
    <aside
      aria-label={t('news.title')}
      aria-hidden={!scrolled}
      className={cn(
        'fixed top-20 right-4 z-10 flex max-h-[calc(100vh-6rem)] w-60 flex-col gap-2 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        scrolled ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-8 opacity-0'
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

      <NewsGroups items={items} brand={brand} model={model} decorative={!scrolled} />
    </aside>
  )
}
