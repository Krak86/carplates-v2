import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import SectionInfo from '@/components/SectionInfo'
import { formatDuration } from '@/components/VideoReviews.helpers'
import YouTubeModal from '@/components/YouTubeModal'
import { cn } from '@/lib/cn'
import { reviewsQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Collapsed "Video reviews" section: infocar.ua's YouTube videos for this make/model. Shares the `/api/reviews` query
 * with `ReviewLinks`; renders nothing when there are none. A thumbnail opens the player in a modal — the iframe is
 * only created then (privacy: no YouTube request until the visitor asks for one).
 */
export default function VideoReviews({ brand, model, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const { data } = useQuery({ ...reviewsQuery(brand ?? '', model ?? '', year), enabled: !!brand })
  const videos = data?.videos ?? []
  if (!videos.length) return null
  const current = videos.find(v => v.youtubeId === playing)

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <div className="flex items-center justify-between text-base">
        <span className="flex items-center gap-1.5 text-base font-semibold">
          {t('videos.title')}
          <SectionInfo section="videos" title={t('videos.title')} />
        </span>

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-[var(--color-primary)]"
        >
          <span aria-hidden className="no-underline">
            🎬
          </span>
          <span className="underline group-hover:no-underline">{open ? t('videos.hide') : t('videos.show')}</span>
          <span
            aria-hidden
            className={cn('inline-block no-underline transition-transform duration-200', open && 'rotate-180')}
          >
            ▾
          </span>
        </button>
      </div>

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {videos.map(video => (
              <li key={video.youtubeId} className="w-56 shrink-0">
                <button
                  type="button"
                  onClick={() => setPlaying(video.youtubeId)}
                  aria-label={t('videos.play', { title: video.title })}
                  className="relative block aspect-video w-full overflow-hidden rounded-md bg-[var(--color-border)]"
                >
                  {video.thumbUrl && (
                    <img src={video.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />
                  )}
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center text-3xl text-white">
                    ▶
                  </span>
                  {video.durationS !== null && (
                    <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                      {formatDuration(video.durationS)}
                    </span>
                  )}
                </button>

                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  title={video.title}
                  className="mt-1 line-clamp-2 text-sm text-[var(--color-primary)] underline hover:no-underline"
                >
                  {video.title}
                </a>
              </li>
            ))}
          </ul>

          <p className="text-sm text-[var(--color-muted)]">{t('videos.source')}</p>
        </div>
      </div>

      {current && (
        <YouTubeModal
          youtubeId={current.youtubeId}
          title={t('videos.title')}
          description={current.title}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  )
}
