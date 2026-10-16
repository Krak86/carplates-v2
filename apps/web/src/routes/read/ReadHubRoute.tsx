import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { ARTICLES, UPCOMING } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function ReadHubRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-content space-y-4">
      <Card>
        <h1 className="mb-2 text-2xl font-bold">{t('read.hub.title')}</h1>
        <p className="text-muted">{t('read.hub.intro')}</p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {ARTICLES.map(article => (
          <Link key={article.path} to={article.path} viewTransition className="group block">
            <Card className="h-full transition-colors group-hover:border-primary">
              <h2 className="mb-1 text-lg font-semibold">
                <span aria-hidden>{article.icon}</span> {t(article.titleKey)}
              </h2>
              <p className="text-sm text-muted">{pick(article.lead, i18n.language)}</p>
              <span className="mt-2 inline-block text-sm text-primary">{t('read.hub.open')} →</span>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">{t('read.hub.soon')}</h2>
        <ul className="space-y-1.5 text-muted">
          {UPCOMING.map(topic => (
            <li key={topic.title.en}>
              <span aria-hidden>{topic.icon}</span> {pick(topic.title, i18n.language)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
