import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { RELATED_PAGES, STATS_PAGE_ICONS, relatedTarget } from '@/lib/related-pages'
import type { StatsPage } from '@/lib/related-pages'

type Props = {
  page: StatsPage
}

/** Cross links between the statistics pages, each with the one question the other page answers. */
export default function RelatedPages({ page }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <Card className="mb-6">
      <h2 className="mb-3 text-base font-semibold">{t('related.title')}</h2>

      <ul className="grid gap-3 md:grid-cols-2">
        {RELATED_PAGES[page].map(to => (
          <li key={to}>
            <Link
              viewTransition
              to={relatedTarget(page, to)}
              className="flex h-full gap-2 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg)]/50 p-3 text-sm transition-colors duration-200 hover:border-[var(--color-border)] hover:bg-[var(--color-bg)]"
            >
              <span aria-hidden className="text-lg">
                {STATS_PAGE_ICONS[to]}
              </span>

              <span>
                <span className="block font-medium text-[var(--color-primary)]">{t(`related.page.${to}`)}</span>
                <span className="text-[var(--color-muted)]">{t(`related.${page}.${to}`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
