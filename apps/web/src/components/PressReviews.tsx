import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReviewsResponse } from '@carplates/shared'

import ExpandableList from '@/components/ExpandableList'
import LangBadge from '@/components/LangBadge'
import { BADGE_OF_EDITION, orderedEditions } from '@/components/PressReviews.helpers'

type Props = {
  reviews: ReviewsResponse['press']
  /** Name of the outlet for the footnote, e.g. `itc.ua`. */
  site: string
}

/**
 * One tech-press outlet's test drives of this car's model: the title in the UI language (else the first edition the
 * article has) opens the article; a chip per other language edition links to it. Links only — no article text is copied.
 */
export default function PressReviews({ reviews, site }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  if (!reviews.length) return null

  return (
    <div className="px-2 py-1.5">
      <ExpandableList
        className="space-y-2"
        items={reviews.map(review => {
          const [main, ...others] = orderedEditions(review, i18n.language)
          const entry = review.langs[main!]!

          return (
            <li key={review.url}>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block rounded-md px-1 py-1 transition-colors hover:bg-[var(--color-border)]/40"
              >
                <span className="flex items-start justify-between gap-2 text-base text-[var(--color-primary)]">
                  <span className="line-clamp-2 underline">{entry.title}</span>
                  <span aria-hidden>↗</span>
                  <span className="sr-only">{t('field.opensNewTab')}</span>
                </span>

                {entry.blurb && (
                  <span className="line-clamp-2 block text-sm text-[var(--color-muted)]">{entry.blurb}</span>
                )}
              </a>

              <p className="flex flex-wrap items-center gap-1.5 px-1 text-sm text-[var(--color-muted)]">
                {review.publishedAt && <span>{review.publishedAt.slice(0, 4)}</span>}
                {others.map(edition => (
                  <a
                    key={edition}
                    href={review.langs[edition]!.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    title={review.langs[edition]!.title}
                  >
                    <LangBadge lang={BADGE_OF_EDITION[edition]} />
                    <span className="sr-only">{t('field.opensNewTab')}</span>
                  </a>
                ))}
              </p>
            </li>
          )
        })}
      />

      <p className="mt-1 text-sm text-[var(--color-muted)]">{t('press.source', { site })}</p>
    </div>
  )
}
