import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

// Lazy-loaded (see App.tsx).
export default function AboutRoute(): ReactNode {
  const { t } = useTranslation()
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('about.heading')}</h1>
      <p className="text-[var(--color-muted)]">{t('about.body')}</p>
      <p className="text-[var(--color-muted)]">{t('about.vinBody')}</p>
    </article>
  )
}
