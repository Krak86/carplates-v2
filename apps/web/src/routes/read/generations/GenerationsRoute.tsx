import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { GENERATIONS_LEAD } from '@/routes/read/articles'
import { MethodSection, ModelsSection, WhySection } from '@/routes/read/generations/GenerationsSections'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in. Sizes per generation come from GET /api/generations/growth.
export default function GenerationsRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readGenerations')}
        lead={pick(GENERATIONS_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'why', label: t('read.sec.why') },
          { id: 'models', label: t('read.sec.growth') },
          { id: 'method', label: t('read.sec.method') }
        ]}
      />

      <WhySection />
      <ModelsSection />
      <MethodSection />
    </div>
  )
}
