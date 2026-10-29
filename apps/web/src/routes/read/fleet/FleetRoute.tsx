import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { FLEET_LEAD } from '@/routes/read/articles'
import { AgeSection, ColorsSection, FuelSection } from '@/routes/read/fleet/FleetSections'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function FleetRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readFleet')}
        lead={pick(FLEET_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'colors', label: t('read.sec.colors') },
          { id: 'fuel', label: t('read.sec.fuel') },
          { id: 'age', label: t('read.sec.age') }
        ]}
      />

      <ColorsSection />
      <FuelSection />
      <AgeSection />
    </div>
  )
}
