import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import BrandChannelVideos from '@/components/BrandChannelVideos'
import SectionHeader from '@/components/SectionHeader'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import VideoStrip from '@/components/VideoStrip'
import type { StripVideo } from '@/components/VideoStrip'
import { preferLanguage } from '@/components/VideoReviews.helpers'
import { cn } from '@/lib/cn'
import { reviewsQuery, socialQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "Videos" section next to the text `ReviewLinks` one: infocar.ua's videos for this make/model, then the latest
 * uploads of the make's (and its parent group's) official YouTube channel. Same persisted catalog query (`reviewsQuery`,
 * so opening both sections costs one request); both are fetched only once the section is opened. Hidden without a make
 * to go on.
 */
export default function VideoReviews({ brand, model, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedVideos = searchParams.get('section') === 'videos'
  const [open, setOpen] = useState(() => isSharedVideos)
  const sectionRef = useRef<HTMLDivElement>(null)
  const catalog = useQuery({ ...reviewsQuery(brand ?? '', model ?? '', year), enabled: !!brand && open })
  const social = useQuery({ ...socialQuery(brand ?? ''), enabled: !!brand && open })
  const isSearched = catalog.data?.videos.some(v => v.source === 'youtube') ?? false
  const modelVideos = preferLanguage(catalog.data?.videos ?? [], i18n.language).map((v): StripVideo => ({
    youtubeId: v.youtubeId,
    title: v.title,
    url: v.url,
    thumbUrl: v.thumbUrl,
    durationS: v.durationS
  }))
  // The channel feed is a bonus: if it fails, the section just shows the model videos.
  const channels = social.data?.channels ?? []
  const hasVideos = modelVideos.length > 0 || channels.length > 0

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
            {(catalog.isPending || social.isPending) && (
              <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>
            )}
            {catalog.isError && <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>}
            {catalog.isSuccess && !social.isPending && !hasVideos && (
              <p className="text-base text-[var(--color-muted)]">{t('videos.none')}</p>
            )}

            <div className="flex flex-col gap-4">
              {modelVideos.length > 0 && (
                <div>
                  {channels.length > 0 && <h3 className="mb-2 text-sm font-medium">{t('videos.model')}</h3>}
                  {isSearched && <p className="mb-2 text-sm text-[var(--color-muted)]">{t('videos.searched')}</p>}
                  <VideoStrip videos={modelVideos} />
                </div>
              )}

              <BrandChannelVideos channels={channels} />
            </div>

            {hasVideos && <p className="text-sm text-[var(--color-muted)]">{t('videos.source')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
