import type { ReactNode } from 'react'
import { DiscussionEmbed } from 'disqus-react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

const DISQUS_SHORT_NAME = import.meta.env.VITE_DISQUS_SHORT_NAME ?? ''

// Lazy-loaded (see App.tsx).
export default function DiscussRoute(): ReactNode {
  const { t } = useTranslation()
  // Fixed page, not per-vehicle — the page path alone is a stable Disqus thread identifier.
  const url = `${window.location.origin}/discuss`

  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('discuss.heading')}</h1>

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
