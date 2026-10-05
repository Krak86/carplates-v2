import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReviewsResponse } from '@carplates/shared'

import ExpandableList from '@/components/ExpandableList'

type Props = {
  reviews: ReviewsResponse['topgear']
}

/**
 * TopGear UK editorial reviews of this car's model, inside the combined reviews section — score out of 10 (when the
 * review has one), the review's title and its one-line blurb. Links only: each title opens the review on topgear.com.
 */
export default function TopgearReviews({ reviews }: Props): ReactNode {
  const { t } = useTranslation()
  if (!reviews.length) return null

  return (
    <div className="px-2 py-1.5">
      <ExpandableList
        className="space-y-2"
        items={reviews.map(review => (
          <li key={review.url}>
            <a
              href={review.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-start justify-between gap-2 text-base text-[var(--color-primary)]"
            >
              <span className="flex items-start gap-2">
                {review.rating !== null && (
                  <span
                    title={t('topgear.score', { score: review.rating, max: review.bestRating ?? 10 })}
                    className="shrink-0 rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-sm font-semibold text-[var(--color-fg)] tabular-nums no-underline"
                  >
                    {review.rating}/{review.bestRating ?? 10}
                  </span>
                )}
                <span className="line-clamp-2 underline">{review.title}</span>
              </span>
              <span aria-hidden>↗</span>
              <span className="sr-only">{t('field.opensNewTab')}</span>
            </a>

            {review.blurb && <p className="line-clamp-2 text-sm text-[var(--color-muted)]">{review.blurb}</p>}
          </li>
        ))}
      />

      <p className="mt-1 text-sm text-[var(--color-muted)]">{t('topgear.source')}</p>
    </div>
  )
}
