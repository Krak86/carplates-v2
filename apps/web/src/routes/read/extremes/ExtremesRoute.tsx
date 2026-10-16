import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { EXTREMES_LEAD } from '@/routes/read/articles'
import { ReadSection, SpecSection, WeightSection } from '@/routes/read/extremes/ExtremesSections'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function ExtremesRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-content space-y-4">
      <ArticleHeader
        title={t('nav.readExtremes')}
        lead={pick(EXTREMES_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'weight', label: t('read.sec.extremesWeight') },
          { id: 'spec', label: t('read.sec.extremesSpec') },
          { id: 'read', label: t('read.sec.extremesRead') }
        ]}
      />

      <WeightSection />
      <SpecSection />
      <ReadSection />
    </div>
  )
}
