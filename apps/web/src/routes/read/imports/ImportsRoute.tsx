import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { IMPORTS_LEAD } from '@/routes/read/articles'
import {
  ChecksSection,
  CountriesSection,
  KindsSection,
  ModelsSection,
  YearsSection
} from '@/routes/read/imports/ImportsSections'
import {
  AppSection,
  HistorySection,
  MarketSection,
  SourcesSection,
  WhySection
} from '@/routes/read/imports/ImportsStorySections'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function ImportsRoute(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readImports')}
        lead={pick(IMPORTS_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'kinds', label: t('read.sec.impKinds') },
          { id: 'years', label: t('read.sec.impYears') },
          { id: 'models', label: t('read.sec.impModels') },
          { id: 'countries', label: t('read.sec.impCountries') },
          { id: 'history', label: t('read.sec.impHistory') },
          { id: 'why', label: t('read.sec.impWhy') },
          { id: 'market', label: t('read.sec.impMarket') },
          { id: 'checks', label: t('read.sec.impChecks') },
          { id: 'app', label: t('read.sec.impApp') }
        ]}
      />

      <KindsSection />
      <YearsSection />
      <ModelsSection />
      <CountriesSection />
      <HistorySection />
      <WhySection />
      <MarketSection />
      <ChecksSection />
      <AppSection />
      <SourcesSection />
    </div>
  )
}
