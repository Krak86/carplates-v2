import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { StockPhoto } from '@/components/use-stock-photos-actions'
import { hostOf } from '@/lib/new-cars'

type Props = {
  /** Row label, e.g. "New" / "Used". */
  label: string
  icon: string
  cards: readonly StockPhoto[]
  /** Where every card in this row leads (the importer's new- or used-cars page). */
  url: string
  /** Translation key prefix of this row's ad lines (`<prefix>1`, `<prefix>2` …). */
  adKeyPrefix: string
  /** One distinct ad number per card. */
  ads: readonly number[]
  brandName: string
  year: number
  onImageError: (imageUrl: string) => void
}

/** One labelled row of ≤ 3 link cards (photo + ad line + host); scrolls sideways when the cards don't fit, like the videos strip. */
export default function StockRow({
  label,
  icon,
  cards,
  url,
  adKeyPrefix,
  ads,
  brandName,
  year,
  onImageError
}: Props): ReactNode {
  const { t } = useTranslation()
  if (!cards.length) return null

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/20 px-2.5 py-0.5 text-sm font-medium">
          <span aria-hidden>{icon}</span> {label}
        </span>
      </div>

      <ul className="flex gap-3 overflow-x-auto pb-2">
        {cards.map(({ model, year: photoYear, image }, i) => {
          const credit = [image.attribution?.author, image.attribution?.license].filter(Boolean).join(' · ')
          return (
            <li key={image.url} className="min-w-48 flex-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group block h-full overflow-hidden rounded-lg border border-border bg-surface/60 transition-colors hover:bg-surface"
              >
                <div className="relative">
                  <img
                    src={image.url}
                    alt={`${brandName} ${model} ${photoYear}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => onImageError(image.url)}
                    className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {brandName} {model} {photoYear}
                  </span>
                </div>

                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-3 min-h-12 text-sm font-medium text-fg group-hover:text-primary">
                    {t(`${adKeyPrefix}${ads[i] ?? 1}`, { brand: brandName, year })}
                  </p>

                  <p className="truncate text-xs text-muted">
                    {hostOf(url)} <span aria-hidden>↗</span>
                    <span className="sr-only"> — {t('newCarsWidget.opensNewTab')}</span>
                  </p>

                  {credit && (
                    <p className="truncate text-[10px] text-muted/70" title={credit}>
                      <span aria-hidden>📷</span> {credit}
                    </p>
                  )}
                </div>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
