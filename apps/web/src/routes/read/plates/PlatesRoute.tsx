import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { PLATES_LEAD } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'
import { AnatomySection, FormatsSection, RegionsSection } from '@/routes/read/plates/PlatesSections'

// Lazy-loaded (see App.tsx). Public, no sign-in. Static: reads only the shared plate tables, no API.
export default function PlatesRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-content space-y-4">
      <ArticleHeader
        title={t('nav.readPlates')}
        lead={pick(PLATES_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'anatomy', label: t('read.sec.anatomy') },
          { id: 'regions', label: t('read.sec.regions') },
          { id: 'formats', label: t('read.sec.formats') }
        ]}
      />

      <AnatomySection />
      <RegionsSection />
      <FormatsSection />
    </div>
  )
}
