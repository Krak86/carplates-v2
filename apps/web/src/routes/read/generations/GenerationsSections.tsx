import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { GROWTH_MODELS, METHOD_POINTS, WHY_REASONS } from '@/routes/read/generations/content'
import GrowthCard from '@/routes/read/generations/GrowthCard'
import { pick } from '@/routes/read/helpers'
import { useSizeProfiles } from '@/routes/read/use-size-profiles'

/** Why a model gets bigger between generations (static prose). */
export function WhySection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="why" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.gen.whyTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.gen.whyIntro')}</p>

      <ul className="grid gap-3 md:grid-cols-2">
        {WHY_REASONS.map(reason => (
          <li key={reason.title.en} className="rounded-lg border border-border p-3">
            <h3 className="mb-1 font-medium">{pick(reason.title, i18n.language)}</h3>
            <p className="text-sm text-muted">{pick(reason.text, i18n.language)}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** The curated models, each across its generations. */
export function ModelsSection(): ReactNode {
  const { t } = useTranslation()
  const { find } = useSizeProfiles()

  return (
    <Card id="models" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.gen.modelsTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.gen.modelsIntro')}</p>

      <div className="space-y-4">
        {GROWTH_MODELS.map(m => (
          <GrowthCard
            key={`${m.brand}|${m.model}`}
            brand={m.brand}
            model={m.model}
            note={m.note}
            profile={find(m.brand, m.model)}
          />
        ))}
      </div>
    </Card>
  )
}

/** Where the numbers come from and how far to trust them. */
export function MethodSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="method" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.gen.methodTitle')}</h2>

      <ul className="list-disc space-y-1.5 pl-5 text-muted">
        {METHOD_POINTS.map(point => (
          <li key={point.en}>{pick(point, i18n.language)}</li>
        ))}
      </ul>
    </Card>
  )
}
