import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import ArticleBanner from '@/routes/read/ArticleBanner'
import ArticleTags from '@/routes/read/ArticleTags'

import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { ARTICLES, UPCOMING } from '@/routes/read/articles'
import { articleTopics, filterArticles, pick } from '@/routes/read/helpers'
import { topicChipStyle } from '@/routes/read/topic-colors'

const TOPICS = articleTopics(ARTICLES)

const CHIP_CLASS = 'rounded-full border px-3 py-0.5 text-sm transition-colors hover:border-primary'

// Lazy-loaded (see App.tsx). Public, no sign-in. The search box and the topic chip live in the URL (`q`, `topic`).
export default function ReadHubRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [topicsOpen, setTopicsOpen] = useState(false)
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

        {/* Phones show two chip rows (26px chip + 6px gap) until expanded; sm+ always shows all. */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 overflow-hidden sm:max-h-none',
            !topicsOpen && 'max-h-14.5'
          )}
          role="group"
          aria-label={t('read.hub.topics')}
        >
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
              style={topicChipStyle(tag.en)}
              className={cn(
                CHIP_CLASS,
                'border-(--chip)/45 text-(--chip) hover:border-(--chip)',
                topic === tag.en ? 'border-(--chip) bg-(--chip)/25 font-semibold' : 'bg-(--chip)/10'
              )}
            >
              {pick(tag, i18n.language)}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-expanded={topicsOpen}
          onClick={() => setTopicsOpen(open => !open)}
          className="text-sm text-primary hover:underline sm:hidden"
        >
          {topicsOpen ? t('read.hub.showLess') : t('read.hub.showAll')}
        </button>

        <p className="text-xs text-muted" role="status">
          {t('read.hub.count', { count: shown.length })}
        </p>
      </Card>

      {shown.length === 0 && (
        <Card>
          <p className="text-muted">{t('read.hub.empty')}</p>
        </Card>
      )}

      {/* Blog-style tiles: round cover + label, big title, lead excerpt. The first tile spans two columns on desktop. */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {shown.map((article, index) => {
          const featured = index === 0
          return (
            <Link
              key={article.path}
              to={article.path}
              viewTransition
              className={cn('group block', featured && 'lg:col-span-2')}
            >
              <Card className="flex h-full flex-col gap-3 p-4 transition duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary group-hover:shadow-lg md:p-6">
                {/* Wide rectangular cover; the featured tile gets a more panoramic crop. */}
                <ArticleBanner
                  article={article}
                  className={cn('w-full rounded-xl', featured ? 'aspect-video lg:aspect-[21/9]' : 'aspect-video')}
                />

                <p className="text-xs text-muted">
                  <span className="font-semibold tracking-wide text-primary uppercase">
                    {article.tags[0] ? pick(article.tags[0], i18n.language) : t('read.hub.badge')}
                  </span>
                  {' · '}
                  <span aria-hidden>📖</span> {t('read.hub.badge')}
                </p>

                <h2 className={cn('leading-tight font-bold', featured ? 'text-2xl md:text-3xl' : 'text-xl')}>
                  {t(article.titleKey)}
                </h2>

                <p className={cn('text-muted', featured ? 'line-clamp-4' : 'line-clamp-5')}>
                  {pick(article.lead, i18n.language)}
                </p>

                <ArticleTags article={article} className="mt-auto pt-1" />
              </Card>
            </Link>
          )
        })}
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
