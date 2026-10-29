import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { VIN_LEAD } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'
import { AppSection, ErrorsSection, HistorySection, LegacySection } from '@/routes/read/vin/VinExtraSections'
import { AnatomySection, WhereSection, YearsSection } from '@/routes/read/vin/VinSections'

// Lazy-loaded (see App.tsx). Public, no sign-in. Static: reads only the shared WMI table, no API.
export default function VinRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readVin')}
        lead={pick(VIN_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'anatomy', label: t('read.sec.vinAnatomy') },
          { id: 'years', label: t('read.sec.vinYears') },
          { id: 'history', label: t('read.sec.vinHistory') },
          { id: 'where', label: t('read.sec.vinWhere') },
          { id: 'legacy', label: t('read.sec.vinLegacy') },
          { id: 'errors', label: t('read.sec.vinErrors') },
          { id: 'app', label: t('read.sec.vinApp') }
        ]}
      />

      <AnatomySection />
      <YearsSection />
      <HistorySection />
      <WhereSection />
      <LegacySection />
      <ErrorsSection />
      <AppSection />
    </div>
  )
}
