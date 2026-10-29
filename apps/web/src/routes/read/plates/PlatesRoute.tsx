import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { PLATES_LEAD } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'
import { ColorsSection, HistorySection, ServicesSection } from '@/routes/read/plates/PlatesKindsSections'
import { LegacySection, OrderSection, SpecialSection } from '@/routes/read/plates/PlatesExtraSections'
import { SearchSection } from '@/routes/read/plates/PlatesSearchSection'
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
          { id: 'formats', label: t('read.sec.formats') },
          { id: 'colors', label: t('read.sec.plateColors') },
          { id: 'services', label: t('read.sec.services') },
          { id: 'history', label: t('read.sec.history') },
          { id: 'legacy', label: t('read.sec.legacy') },
          { id: 'special', label: t('read.sec.special') },
          { id: 'order', label: t('read.sec.order') },
          { id: 'search', label: t('read.sec.plateSearch') }
        ]}
      />

      <AnatomySection />
      <RegionsSection />
      <FormatsSection />
      <ColorsSection />
      <ServicesSection />
      <HistorySection />
      <LegacySection />
      <SpecialSection />
      <OrderSection />
      <SearchSection />
    </div>
  )
}
