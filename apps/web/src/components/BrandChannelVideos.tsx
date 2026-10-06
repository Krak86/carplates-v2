import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SocialResponse } from '@carplates/shared'

import { youtubeIdOf } from '@/components/VideoReviews.helpers'
import VideoStrip from '@/components/VideoStrip'
import type { StripVideo } from '@/components/VideoStrip'
import { cn } from '@/lib/cn'

type Props = {
  /** Make channel first, then its parent group's (already limited to channels that have videos). */
  channels: SocialResponse['channels']
}

/** The latest uploads of the make's official YouTube channel, switchable to its parent group's channel when it has one. */
export default function BrandChannelVideos({ channels }: Props): ReactNode {
  const { t } = useTranslation()
  const [pickedId, setPickedId] = useState<string | null>(null)
  // A stale pick (another brand's channel after navigating) falls back to the first channel.
  const channel = channels.find(c => c.id === pickedId) ?? channels[0]
  if (!channel) return null

  const videos = channel.posts.flatMap((post): StripVideo[] => {
    const youtubeId = youtubeIdOf(post.url)
    return youtubeId ? [{ youtubeId, title: post.title, url: post.url, thumbUrl: post.imageUrl, durationS: null }] : []
  })

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">{t('videos.brand')}</h3>

        {channels.length > 1 && (
          <div role="group" aria-label={t('videos.channelFilter')} className="flex gap-1">
            {channels.map(c => (
              <button
                key={c.id}
                type="button"
                aria-pressed={c.id === channel.id}
                onClick={() => setPickedId(c.id)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs',
                  c.id === channel.id
                    ? 'border-[var(--color-fg)] bg-[var(--color-surface)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface)]'
                )}
              >
                {c.kind === 'make' ? t('videos.channelMake') : t('videos.channelGroup')}
              </button>
            ))}
          </div>
        )}

        <a
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-sm text-[var(--color-primary)] underline hover:no-underline"
        >
          {channel.name} ↗
        </a>
      </div>

      <VideoStrip videos={videos} />
    </div>
  )
}
