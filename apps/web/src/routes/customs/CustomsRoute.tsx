import type { ReactNode } from 'react'
import { parseCustomsQuery } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import Card from '@/components/ui/Card'
import CustomsCalculator from '@/routes/customs/CustomsCalculator'
import CustomsInfo from '@/routes/customs/CustomsInfo'

// Lazy-loaded (see App.tsx).
export default function CustomsRoute(): ReactNode {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { query, hasParams } = parseCustomsQuery(params)

  return (
    <article className="mx-auto w-full max-w-6xl space-y-4">
      <Card className="space-y-2">
        <h1 className="text-2xl font-bold">
          <span aria-hidden>🧮</span> {t('customs.title')}
        </h1>
        <p className="text-muted">{t('customs.intro')}</p>
      </Card>
      {/* Keyed on the link, so following a preset or a prefill link resets the form to it. */}
      <CustomsCalculator key={params.toString()} query={query} hasParams={hasParams} />
      <CustomsInfo />
    </article>
  )
}
