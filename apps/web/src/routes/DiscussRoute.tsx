import type { ReactNode } from 'react'
import { DiscussionEmbed } from 'disqus-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { useCopyFeedback } from '@/components/use-copy-feedback'
import Card from '@/components/ui/Card'

const DISQUS_SHORT_NAME = import.meta.env.VITE_DISQUS_SHORT_NAME ?? ''
const MAX_ABOUT_LENGTH = 40

// Lazy-loaded (see App.tsx).
export default function DiscussRoute(): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { copied, copy } = useCopyFeedback()
  // Fixed page, not per-vehicle — the page path alone is a stable Disqus thread identifier.
  const url = `${window.location.origin}/discuss`
  // `?about=` comes from ReportIssueLink; Disqus can't be prefilled, so offer the line to paste instead.
  const about = searchParams.get('about')?.trim().slice(0, MAX_ABOUT_LENGTH)

  return (
    <article className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">{t('discuss.heading')}</h1>

      {about && (
        <Card className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            {t('report.about')} <strong>{about}</strong>
          </p>

          <button
            type="button"
            onClick={() => copy(`${about}: `)}
            className="rounded-lg bg-[var(--color-primary)]/10 px-3 py-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
          >
            {copied ? t('report.copied') : t('report.copy')}
          </button>
        </Card>
      )}

      <Card>
        {DISQUS_SHORT_NAME ? (
          <DiscussionEmbed
            shortname={DISQUS_SHORT_NAME}
            config={{ url, identifier: url, title: t('discuss.heading') }}
          />
        ) : (
          <p className="text-sm text-[var(--color-muted)]">{t('discuss.unavailable')}</p>
        )}
      </Card>
    </article>
  )
}
