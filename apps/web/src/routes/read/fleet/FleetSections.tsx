import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { VEHICLE_COLOR_HEX } from '@carplates/shared'

import { FUEL_ICON } from '@/components/ResultCard.helpers'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { statsFieldQuery } from '@/lib/queries'
import { COLOR_FACTS, FUEL_FACTS } from '@/routes/read/fleet/content'
import FactList from '@/routes/read/fleet/FactList'
import { ageSummary, colorShares, fuelShares } from '@/routes/read/fleet/helpers'
import ShareBars from '@/routes/read/fleet/ShareBars'
import { formatCount } from '@/routes/read/helpers'

const TOP_COLORS = 11
const TOP_FUELS = 8

type SectionProps = {
  id: string
  title: string
  intro: string
  moreTo: string
  moreLabel: string
  isPending: boolean
  isError: boolean
  children: ReactNode
}

function Section({ id, title, intro, moreTo, moreLabel, isPending, isError, children }: SectionProps): ReactNode {
  const { t } = useTranslation()

  return (
    <Card id={id} className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <p className="mb-3 text-muted">{intro}</p>

      {isPending && <Skeleton className="h-40 w-full rounded-lg" />}
      {isError && <p className="text-muted">{t('read.loadError')}</p>}
      {children}

      <Link to={moreTo} className="mt-3 inline-block text-sm text-primary">
        {moreLabel} →
      </Link>
    </Card>
  )
}

/** The registry's colours as share bars painted in the colour itself. */
export function ColorsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(statsFieldQuery('color'))
  const shares = colorShares(data ?? [])
  const total = shares.reduce((sum, s) => sum + s.n, 0)

  return (
    <Section
      id="colors"
      title={t('read.fleet.colorsTitle')}
      intro={t('read.fleet.colorsIntro')}
      moreTo="/stats?dim=color"
      moreLabel={t('read.fleet.moreColors')}
      isPending={isPending}
      isError={isError}
    >
      <ShareBars
        language={i18n.language}
        total={total}
        bars={shares.slice(0, TOP_COLORS).map(s => ({
          id: s.key,
          label: t(`read.fleet.color.${s.key}`),
          n: s.n,
          color: VEHICLE_COLOR_HEX[s.key]
        }))}
      />

      <FactList prefix="colorFacts" items={COLOR_FACTS} />
    </Section>
  )
}

/** Fuel groups (a petrol + gas car is its own group) as share bars. */
export function FuelSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(statsFieldQuery('fuel'))
  const shares = fuelShares(data ?? [])
  const total = shares.reduce((sum, s) => sum + s.n, 0)

  return (
    <Section
      id="fuel"
      title={t('read.fleet.fuelTitle')}
      intro={t('read.fleet.fuelIntro')}
      moreTo="/stats?dim=fuel"
      moreLabel={t('read.fleet.moreFuel')}
      isPending={isPending}
      isError={isError}
    >
      <ShareBars
        language={i18n.language}
        total={total}
        bars={shares.slice(0, TOP_FUELS).map(s => ({
          id: s.key.join('+'),
          label: (
            <>
              <span aria-hidden>{s.key.map(f => FUEL_ICON[f]).join('')}</span>
              {s.key.map(f => t(`read.fleet.fuel.${f}`)).join(' + ')}
            </>
          ),
          n: s.n
        }))}
      />

      <FactList prefix="fuelFacts" items={FUEL_FACTS} />
    </Section>
  )
}

/** Registrations per year: median, recent share and one bar per year. */
export function AgeSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(statsFieldQuery('year'))
  const { years, medianYear, recentPercent } = ageSummary(data ?? [], new Date().getFullYear())
  const peak = Math.max(1, ...years.map(y => y.n))

  return (
    <Section
      id="age"
      title={t('read.fleet.ageTitle')}
      intro={t('read.fleet.ageIntro')}
      moreTo="/stats?dim=year"
      moreLabel={t('read.fleet.moreYears')}
      isPending={isPending}
      isError={isError}
    >
      {medianYear !== null && (
        <p className="mb-3 font-medium">
          {t('read.fleet.median', { year: medianYear })} · {t('read.fleet.recent', { pct: recentPercent })}
        </p>
      )}

      <div className="flex h-32 items-end gap-px" role="img" aria-label={t('read.fleet.ageTitle')}>
        {years.map(y => (
          <span
            key={y.key}
            title={`${y.key}: ${formatCount(y.n, i18n.language)}`}
            className="flex-1 rounded-t-sm bg-primary"
            style={{ height: `${Math.max(2, (y.n / peak) * 100)}%` }}
          />
        ))}
      </div>

      {years.length > 0 && (
        <p className="mt-1 flex justify-between text-xs text-muted tabular-nums">
          <span>{years[0]?.key}</span>
          <span>{years[years.length - 1]?.key}</span>
        </p>
      )}
    </Section>
  )
}
