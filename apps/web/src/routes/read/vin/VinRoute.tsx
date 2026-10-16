import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { VIN_LEAD } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'
import { AnatomySection, WhereSection, YearsSection } from '@/routes/read/vin/VinSections'

// Lazy-loaded (see App.tsx). Public, no sign-in. Static: reads only the shared WMI table, no API.
export default function VinRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-content space-y-4">
      <ArticleHeader
        title={t('nav.readVin')}
        lead={pick(VIN_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'anatomy', label: t('read.sec.vinAnatomy') },
          { id: 'years', label: t('read.sec.vinYears') },
          { id: 'where', label: t('read.sec.vinWhere') }
        ]}
      />

      <AnatomySection />
      <YearsSection />
      <WhereSection />
    </div>
  )
}
