import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { brandLogoUrl, type NewsItem } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { newsGroupOfSource, newsTagColor, newsTitle } from '@/lib/news'

type Props = {
  item: NewsItem
  /** Narrow list row (the plate-page widget) instead of the homepage ticker card. */
  compact?: boolean
  /** Thumbnail on the left, text on the right (the wide News section) instead of image-on-top. */
  horizontal?: boolean
  /** Duplicate copies in the looping ticker: out of the tab order and hidden from screen readers. */
  decorative?: boolean
  /** Make shown as a logo tile when the article has no (working) image. */
  fallbackBrand?: string | null
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Stable oklch hue per source, so each outlet's placeholder tile has its own tint. */
const hostHue = (host: string): number => [...host].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 360, 7)

/** One headline: a link out to the source with its image (hotlinked, hidden if it fails), title and `source · date`. Nothing else is copied. */
export default function NewsCard({
  item,
  compact = false,
  horizontal = false,
  decorative = false,
  fallbackBrand = null
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = !!item.imageUrl && !imageFailed
  const hasBrandLogo = !!fallbackBrand && !!brandLogoUrl(fallbackBrand)
  const host = hostOf(item.url)
  const group = newsGroupOfSource(item.source)
  const tag = group ? newsTagColor(group.hue) : undefined
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
      style={tag ? ({ '--tag': tag } as CSSProperties) : undefined}
      className={cn(
        'group overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 transition-colors hover:bg-[var(--color-surface)]',
        tag && 'border-l-4 border-l-(--tag)',
        horizontal ? 'flex items-stretch' : 'block',
        compact ? 'w-full' : 'w-72 shrink-0'
      )}
    >
      {!showImage && hasBrandLogo && (
        <div
          className={cn(
            'flex items-center justify-center bg-white/90 p-3 dark:bg-white/10',
            horizontal ? 'w-28 shrink-0 self-stretch sm:w-36' : cn('w-full', compact ? 'h-24' : 'h-32')
          )}
        >
          <BrandLogo brand={fallbackBrand} className="h-full max-h-14 w-full max-w-20 object-contain" />
        </div>
      )}

      {!showImage && !hasBrandLogo && (
        <div
          aria-hidden
          style={{
            background: `linear-gradient(135deg, oklch(0.4 0.06 ${hostHue(host)} / 0.55), oklch(0.28 0.03 ${hostHue(host)} / 0.55))`
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-1 border-border text-muted',
            horizontal
              ? 'w-28 shrink-0 self-stretch border-r sm:w-36'
              : cn('w-full border-b', compact ? 'h-24' : 'h-32')
          )}
        >
          <span className="rounded-lg border border-white/20 px-2.5 py-1.5 text-2xl shadow-inner">📰</span>
          <span className="max-w-full truncate px-2 text-[10px] tracking-wide uppercase">{host}</span>
        </div>
      )}

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
          {newsTitle(item, t)} <span aria-hidden>↗</span>
        </p>

        <p className="truncate text-xs text-[var(--color-muted)]">
          <span className={cn(tag && 'font-medium text-[var(--tag)]')}>{host}</span> · {date}
          <span className="sr-only"> - {t('news.opensNewTab')}</span>
        </p>
      </div>
    </a>
  )
}
