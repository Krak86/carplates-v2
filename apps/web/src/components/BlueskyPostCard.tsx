import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import type { BlueskyPost } from '@/lib/bluesky'

type Props = {
  post: BlueskyPost
  decorative?: boolean
}

/** One Bluesky post: author, date and the (clamped) text, linking out to the post. */
export default function BlueskyPostCard({ post, decorative = false }: Props): ReactNode {
  const { i18n } = useTranslation()
  const [avatarFailed, setAvatarFailed] = useState(false)
  const date = new Date(post.createdAt).toLocaleDateString(toIntlLocale(i18n.language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      tabIndex={decorative ? -1 : undefined}
      className="group block space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-2.5 transition-colors hover:bg-[var(--color-surface)]"
    >
      <div className="flex items-center gap-2">
        {post.avatar && !avatarFailed && (
          <img
            src={post.avatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
            className="size-6 shrink-0 rounded-full object-cover"
          />
        )}

        <p className="min-w-0 truncate text-xs font-medium text-[var(--color-fg)]">{post.displayName}</p>
      </div>

      <p className="line-clamp-5 text-sm break-words text-[var(--color-fg)] group-hover:text-[var(--color-primary)]">
        {post.text}
      </p>

      {post.images.length > 0 && (
        <div className={cn('grid gap-1', post.images.length > 1 && 'grid-cols-2')}>
          {post.images.slice(0, 4).map(img => (
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-h-40 w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        @{post.handle} · {date}
      </p>
    </a>
  )
}
