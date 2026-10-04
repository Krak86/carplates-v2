import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReviewsResponse } from '@carplates/shared'

import { formatDuration } from '@/components/VideoReviews.helpers'
import YouTubeModal from '@/components/YouTubeModal'

type Props = {
  videos: ReviewsResponse['videos']
}

/**
 * infocar.ua's YouTube videos for this make/model, the body of the `VideoReviews` section. A thumbnail opens the
 * player in a modal — the iframe is only created then (privacy: no YouTube request until the visitor asks for one).
 */
export default function InfocarVideos({ videos }: Props): ReactNode {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState<string | null>(null)
  if (!videos.length) return null
  const current = videos.find(v => v.youtubeId === playing)

  return (
    <div>
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {videos.map(video => (
          <li key={video.youtubeId} className="w-56 shrink-0">
            <button
              type="button"
              onClick={() => setPlaying(video.youtubeId)}
              aria-label={t('videos.play', { title: video.title })}
              className="relative block aspect-video w-full overflow-hidden rounded-md bg-[var(--color-border)]"
            >
              {video.thumbUrl && <img src={video.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />}
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
