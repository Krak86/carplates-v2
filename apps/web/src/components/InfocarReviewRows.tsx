import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { InfocarMatch } from '@carplates/shared'

import { infocarLinks, yearFilterLabel } from '@/components/ReviewLinks.helpers'

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
  const years = yearFilterLabel(match.yearUrl)
  const links = infocarLinks(match)
  if (match.yearUrl && years)
    links.unshift({ title: t('reviews.forYears', { years }), level: 'model', url: match.yearUrl })

  return (
    <li className="px-2 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-base">
        <span className="flex items-center gap-1.5 font-medium">
          <img src="/icons/infocar.png" alt="" width={20} height={20} className="size-5 rounded-sm" />
          {label}
        </span>
        {hasStats && (
          <span className="text-sm text-[var(--color-muted)]">
            {t('reviews.stats', { count: match.reviewCount, rating: match.avgRating?.toFixed(1) })}
          </span>
        )}
      </div>

      <ul className="mt-1 space-y-1">
        {links.map(link => (
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
