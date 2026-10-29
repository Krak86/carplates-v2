import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { FUEL_LEAD } from '@/routes/read/articles'
import { FleetSection, MethodSection, MixSection, ModelsSection, YearsSection } from '@/routes/read/fuel/FuelSections'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function FuelRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readFuel')}
        lead={pick(FUEL_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'mix', label: t('read.sec.fuelMix') },
          { id: 'fleet', label: t('read.sec.fuelFleet') },
          { id: 'years', label: t('read.sec.fuelYears') },
          { id: 'models', label: t('read.sec.fuelModels') },
          { id: 'method', label: t('read.sec.fuelMethod') }
        ]}
      />

      <MixSection />
      <FleetSection />
      <YearsSection />
      <ModelsSection />
      <MethodSection />
    </div>
  )
}
