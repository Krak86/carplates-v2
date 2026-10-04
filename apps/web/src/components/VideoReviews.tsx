import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import InfocarVideos from '@/components/InfocarVideos'
import SectionHeader from '@/components/SectionHeader'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { reviewsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "Video reviews" section next to the text `ReviewLinks` one. Same persisted catalog query (`reviewsQuery`,
 * so opening both costs one request); fetched only once the section is opened. Hidden without a make to go on.
 */
export default function VideoReviews({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedVideos = searchParams.get('section') === 'videos'
  const [open, setOpen] = useState(() => isSharedVideos)
  const sectionRef = useRef<HTMLDivElement>(null)
  const catalog = useQuery({ ...reviewsQuery(brand ?? '', model ?? '', year), enabled: !!brand && open })
  const videos = catalog.data?.videos ?? []

  useEffect(() => {
    if (isSharedVideos && brand && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedVideos, brand])

  if (!brand) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="🎬"
        title={t('videos.title')}
        info={<SectionInfo section="videos" title={t('videos.title')} />}
        actions={<ShareButton section="videos" label={t('share.button', { section: t('videos.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('videos.show')}
        hideLabel={t('videos.hide')}
      />

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3">
            {catalog.isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
            {catalog.isError && <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>}
            {catalog.isSuccess && videos.length === 0 && (
              <p className="text-base text-[var(--color-muted)]">{t('videos.none')}</p>
            )}

            <InfocarVideos videos={videos} />
          </div>
        </div>
      </div>
    </div>
  )
}
