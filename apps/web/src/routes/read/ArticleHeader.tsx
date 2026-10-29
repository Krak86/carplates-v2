import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { useCopyFeedback } from '@/components/use-copy-feedback'
import Card from '@/components/ui/Card'
import ArticleBanner from '@/routes/read/ArticleBanner'
import ArticleTags from '@/routes/read/ArticleTags'
import { ARTICLES } from '@/routes/read/articles'
import { READ_PATH } from '@/routes/read/links'

type Props = {
  title: string
  lead: string
  backLabel: string
  /** In-page jump links (`#id`). */
  jumps: ReadonlyArray<{ id: string; label: string }>
}

/** Banner, title, tags, share link, lead and jump chips shared by every /read article. */
export default function ArticleHeader({ title, lead, backLabel, jumps }: Props): ReactNode {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { copied, copy } = useCopyFeedback()
  const article = ARTICLES.find(a => a.path === pathname)

  const handleShare = (): void => copy(`${window.location.origin}${pathname}`)

  return (
    <Card className="mb-4 overflow-hidden !p-0">
      {article && <ArticleBanner article={article} variant="header" className="h-36 md:h-56" />}

      <div className="p-3 md:p-4">
        <Link to={READ_PATH} viewTransition className="mb-2 inline-block text-sm text-primary">
          ← {backLabel}
        </Link>

        <h1 className="mb-1 text-2xl font-bold">{title}</h1>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          {article && <ArticleTags article={article} />}

          <button
            type="button"
            title={t('read.share')}
            aria-label={t('read.share')}
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-primary hover:bg-(--color-bg)"
          >
            <span aria-hidden>{copied ? '✅' : '🔗'}</span>
            <span aria-live="polite">{copied ? t('share.copied') : t('read.share')}</span>
          </button>
        </div>

        <p className="text-muted">{lead}</p>

        <nav aria-label={title} className="mt-3 flex flex-wrap gap-2">
          {jumps.map(jump => (
            <a
              key={jump.id}
              href={`#${jump.id}`}
              className="rounded-full border border-border px-3 py-1 text-sm hover:bg-(--color-bg)"
            >
              {jump.label}
            </a>
          ))}
        </nav>
      </div>
    </Card>
  )
}
