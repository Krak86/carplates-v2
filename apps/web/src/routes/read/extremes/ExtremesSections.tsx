import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { READING, SPEC_NOTE, WEIGHT_NOTE } from '@/routes/read/extremes/content'
import { pick } from '@/routes/read/helpers'
import SpecModelsPanel from '@/routes/stats/SpecModelsPanel'
import WeightModelsPanel from '@/routes/stats/WeightModelsPanel'

type SectionProps = {
  id: string
  title: string
  intro: string
  children?: ReactNode
}

function Section({ id, title, intro, children }: SectionProps): ReactNode {
  return (
    <Card id={id} className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <p className="mb-3 text-muted">{intro}</p>
      {children}
    </Card>
  )
}

/** Heaviest / lightest models with the vehicle-group tabs (the same panel as /stats, state in `?weight=`). */
export function WeightSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="weight" title={t('read.extremes.weightTitle')} intro={t('read.extremes.weightIntro')}>
      <WeightModelsPanel stacked />

      <p className="text-sm text-muted">{pick(WEIGHT_NOTE, i18n.language)}</p>
    </Section>
  )
}

/** Highest / lowest passenger-car models by power, engine size, height, length and fuel tank. */
export function SpecSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="spec" title={t('read.extremes.specTitle')} intro={t('read.extremes.specIntro')}>
      <SpecModelsPanel stacked />

      <p className="text-sm text-muted">{pick(SPEC_NOTE, i18n.language)}</p>

      <Link to="/stats" className="mt-3 inline-block text-sm text-primary">
        {t('read.extremes.moreStats')} →
      </Link>
    </Section>
  )
}

/** What each list measures and leaves out, and where to see a particular car's numbers. */
export function ReadSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="read" title={t('read.extremes.readTitle')} intro={t('read.extremes.readIntro')}>
      <ul className="space-y-3">
        {READING.map(item => (
          <li key={item.key} className="text-muted">
            <strong className="text-(--color-text)">{t(`read.extremes.read.${item.key}`)}</strong>
            {' - '}
            {pick(item.text, i18n.language)}
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-3 inline-block text-sm text-primary">
        {t('read.extremes.searchLink')} →
      </Link>
    </Section>
  )
}
