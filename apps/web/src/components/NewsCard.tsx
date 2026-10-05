import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NewsItem } from '@carplates/shared'

import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { newsTitle } from '@/lib/news'

type Props = {
  item: NewsItem
  /** Narrow list row (the plate-page widget) instead of the homepage ticker card. */
  compact?: boolean
  /** Thumbnail on the left, text on the right (the wide News section) instead of image-on-top. */
  horizontal?: boolean
  /** Duplicate copies in the looping ticker: out of the tab order and hidden from screen readers. */
  decorative?: boolean
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** One headline: a link out to the source with its image (hotlinked, hidden if it fails), title and `source · date`. Nothing else is copied. */
export default function NewsCard({ item, compact = false, horizontal = false, decorative = false }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = !!item.imageUrl && !imageFailed
  const date = new Date(item.publishedAt).toLocaleDateString(toIntlLocale(i18n.language), {
    day: 'numeric',
    month: 'short'
  })

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      tabIndex={decorative ? -1 : undefined}
      aria-hidden={decorative || undefined}
      className={cn(
        'group overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 transition-colors hover:bg-[var(--color-surface)]',
        horizontal ? 'flex items-stretch' : 'block',
        compact ? 'w-full' : 'w-72 shrink-0'
      )}
    >
      {showImage && (
        <img
          src={item.imageUrl!}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={cn(
            'object-cover',
            horizontal ? 'w-28 shrink-0 self-stretch sm:w-36' : cn('w-full', compact ? 'h-24' : 'h-32')
          )}
        />
      )}

      <div className={cn('space-y-1 p-2.5', horizontal && 'min-w-0 flex-1 self-center')}>
        <p
          className={cn(
            'line-clamp-3 font-medium text-[var(--color-fg)] group-hover:text-[var(--color-primary)]',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {newsTitle(item, t)}
        </p>

        <p className="truncate text-xs text-[var(--color-muted)]">
          {hostOf(item.url)} · {date}
          <span className="sr-only"> — {t('news.opensNewTab')}</span>
        </p>
      </div>
    </a>
  )
}
