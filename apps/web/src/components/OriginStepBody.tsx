import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import OriginCountry from '@/components/OriginCountry'
import type { OriginStep } from '@/components/OriginSection.helpers'
import { ownerRange } from '@/components/OriginSection.helpers'
import OriginSourceLink from '@/components/OriginSourceLink'

type Props = {
  step: OriginStep
}

const STEP_ICON: Record<OriginStep['kind'], string> = {
  brand: '🏛️',
  ownership: '🤝',
  assembly: '🏭',
  ukraine: '🇺🇦'
}

export default function OriginStepBody({ step }: Props): ReactNode {
  const { t } = useTranslation()
  const title = (
    <div className="flex items-center gap-1.5 text-sm font-semibold">
      <span aria-hidden>{STEP_ICON[step.kind]}</span>
      {t(`origin.step.${step.kind}`)}
    </div>
  )

  if (step.kind === 'brand') {
    const details = [
      step.foundedYear ? t('origin.brand.founded', { year: step.foundedYear }) : null,
      step.hqCity ? t('origin.brand.hq', { city: step.hqCity }) : null
    ].filter(Boolean)

    return (
      <>
        {title}

        <div className="mt-0.5">
          <OriginCountry code={step.country} extra={step.ukrainianSsr ? t('origin.country.ukrainianSsr') : undefined} />
        </div>

        {details.length > 0 && <div className="text-sm text-[var(--color-muted)]">{details.join(' · ')}</div>}

        <OriginSourceLink url={step.source} />
      </>
    )
  }

  if (step.kind === 'ownership') {
    return (
      <>
        {title}

        <ul className="m-0 mt-0.5 list-none space-y-0.5 p-0">
          {step.owners.map(owner => (
            <li key={`${owner.name}-${owner.from}`} className="flex flex-wrap justify-between gap-x-3 text-base">
              <span className="font-medium">{owner.name}</span>
              <span className="text-sm text-[var(--color-muted)]">{ownerRange(owner, t)}</span>
            </li>
          ))}
        </ul>

        {step.source && <OriginSourceLink url={step.source} />}
      </>
    )
  }

  if (step.kind === 'assembly') {
    return (
      <>
        {title}

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
          <OriginCountry code={step.country} />
          {step.city && <span className="text-base">{step.city}</span>}
        </div>

        <div className="text-sm text-[var(--color-muted)]">{t(`origin.assembly.${step.via}`)}</div>

        {step.alsoBuiltIn.length > 0 && (
          <div className="mt-1 text-sm">
            <span className="text-[var(--color-muted)]">{t('origin.assembly.also')}:</span>
            <ul className="m-0 list-none space-y-0.5 p-0">
              {step.alsoBuiltIn.map(alt => (
                <li key={`${alt.country}-${alt.city}-${alt.from}`} className="flex flex-wrap items-center gap-x-2">
                  <OriginCountry code={alt.country} />
                  {alt.city && <span>{alt.city}</span>}
                  <OriginSourceLink url={alt.source} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {title}

      <div className="mt-0.5 text-base font-medium">
        {t(step.imported ? 'origin.ukraine.imported' : 'origin.ukraine.registered')}
      </div>

      {step.date && (
        <div className="text-sm text-[var(--color-muted)]">{t('origin.ukraine.date', { date: step.date })}</div>
      )}
    </>
  )
}
