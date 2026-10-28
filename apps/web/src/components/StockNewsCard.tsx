import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { StockNewsResponse } from '@carplates/shared'

import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  item: StockNewsResponse['items'][number]
  /** Thumbnail on the left, text on the right (the News section, same look as `NewsCard`) instead of image-on-top. */
  horizontal?: boolean
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** One Yahoo Finance headline: title and `source · date`, linking out to the article. */
export default function StockNewsCard({ item, horizontal = false }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const date = new Date(item.publishedAt).toLocaleDateString(toIntlLocale(i18n.language), {
    day: 'numeric',
    month: 'short'
  })

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        'group overflow-hidden rounded-lg border border-border bg-surface/60 transition-colors hover:bg-surface',
        horizontal ? 'flex items-stretch' : 'block space-y-1.5 p-2.5'
      )}
    >
      {!!item.imageUrl && !imageFailed && (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={cn('object-cover', horizontal ? 'w-28 shrink-0 self-stretch sm:w-36' : 'h-24 w-full rounded-md')}
        />
      )}

      <div className={cn(horizontal && 'min-w-0 flex-1 space-y-1 self-center p-2.5')}>
        <p
          className={cn(
            'font-medium break-words text-fg group-hover:text-primary',
            horizontal ? 'line-clamp-3 text-sm' : 'line-clamp-4 text-sm'
          )}
        >
          {item.title} <span aria-hidden>↗</span>
        </p>

        <p className={cn('truncate text-xs text-muted', !horizontal && 'mt-1.5')}>
          {item.publisher || hostOf(item.url)} · {date}
          <span className="sr-only"> - {t('news.opensNewTab')}</span>
        </p>
      </div>
    </a>
  )
}
