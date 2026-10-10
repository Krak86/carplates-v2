import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import BlueskyPostCard from '@/components/BlueskyPostCard'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SIDE_WIDGETS_DESKTOP_QUERY } from '@/hooks/useSideWidgetsVisible'
import { blueskyQuery } from '@/lib/bluesky'
import { cn } from '@/lib/cn'

/** The side panel is a teaser; the Social section on the card lists the rest. */
const WIDGET_POSTS = 2

type Props = {
  brand: string
  model: string | null
  year: number | null
}

/**
 * Left-hand Bluesky panel on a plate result: recent posts matching the car's "make model (year)", found by Bluesky's
 * own search. Same UX as the news panel — desktop only, renders nothing without posts, fades in from the left once the
 * user starts scrolling, dismissible per route. Positioned by the shared left column in SearchRoute.
 */
export default function BlueskyWidget({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const { pathname } = useLocation()
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)
  const posts = useQuery({ ...blueskyQuery(brand, model, year), enabled: isDesktop })

  const items = (posts.data?.posts ?? []).slice(0, WIDGET_POSTS)
  if (!isDesktop || !items.length || dismissedPath === pathname) return null

  return (
    <aside
      aria-label={t('bluesky.title')}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        // Mounted only after the delay (see useSideWidgetsVisible), so it slides in on insertion.
        'starting:-translate-x-8 starting:opacity-0',
        'pointer-events-auto translate-x-0 opacity-100'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="px-1 text-sm font-semibold">
          <span aria-hidden>🦋</span> {t('bluesky.title')}
        </h2>

        <button
          type="button"
          aria-label={t('bluesky.close')}
          title={t('bluesky.close')}
          onClick={() => setDismissedPath(pathname)}
          className="rounded-md px-1.5 text-lg leading-none text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
        >
          ×
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map(post => (
          <li key={post.id}>
            <BlueskyPostCard post={post} />
          </li>
        ))}
      </ul>

      <a
        href={posts.data?.searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md px-2 py-1.5 text-center text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
      >
        {t('bluesky.more')} <span aria-hidden>↗</span>
      </a>
    </aside>
  )
}
