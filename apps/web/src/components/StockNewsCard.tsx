import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { StockNewsResponse } from '@carplates/shared'

import { toIntlLocale } from '@/lib/intl'

type Props = {
  item: StockNewsResponse['items'][number]
  /** Short description under the title (the Social strip); the narrow side widget shows the headline only. */
  withSummary?: boolean
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** One Yahoo Finance headline: title, optional short summary and `source · date`, linking out to the article. */
export default function StockNewsCard({ item, withSummary = false }: Props): ReactNode {
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
      className="group block space-y-1.5 rounded-lg border border-border bg-surface/60 p-2.5 transition-colors hover:bg-surface"
    >
      {!!item.imageUrl && !imageFailed && (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="h-24 w-full rounded-md object-cover"
        />
      )}

      <p className="line-clamp-4 text-sm font-medium break-words text-fg group-hover:text-primary">
        {item.title} <span aria-hidden>↗</span>
      </p>

      {withSummary && !!item.summary && <p className="line-clamp-3 text-xs break-words text-muted">{item.summary}</p>}

      <p className="truncate text-xs text-muted">
        {item.publisher || hostOf(item.url)} · {date}
        <span className="sr-only"> - {t('news.opensNewTab')}</span>
      </p>
    </a>
  )
}
