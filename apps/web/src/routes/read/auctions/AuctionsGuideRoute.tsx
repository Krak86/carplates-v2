import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { AUCTIONS_LEAD } from '@/routes/read/articles'
import {
  CheckSection,
  HistorySection,
  LiveSection,
  LotsSection,
  SourcesSection,
  TakeSection,
  WorldSection
} from '@/routes/read/auctions/AuctionsGuideSections'
import { SECTIONS } from '@/routes/read/auctions/content'
import { pick } from '@/routes/read/helpers'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function AuctionsGuideRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readAuctions')}
        lead={pick(AUCTIONS_LEAD, lang)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'lots', label: pick(SECTIONS.lots, lang) },
          { id: 'live', label: pick(SECTIONS.live, lang) },
          { id: 'take', label: pick(SECTIONS.take, lang) },
          { id: 'world', label: pick(SECTIONS.world, lang) },
          { id: 'history', label: pick(SECTIONS.history, lang) },
          { id: 'check', label: pick(SECTIONS.check, lang) },
          { id: 'sources', label: pick(SECTIONS.sources, lang) }
        ]}
      />

      <LotsSection />
      <LiveSection />
      <TakeSection />
      <WorldSection />
      <HistorySection />
      <CheckSection />
      <SourcesSection />
    </div>
  )
}
