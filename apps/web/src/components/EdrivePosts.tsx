import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReviewsResponse } from '@carplates/shared'

import ExpandableList from '@/components/ExpandableList'

type Props = {
  posts: ReviewsResponse['ownerPosts']
}

/**
 * e-drive.com.ua owner posts (repairs, service, accessories) filed under this car's generation, inside the combined
 * reviews section — the newest few, the rest behind "Show more". Links only — each title opens the post on e-drive.com.ua.
 */
export default function EdrivePosts({ posts }: Props): ReactNode {
  const { t } = useTranslation()
  if (!posts.length) return null

  return (
    <div className="px-2 py-1.5">
      <p className="text-base font-medium">{t('ownerPosts.title')}</p>

      <ExpandableList
        className="mt-1 space-y-2"
        items={posts.map(post => (
          <li key={post.postId}>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-start justify-between gap-2 text-base text-[var(--color-primary)]"
            >
              <span className="line-clamp-2 underline">{post.title}</span>
              <span aria-hidden>↗</span>
              <span className="sr-only">{t('field.opensNewTab')}</span>
            </a>

            <p className="text-sm text-[var(--color-muted)]">
              {[post.category, post.createdAt?.slice(0, 4)].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      />

      <p className="mt-1 text-sm text-[var(--color-muted)]">{t('ownerPosts.source')}</p>
    </div>
  )
}
