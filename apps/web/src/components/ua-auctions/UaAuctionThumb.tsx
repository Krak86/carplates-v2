import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { brandLogoUrl, prozorroDocumentUrl } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import LazySection from '@/components/LazySection'
import { cn } from '@/lib/cn'
import { wikiImageQuery } from '@/lib/queries'

type Props = {
  /** Prozorro document ids (32 hex); only the first is shown. */
  docIds: readonly string[] | null | undefined
  /** Names the photo for screen readers, e.g. the vehicle. */
  label: string
  /** Where a click goes (the lot's own page); without it the picture is not a link. */
  href: string | null
  /** Vehicle of the lot: without photos of its own, a stock photo of this make / model / year stands in. */
  make?: string | null
  model?: string | null
  year?: number | null
  /** Tints and names the placeholder tile when there is no picture at all. */
  source?: 'setam' | 'prozorro'
}

const TILE =
  'relative aspect-[4/3] w-28 shrink-0 self-start overflow-hidden rounded-md bg-[var(--color-border)]/30 sm:w-36'

type PreviewProps = {
  make: string | null
  model: string | null
  year: number | null
  label: string
  source: 'setam' | 'prozorro'
}

const SOURCE_HUE = { setam: 70, prozorro: 240 } as const
const SOURCE_NAME = { setam: 'SETAM', prozorro: 'Prozorro.Sale' } as const

/** Stands in when there is no photo and no stock photo: the make's logo when known, else a tinted tile (like a news item without an image). */
function PlaceholderTile({ make, source }: Pick<PreviewProps, 'make' | 'source'>): ReactNode {
  if (make && brandLogoUrl(make)) {
    return (
      <div className={cn(TILE, 'flex items-center justify-center bg-white/90 p-3 dark:bg-white/10')}>
        <BrandLogo brand={make} className="h-full max-h-14 w-full max-w-20 object-contain" />
      </div>
    )
  }
  const hue = SOURCE_HUE[source]
  return (
    <div
      aria-hidden
      style={{ background: `linear-gradient(135deg, oklch(0.4 0.06 ${hue} / 0.55), oklch(0.28 0.03 ${hue} / 0.55))` }}
      className={cn(TILE, 'flex flex-col items-center justify-center gap-1 text-[var(--color-muted)]')}
    >
      <span className="rounded-lg border border-white/20 px-2.5 py-1.5 text-2xl shadow-inner">🚗</span>
      <span className="max-w-full truncate px-2 text-[10px] tracking-wide uppercase">{SOURCE_NAME[source]}</span>
    </div>
  )
}

function PreviewImage({ make, model, year, label, source }: PreviewProps): ReactNode {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const { data } = useQuery(wikiImageQuery(make ?? '', model ?? '', year))
  const image = data?.image
  if (!image || failed) return <PlaceholderTile make={make} source={source} />
  const credit = [image.attribution?.author, image.attribution?.license].filter(Boolean).join(', ')

  return (
    <div className={TILE} title={credit || undefined}>
      <img
        src={image.url}
        alt={label}
        crossOrigin="anonymous"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover opacity-80"
      />
      <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">
        {t('uaAuctions.thumb.preview')}
      </span>
    </div>
  )
}

/** A stock photo of the lot's model, fetched only once the card nears the viewport (a page lists up to 25 lots). */
function ModelPreview(props: PreviewProps): ReactNode {
  if (!props.make && !props.model) return <PlaceholderTile make={null} source={props.source} />
  return (
    <LazySection fallback={<PlaceholderTile make={props.make} source={props.source} />}>
      <PreviewImage {...props} />
    </LazySection>
  )
}

/**
 * First photo of a Prozorro.Sale lot as a small fixed-ratio tile for list cards, with the photo count in a corner badge.
 * Without photos (or once the file failed) it shows the model's stock photo with a "model photo" badge, or, with no stock photo either, a placeholder tile (make logo, else a tinted tile).
 */
export default function UaAuctionThumb({
  docIds,
  label,
  href,
  make = null,
  model = null,
  year = null,
  source = 'setam'
}: Props): ReactNode {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const first = docIds?.[0]
  if (!first || failed) return <ModelPreview make={make} model={model} year={year} label={label} source={source} />

  const image = (
    <img
      src={prozorroDocumentUrl(first)}
      alt={t('uaAuctions.photo.alt', { label, n: 1 })}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  )

  return (
    <div className={TILE}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {image}
          <span className="sr-only">{t('field.opensNewTab')}</span>
        </a>
      ) : (
        image
      )}
      {docIds && docIds.length > 1 && (
        <span className="pointer-events-none absolute right-1 bottom-1 rounded bg-black/60 px-1.5 text-xs text-white">
          📷 {docIds.length}
        </span>
      )}
    </div>
  )
}
