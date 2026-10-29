import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { ELECTRIC_LEAD } from '@/routes/read/articles'
import {
  KindsSection,
  ModelsSection,
  PlugsSection,
  RegionsSection,
  YearsSection
} from '@/routes/read/electric/ElectricSections'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function ElectricRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readElectric')}
        lead={pick(ELECTRIC_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'kinds', label: t('read.sec.evKinds') },
          { id: 'years', label: t('read.sec.evYears') },
          { id: 'regions', label: t('read.sec.evRegions') },
          { id: 'models', label: t('read.sec.evModels') },
          { id: 'plugs', label: t('read.sec.evPlugs') }
        ]}
      />

      <KindsSection />
      <YearsSection />
      <RegionsSection />
      <ModelsSection />
      <PlugsSection />
    </div>
  )
}
