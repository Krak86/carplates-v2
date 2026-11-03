import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { brandLogoUrl } from '@carplates/shared'
import type { MarketCard, WikiImage } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import VehicleKindIcon from '@/components/VehicleKindIcon'
import { marketKindOf } from './helpers'

type Props = {
  card: MarketCard
  brand: string
  model: string
  kind: string | null | undefined
  /** One model photo shared by the whole block (our stored copy, Wikimedia as the server fallback); null when none exists. */
  fallback: WikiImage | null
  className?: string
}

/**
 * Photo chain of a card, no extra CarAPIS request for any step: (1) the listing's own thumbnail; (2) when it is missing or
 * fails to load, the shared model photo with an "Illustrative photo" badge so it is never read as the car itself;
 * (3) with neither, a text tile (brand logo or kind icon, year and model).
 */
export default function MarketPhoto({ card, brand, model, kind, fallback, className = 'h-36' }: Props): ReactNode {
  const { t } = useTranslation()
  const [thumbFailed, setThumbFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)
  const label = [brand, model, card.year].filter(Boolean).join(' ')

  if (card.thumb && !thumbFailed) {
    return (
      <img
        src={card.thumb}
        alt={label}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setThumbFailed(true)}
        className={`${className} w-full object-cover`}
      />
    )
  }

  if (fallback && !fallbackFailed) {
    const credit = [fallback.attribution?.author, fallback.attribution?.license].filter(Boolean).join(' · ')
    return (
      <div className={`${className} relative w-full`}>
        <img
          src={fallback.url}
          alt={label}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFallbackFailed(true)}
          className="h-full w-full object-cover"
        />
        <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {t('market.illustrative')}
        </span>
        {credit && (
          <span
            title={credit}
            className="absolute right-1.5 bottom-1.5 left-1.5 truncate rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90"
          >
            <span aria-hidden>📷</span> {credit}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`${className} flex w-full flex-col items-center justify-center gap-1.5 border-b border-border bg-surface/80 p-3 text-center`}
    >
      <div className="flex h-12 items-center justify-center">
        {brandLogoUrl(brand) ? (
          <BrandLogo brand={brand} className="h-full max-h-12 w-full max-w-20 object-contain" />
        ) : (
          <VehicleKindIcon kind={marketKindOf(kind)} className="h-8 text-muted" />
        )}
      </div>
      <p className="text-sm font-medium">{[card.year, model].filter(Boolean).join(' ')}</p>
    </div>
  )
}
