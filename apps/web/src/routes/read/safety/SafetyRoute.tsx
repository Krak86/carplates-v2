import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { SAFETY_LEAD } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'
import {
  FleetSection,
  LimitsSection,
  ModelsSection,
  ProgrammesSection,
  YearsSection
} from '@/routes/read/safety/SafetySections'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function SafetyRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-content space-y-4">
      <ArticleHeader
        title={t('nav.readSafety')}
        lead={pick(SAFETY_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'programmes', label: t('read.sec.safProgrammes') },
          { id: 'fleet', label: t('read.sec.safFleet') },
          { id: 'years', label: t('read.sec.safYears') },
          { id: 'models', label: t('read.sec.safModels') },
          { id: 'limits', label: t('read.sec.safLimits') }
        ]}
      />

      <ProgrammesSection />
      <FleetSection />
      <YearsSection />
      <ModelsSection />
      <LimitsSection />
    </div>
  )
}
