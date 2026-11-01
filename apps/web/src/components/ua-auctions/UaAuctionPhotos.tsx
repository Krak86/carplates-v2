import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { prozorroDocumentUrl } from '@carplates/shared'

import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import { PHOTO_FULL_WIDTH, PHOTO_PREVIEW_COUNT, PHOTO_THUMB_WIDTH } from '@/components/ua-auctions/helpers'
import { auctionPhotoUrl } from '@/lib/api'

type Props = {
  /** Prozorro document ids (32 hex), one per photo file. */
  docIds: readonly string[]
  /** Names the photos for screen readers, e.g. the vehicle. */
  label: string
}

/** `thumb` = our resized WebP, `original` = the full file from Prozorro (the resizer failed), `hidden` = both failed. */
type Stage = 'thumb' | 'original' | 'hidden'

/**
 * Photos of a Prozorro.Sale lot: a first row of lazy thumbnails from the API resizer (320 px, fixed aspect ratio so the layout
 * does not jump), a "show more" button for the rest. A thumbnail that fails falls back to the original file, and if that fails
 * too it disappears. Click opens the 1600 px version in the zoom dialog; the small arrow opens the original file.
 */
export default function UaAuctionPhotos({ docIds, label }: Props): ReactNode {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [stages, setStages] = useState<Readonly<Record<string, Stage>>>({})
  const [zoomed, setZoomed] = useState<string | null>(null)
  if (docIds.length === 0) return null

  const shown = showAll ? docIds : docIds.slice(0, PHOTO_PREVIEW_COUNT)
  const hiddenCount = docIds.length - shown.length
  const fail = (docId: string): void =>
    setStages(prev => ({ ...prev, [docId]: (prev[docId] ?? 'thumb') === 'thumb' ? 'original' : 'hidden' }))

  return (
    <div className="mt-2">
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {shown.map((docId, i) => {
          const stage = stages[docId] ?? 'thumb'
          if (stage === 'hidden') return null
          return (
            <li key={docId} className="relative aspect-[4/3] overflow-hidden rounded-md bg-[var(--color-border)]/30">
              <button
                type="button"
                onClick={() => setZoomed(docId)}
                aria-label={t('uaAuctions.photo.open', { n: i + 1, total: docIds.length })}
                className="block h-full w-full cursor-zoom-in"
              >
                <img
                  src={stage === 'thumb' ? auctionPhotoUrl(docId, PHOTO_THUMB_WIDTH) : prozorroDocumentUrl(docId)}
                  alt={t('uaAuctions.photo.alt', { label, n: i + 1 })}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => fail(docId)}
                  className="h-full w-full object-cover"
                />
              </button>
              <a
                href={prozorroDocumentUrl(docId)}
                target="_blank"
                rel="noopener noreferrer"
                title={t('uaAuctions.photo.original')}
                className="absolute right-1 bottom-1 rounded bg-black/60 px-1.5 text-xs text-white"
              >
                ↗<span className="sr-only">{t('uaAuctions.photo.original')}</span>
              </a>
            </li>
          )
        })}
      </ul>

      {(hiddenCount > 0 || showAll) && docIds.length > PHOTO_PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mt-1.5 text-sm text-[var(--color-primary)] underline"
        >
          {showAll ? t('uaAuctions.photo.less') : t('uaAuctions.photo.more', { count: hiddenCount })}
        </button>
      )}

      {zoomed && (
        <PhotoZoomDialog
          url={auctionPhotoUrl(zoomed, PHOTO_FULL_WIDTH)}
          candidates={[]}
          active={null}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  )
}
