import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArticleHeader from '@/routes/read/ArticleHeader'
import { RECALLS_LEAD } from '@/routes/read/articles'
import { pick } from '@/routes/read/helpers'
import { EXAMPLES } from '@/routes/read/recalls/content'
import {
  FaultsSection,
  KindsSection,
  ModelPicker,
  ReadSection,
  RecallsSection
} from '@/routes/read/recalls/RecallsSections'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function RecallsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState(0)
  const example = EXAMPLES[index] ?? EXAMPLES[0]!

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <ArticleHeader
        title={t('nav.readRecalls')}
        lead={pick(RECALLS_LEAD, i18n.language)}
        backLabel={t('read.back')}
        jumps={[
          { id: 'kinds', label: t('read.sec.recKinds') },
          { id: 'model', label: t('read.sec.recModel') },
          { id: 'recalls', label: t('read.sec.recRecalls') },
          { id: 'faults', label: t('read.sec.recFaults') },
          { id: 'read', label: t('read.sec.recRead') }
        ]}
      />

      <KindsSection />
      <ModelPicker index={index} onPick={setIndex} />
      <RecallsSection example={example} />
      <FaultsSection example={example} />
      <ReadSection />
    </div>
  )
}
