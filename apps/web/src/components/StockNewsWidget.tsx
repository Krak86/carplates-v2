import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import type { StockNewsResponse } from '@carplates/shared'

import StockNewsCard from '@/components/StockNewsCard'
import { cn } from '@/lib/cn'

/** The side panel opens as a teaser; "show more" reveals the rest of the feed in place. */
const WIDGET_ITEMS = 3
const WIDGET_ITEMS_EXPANDED = 10

type Props = {
  news: StockNewsResponse
  side: 'left' | 'right'
}

/**
 * Side panel with the Yahoo Finance headlines of the listed company behind the car's make (same ticker as the share-price
 * panel). Same look and behaviour as the other side panels: dismissible per route, slides in from its own side. The
 * column and the delay are decided by `useSideCommunity`; this only renders what it is given.
 */
export default function StockNewsWidget({ news, side }: Props): ReactNode {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  if (!news.company || !news.items.length || dismissedPath === pathname) return null

  const title = t('stockNews.title', { name: news.company.name })
  const shown = news.items.slice(0, expanded ? WIDGET_ITEMS_EXPANDED : WIDGET_ITEMS)
  const canExpand = news.items.length > WIDGET_ITEMS

  return (
    <aside
      aria-label={title}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-border bg-bg/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        side === 'left' ? 'starting:-translate-x-8 starting:opacity-0' : 'starting:translate-x-8 starting:opacity-0',
        'pointer-events-auto translate-x-0 opacity-100'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate px-1 text-sm font-semibold" title={title}>
          <span aria-hidden>💹</span> {title}
        </h2>

        <button
          type="button"
          aria-label={t('social.close', { source: title })}
          title={t('social.close', { source: title })}
          onClick={() => setDismissedPath(pathname)}
          className="rounded-md px-1.5 text-lg leading-none text-muted hover:bg-surface hover:text-fg"
        >
          ×
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {shown.map(item => (
          <li key={item.id}>
            <StockNewsCard item={item} />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-1">
        {canExpand ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(v => !v)}
            className="rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-surface"
          >
            {expanded ? t('stockNews.less') : t('stockNews.showMore')} <span aria-hidden>{expanded ? '↑' : '↓'}</span>
          </button>
        ) : (
          <span />
        )}

        {news.moreUrl && (
          <a
            href={news.moreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-surface"
          >
            {t('social.more')} <span aria-hidden>↗</span>
          </a>
        )}
      </div>
    </aside>
  )
}
