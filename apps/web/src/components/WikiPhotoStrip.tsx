import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { WikiPhoto } from '@carplates/shared'

import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import { PHOTO_PREVIEW_COUNT } from '@/components/ua-auctions/helpers'

type Props = {
  /** Photos under the hero, originals without the colour filter; the caller drops the one the hero shows. */
  photos: readonly WikiPhoto[]
  /** Names the photos for screen readers, e.g. the vehicle. */
  label: string
}

/** Commons file description page (the CC BY-SA credit links there). */
export function commonsPageUrl(title: string): string {
  return `https://commons.wikimedia.org/wiki/${encodeURI(title.replace(/ /g, '_'))}`
}

/**
 * More photos of the model under the hero (docs/wiki-recolor-plan.md, step 8): a lazy thumbnail row in a fixed-ratio box,
 * "show more" for the rest, a credit under each, zoom on click. They show other cars of the model, so the strip says so.
 * A photo that fails to load disappears.
 */
export default function WikiPhotoStrip({ photos, label }: Props): ReactNode {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const [zoomed, setZoomed] = useState<string | null>(null)
  const usable = photos.filter(photo => !failed.has(photo.url))
  if (usable.length === 0) return null

  const shown = showAll ? usable : usable.slice(0, PHOTO_PREVIEW_COUNT)
  const hiddenCount = usable.length - shown.length
  const fail = (url: string): void => setFailed(prev => new Set(prev).add(url))
  const zoomedIndex = usable.findIndex(photo => photo.url === zoomed)
  const step = (delta: number): void => {
    const next = usable[(Math.max(zoomedIndex, 0) + delta + usable.length) % usable.length]
    if (next) setZoomed(next.url)
  }

  return (
    <section className="mt-3" aria-label={t('wiki.photoStrip')}>
      <p className="mb-1.5 text-xs text-[var(--color-muted)]">{t('wiki.photoStripNote')}</p>
      <ul className="grid grid-cols-2 gap-x-1.5 gap-y-2 sm:grid-cols-4">
        {shown.map((photo, i) => {
          const credit = [photo.attribution?.author, photo.attribution?.license].filter(Boolean).join(', ')
          return (
            <li key={photo.url} className="min-w-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[var(--color-border)]/30">
                <button
                  type="button"
                  onClick={() => setZoomed(photo.url)}
                  aria-label={t('wiki.photoOpen', { n: i + 1, total: usable.length })}
                  className="block h-full w-full cursor-zoom-in"
                >
                  <img
                    src={photo.url}
                    alt={t('wiki.photoAlt', { label, n: i + 1 })}
                    loading="lazy"
                    decoding="async"
                    onError={() => fail(photo.url)}
                    className="h-full w-full object-cover"
                  />
                </button>
              </div>
              <a
                href={commonsPageUrl(photo.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block truncate text-[10px] text-[var(--color-muted)] underline"
              >
                {credit || t('wiki.viaCommons')}
              </a>
            </li>
          )
        })}
      </ul>

      {(hiddenCount > 0 || showAll) && usable.length > PHOTO_PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mt-1.5 text-sm text-[var(--color-primary)] underline"
        >
          {showAll ? t('wiki.photoLess') : t('wiki.photoMore', { count: hiddenCount })}
        </button>
      )}

      {zoomed && zoomedIndex >= 0 && (
        <PhotoZoomDialog
          url={zoomed}
          candidates={[]}
          active={null}
          onClose={() => setZoomed(null)}
          onPrev={usable.length > 1 ? () => step(-1) : undefined}
          onNext={usable.length > 1 ? () => step(1) : undefined}
          position={{ n: zoomedIndex + 1, total: usable.length }}
        />
      )}
    </section>
  )
}
