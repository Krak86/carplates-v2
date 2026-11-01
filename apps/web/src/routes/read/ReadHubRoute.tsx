import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import ArticleBanner from '@/routes/read/ArticleBanner'
import ArticleTags from '@/routes/read/ArticleTags'

import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { ARTICLES, UPCOMING } from '@/routes/read/articles'
import { articleTopics, filterArticles, pick } from '@/routes/read/helpers'

const TOPICS = articleTopics(ARTICLES)

const CHIP_CLASS = 'rounded-full border px-3 py-0.5 text-sm transition-colors hover:border-primary'

// Lazy-loaded (see App.tsx). Public, no sign-in. The search box and the topic chip live in the URL (`q`, `topic`).
export default function ReadHubRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const topic = params.get('topic') ?? ''
  const shown = filterArticles(ARTICLES, query, topic, i18n.language, article => t(article.titleKey))

  const handleParam = (key: 'q' | 'topic', value: string): void =>
    setParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true }
    )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <Card className="space-y-3">
        <div>
          <h1 className="mb-2 text-2xl font-bold">{t('read.hub.title')}</h1>
          <p className="text-muted">{t('read.hub.intro')}</p>
        </div>

        <input
          type="search"
          value={query}
          onChange={e => handleParam('q', e.target.value)}
          placeholder={t('read.hub.search')}
          aria-label={t('read.hub.search')}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('read.hub.topics')}>
          <button
            type="button"
            aria-pressed={topic === ''}
            onClick={() => handleParam('topic', '')}
            className={cn(CHIP_CLASS, topic === '' ? 'border-primary bg-primary/15 text-primary' : 'border-border')}
          >
            {t('read.hub.all')}
          </button>
          {TOPICS.map(tag => (
            <button
              key={tag.en}
              type="button"
              aria-pressed={topic === tag.en}
              onClick={() => handleParam('topic', topic === tag.en ? '' : tag.en)}
              className={cn(
                CHIP_CLASS,
                topic === tag.en ? 'border-primary bg-primary/15 text-primary' : 'border-border'
              )}
            >
              {pick(tag, i18n.language)}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted" role="status">
          {t('read.hub.count', { count: shown.length })}
        </p>
      </Card>

      {shown.length === 0 && (
        <Card>
          <p className="text-muted">{t('read.hub.empty')}</p>
        </Card>
      )}

      {/* Phones: one compact row per guide (thumbnail beside the text); wider screens: banner cards in a grid. */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map(article => (
          <Link key={article.path} to={article.path} viewTransition className="group block">
            <Card className="h-full overflow-hidden !p-0 transition duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary group-hover:shadow-lg max-sm:flex">
              <ArticleBanner article={article} className="hidden h-36 sm:flex" />
              <ArticleBanner article={article} compact className="w-24 shrink-0 self-stretch sm:hidden" />

              <div className="min-w-0 p-3 md:p-4">
                <p className="mb-1 text-xs font-medium tracking-wide text-primary uppercase">
                  <span aria-hidden>📖</span> {t('read.hub.badge')}
                </p>
                <h2 className="mb-1 text-lg leading-snug font-semibold">{t(article.titleKey)}</h2>
                <ArticleTags article={article} className="mb-1.5 max-sm:hidden" />
                <p className="line-clamp-3 text-sm text-muted sm:line-clamp-none">
                  {pick(article.lead, i18n.language)}
                </p>
                <span className="mt-2 inline-block text-sm text-primary">{t('read.hub.open')} →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {UPCOMING.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t('read.hub.soon')}</h2>
          <ul className="space-y-1.5 text-muted">
            {UPCOMING.map(item => (
              <li key={item.title.en}>
                <span aria-hidden>{item.icon}</span> {pick(item.title, i18n.language)}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
