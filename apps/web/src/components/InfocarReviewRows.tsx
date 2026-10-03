import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { InfocarMatch } from '@carplates/shared'

import { infocarLinks } from '@/components/ReviewLinks.helpers'

type Props = {
  label: string
  brand: string
  match: InfocarMatch
}

/** One infocar tree (test drives or owner reviews): the catalog link(s) for this car, plus review count/rating. */
export default function InfocarReviewRows({ label, brand, match }: Props): ReactNode {
  const { t } = useTranslation()
  const name = match.modelName ?? ''
  const hasStats = match.level !== 'brand' && match.reviewCount !== null && match.avgRating !== null

  return (
    <li className="px-2 py-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-base">
        <span className="font-medium">{label}</span>
        {hasStats && (
          <span className="text-sm text-[var(--color-muted)]">
            {t('reviews.stats', { count: match.reviewCount, rating: match.avgRating?.toFixed(1) })}
          </span>
        )}
      </div>

      <ul className="mt-1 space-y-1">
        {infocarLinks(match).map(link => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-base text-[var(--color-primary)] transition-colors hover:bg-[var(--color-border)]/40"
            >
              <span className="underline">
                {link.title ??
                  (link.level === 'model'
                    ? t('reviews.allVersions', { name })
                    : t('reviews.allModels', { name: brand }))}
              </span>
              <span aria-hidden>↗</span>
              <span className="sr-only">{t('field.opensNewTab')}</span>
            </a>
          </li>
        ))}
      </ul>
    </li>
  )
}
