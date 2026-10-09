import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CommunityPost } from '@/lib/community'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  post: CommunityPost
}

/** One forum thread: title, optional thumbnail, score and replies, linking out to the thread. */
export default function CommunityPostCard({ post }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const date = new Date(post.createdAt).toLocaleDateString(toIntlLocale(i18n.language), {
    month: 'short',
    year: 'numeric'
  })

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group block space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-2.5 transition-colors hover:bg-[var(--color-surface)]"
    >
      <p className="line-clamp-4 text-sm font-medium break-words text-[var(--color-fg)] group-hover:text-[var(--color-primary)]">
        {post.title}
      </p>

      {post.thumb && (
        <img
          src={post.thumb}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="max-h-40 w-full rounded-md object-cover"
        />
      )}

      <p className="text-xs text-[var(--color-muted)]">
        {post.source} · {date}
      </p>

      <p className="text-xs text-[var(--color-muted)]">
        ▲ {post.score} · 💬 {post.replies} {t('social.replies')}
      </p>
    </a>
  )
}
