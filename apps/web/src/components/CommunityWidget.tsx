import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import CommunityPostCard from '@/components/CommunityPostCard'
import { cn } from '@/lib/cn'
import type { CommunityPost } from '@/lib/community'

/** The side panel is a teaser; the Social section on the card lists the rest. */
const WIDGET_POSTS = 3

type Props = {
  icon: string
  title: string
  posts: CommunityPost[]
  moreUrl: string | undefined
  side: 'left' | 'right'
}

/**
 * Side panel with the top forum threads (Lemmy / Mechanics Q&A) for the car's make + model. Same look and behaviour as
 * the Bluesky and news panels: dismissible per route, slides in from its own side. The column and the delay are decided
 * by `useSideCommunity`; this only renders what it is given.
 */
export default function CommunityWidget({ icon, title, posts, moreUrl, side }: Props): ReactNode {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)

  if (!posts.length || dismissedPath === pathname) return null

  return (
    <aside
      aria-label={title}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        side === 'left' ? 'starting:-translate-x-8 starting:opacity-0' : 'starting:translate-x-8 starting:opacity-0',
        'pointer-events-auto translate-x-0 opacity-100'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="px-1 text-sm font-semibold">
          <span aria-hidden>{icon}</span> {title}
        </h2>

        <button
          type="button"
          aria-label={t('social.close', { source: title })}
          title={t('social.close', { source: title })}
          onClick={() => setDismissedPath(pathname)}
          className="rounded-md px-1.5 text-lg leading-none text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
        >
          ×
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {posts.slice(0, WIDGET_POSTS).map(post => (
          <li key={post.id}>
            <CommunityPostCard post={post} />
          </li>
        ))}
      </ul>

      {moreUrl && (
        <a
          href={moreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-2 py-1.5 text-center text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        >
          {t('social.more')} <span aria-hidden>↗</span>
        </a>
      )}
    </aside>
  )
}
