import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SectionHeader from '@/components/SectionHeader'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { vehiclePhotosQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'
import SectionSkeleton from '@/components/ui/SectionSkeleton'

const SWIPE_MIN_PX = 40

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Stock photos from Pixabay, keyed on brand/model/year — illustrative, not the
 * specific registered vehicle. Fetched only once expanded (`enabled: open`),
 * mirroring FieldInfoButton's on-demand pattern.
 */
export default function VehiclePhotos({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedPhotos = searchParams.get('section') === 'photos'
  const [open, setOpen] = useState(() => isSharedPhotos)
  const [index, setIndex] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const swipeRef = useRef<{ x: number; swiped: boolean } | null>(null)
  const hasQuery = Boolean(brand || model)
  const photos = useQuery({ ...vehiclePhotosQuery(brand ?? '', model ?? '', year), enabled: open && hasQuery })
  const images = photos.data?.images ?? []
  const current = images.length > 0 ? images[index % images.length] : undefined

  useEffect(() => {
    if (isSharedPhotos && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedPhotos])

  const step = (delta: number): void => setIndex(i => (i + delta + images.length) % images.length)

  const handleSwipeStart = (e: PointerEvent<HTMLDivElement>): void => {
    swipeRef.current = { x: e.clientX, swiped: false }
  }

  const handleSwipeEnd = (e: PointerEvent<HTMLDivElement>): void => {
    const start = swipeRef.current
    if (!start || images.length < 2) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) < SWIPE_MIN_PX) return
    start.swiped = true
    step(dx < 0 ? 1 : -1)
  }

  // A swipe ends on the photo's link — don't follow it.
  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>): void => {
    if (swipeRef.current?.swiped) e.preventDefault()
  }

  if (!hasQuery) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="🖼️"
        title={t('photos.title')}
        info={<SectionInfo section="photos" title={t('photos.title')} />}
        actions={<ShareButton section="photos" label={t('share.button', { section: t('photos.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('photos.show')}
        hideLabel={t('photos.hide')}
      />

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3">
            {photos.isPending && <SectionSkeleton />}
            {photos.isError && <p className="text-base text-[var(--color-muted)]">{t('photos.unavailable')}</p>}
            {photos.isSuccess && images.length === 0 && (
              <p className="text-base text-[var(--color-muted)]">{t('photos.none')}</p>
            )}

            {current && (
              <div>
                <div
                  onPointerDown={handleSwipeStart}
                  onPointerUp={handleSwipeEnd}
                  className="relative touch-pan-y overflow-hidden rounded-md border border-[var(--color-border)]"
                >
                  <a
                    href={current.pageURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    draggable={false}
                    onClick={handleLinkClick}
                  >
                    <img
                      src={current.webformatURL}
                      alt={t('photos.alt', { query: photos.data?.query ?? '' })}
                      className="aspect-video w-full object-cover"
                    />
                  </a>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label={t('photos.prev')}
                        onClick={() => step(-1)}
                        className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white hover:bg-black/60"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label={t('photos.next')}
                        onClick={() => step(1)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white hover:bg-black/60"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-sm text-[var(--color-muted)]">
                  <span>{t('photos.source')}</span>
                  {images.length > 1 && (
                    <span>
                      {index + 1} / {images.length}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
