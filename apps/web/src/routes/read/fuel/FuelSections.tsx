import type { ReactNode } from 'react'
import { CO2_BANDS } from '@carplates/shared'
import type { FuelStatsModel } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { fuelStatsQuery } from '@/lib/queries'
import { bandForCo2, coveragePercent, formatPercent } from '@/routes/fuel/helpers'
import { displayModel, formatCount, pick } from '@/routes/read/helpers'
import { DISTRIBUTION_NOTE, METHOD, MIX_NOTE, MODELS_NOTE, YEARS_NOTE } from '@/routes/read/fuel/content'
import { bandShares, chartYears, fuelMix, shareOf, yearTrend } from '@/routes/read/fuel/helpers'
import { ELECTRIC_PATH } from '@/routes/read/links'

type SectionProps = {
  id: string
  title: string
  intro: string
  isPending?: boolean
  isError?: boolean
  children: ReactNode
}

function Section({ id, title, intro, isPending = false, isError = false, children }: SectionProps): ReactNode {
  const { t } = useTranslation()

  return (
    <Card id={id} className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <p className="mb-3 text-muted">{intro}</p>

      {isPending && <Skeleton className="h-40 w-full rounded-lg" />}
      {isError && <p className="text-muted">{t('read.loadError')}</p>}
      {children}
    </Card>
  )
}

/** What the passenger-car fleet runs on: one bar per fuel class, sized by its share of the cars. */
export function MixSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(fuelStatsQuery())
  const mix = data ? fuelMix(data.byFuelClass) : []

  return (
    <Section
      id="mix"
      title={t('read.fuel.mixTitle')}
      intro={t('read.fuel.mixIntro')}
      isPending={isPending}
      isError={isError}
    >
      {data && (
        <ul className="space-y-2">
          {mix.map(row => {
            const share = shareOf(row.n, data.total)

            return (
              <li key={row.label} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{t(`fuel.fuelClass.${row.label}`)}</span>
                  <span className="text-muted tabular-nums">
                    {formatPercent(share)} · {formatCount(row.n, i18n.language)}
                  </span>
                </div>

                <div className="mt-1 h-2 overflow-hidden rounded-full bg-(--color-bg)">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(1, share)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-sm text-muted">{pick(MIX_NOTE, i18n.language)}</p>

      <Link to={ELECTRIC_PATH} className="mt-3 inline-block text-sm text-primary">
        {t('read.fuel.electricLink')} →
      </Link>
    </Section>
  )
}

/** How many cars have an estimate, the fleet average, and the cars per emissions band. */
export function FleetSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(fuelStatsQuery())
  const language = i18n.language
  const maxBand = data ? Math.max(1, ...data.distribution.map(b => b.n)) : 1
  const shares = data ? bandShares(data.distribution, data.bandWidth) : null

  return (
    <Section
      id="fleet"
      title={t('read.fuel.fleetTitle')}
      intro={t('read.fuel.fleetIntro')}
      isPending={isPending}
      isError={isError}
    >
      {data && shares && (
        <>
          <dl className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-(--color-bg) p-3">
              <dt className="text-sm text-muted">{t('read.fuel.coverage')}</dt>
              <dd className="text-2xl font-bold tabular-nums">
                {formatPercent(coveragePercent({ n: data.total, matched: data.matched }))}
              </dd>
            </div>

            <div className="rounded-lg bg-(--color-bg) p-3">
              <dt className="text-sm text-muted">{t('read.fuel.average')}</dt>
              <dd
                className="text-2xl font-bold tabular-nums"
                style={data.fleetAvgCo2 != null ? { color: CO2_BAND_COLOR[bandForCo2(data.fleetAvgCo2)] } : undefined}
              >
                {data.fleetAvgCo2 != null ? Math.round(data.fleetAvgCo2) : '—'}
                <span className="text-sm font-normal text-muted"> {t('co2.unitGKm')}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex h-32 items-end gap-0.5" role="img" aria-label={t('read.fuel.fleetTitle')}>
            {data.distribution.map(b => (
              <span
                key={b.from}
                title={`${b.from}–${b.from + data.bandWidth} ${t('co2.unitGKm')}: ${formatCount(b.n, language)}`}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${Math.max(2, (b.n / maxBand) * 100)}%`,
                  background: CO2_BAND_COLOR[bandForCo2(b.from + data.bandWidth / 2)]
                }}
              />
            ))}
          </div>

          <p className="mt-1 flex justify-between text-xs text-muted tabular-nums">
            <span>{data.distribution[0]?.from ?? 0}</span>
            <span>{t('co2.unitGKm')}</span>
            <span>{(data.distribution.at(-1)?.from ?? 0) + data.bandWidth}</span>
          </p>

          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            {CO2_BANDS.map(band => (
              <li key={band} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: CO2_BAND_COLOR[band] }}
                />
                <span className="text-muted">{t(`read.fuel.band.${band}`)}</span>
                <span className="tabular-nums">{formatPercent(shareOf(shares[band], data.matched))}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-sm text-muted">{pick(DISTRIBUTION_NOTE, language)}</p>
        </>
      )}
    </Section>
  )
}

/** Average CO₂ per model year as columns; the headline compares the oldest and newest charted year. */
export function YearsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(fuelStatsQuery())
  const years = data ? chartYears(data.byYear, new Date().getFullYear()) : []
  const trend = yearTrend(years)
  const maxCo2 = Math.max(1, ...years.map(y => y.avgCo2 ?? 0))

  return (
    <Section
      id="years"
      title={t('read.fuel.yearsTitle')}
      intro={t('read.fuel.yearsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {trend && trend.from.avgCo2 != null && trend.to.avgCo2 != null && (
        <p className="mb-3 font-medium">
          {t('read.fuel.trend', {
            from: trend.from.label,
            to: trend.to.label,
            fromCo2: Math.round(trend.from.avgCo2),
            toCo2: Math.round(trend.to.avgCo2)
          })}
        </p>
      )}

      <div className="flex h-32 items-end gap-1" role="img" aria-label={t('read.fuel.yearsTitle')}>
        {years.map(y => (
          <span
            key={y.label}
            title={`${y.label}: ${Math.round(y.avgCo2 ?? 0)} ${t('co2.unitGKm')} · ${t('read.fuel.estimatedCars', { n: formatCount(y.matched, i18n.language) })}`}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${Math.max(2, ((y.avgCo2 ?? 0) / maxCo2) * 100)}%`,
              background: CO2_BAND_COLOR[bandForCo2(y.avgCo2 ?? 0)]
            }}
          />
        ))}
      </div>

      {years.length > 0 && (
        <p className="mt-1 flex justify-between text-xs text-muted tabular-nums">
          <span>{years[0]?.label}</span>
          <span>{years[years.length - 1]?.label}</span>
        </p>
      )}

      <p className="mt-3 text-sm text-muted">{pick(YEARS_NOTE, i18n.language)}</p>
    </Section>
  )
}

function ModelList({ title, models }: { title: string; models: readonly FuelStatsModel[] }): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <section>
      <h3 className="mb-2 font-semibold">{title}</h3>

      <ol className="space-y-1 text-sm">
        {models.slice(0, 8).map((m, i) => (
          <li key={`${m.brand}|${m.model}`} className="flex items-center gap-2">
            <span className="w-5 text-right text-muted tabular-nums">{i + 1}</span>
            <BrandLogo brand={m.brand} size="sm" />

            <Link
              to={`/advanced-search?${new URLSearchParams({ brand: m.brand, model: m.model })}`}
              className="min-w-0 flex-1 truncate text-primary"
            >
              {m.brand} {displayModel(m.model)}
            </Link>

            <span
              className="font-medium whitespace-nowrap tabular-nums"
              style={{ color: CO2_BAND_COLOR[bandForCo2(m.avgCo2)] }}
            >
              {Math.round(m.avgCo2)}
              <span className="text-xs font-normal text-muted"> {t('co2.unitGKm')}</span>
            </span>

            <span className="hidden text-xs whitespace-nowrap text-muted sm:inline">
              {formatCount(m.n, i18n.language)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The cleanest and the most CO₂-heavy common models, each linking to the advanced search. */
export function ModelsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(fuelStatsQuery())

  return (
    <Section
      id="models"
      title={t('read.fuel.modelsTitle')}
      intro={t('read.fuel.modelsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <ModelList title={t('read.fuel.cleanest')} models={data.cleanestModels} />
          <ModelList title={t('read.fuel.dirtiest')} models={data.dirtiestModels} />
        </div>
      )}

      <p className="mt-3 text-sm text-muted">{pick(MODELS_NOTE, i18n.language)}</p>

      <Link to="/fuel" className="mt-3 inline-block text-sm text-primary">
        {t('read.fuel.moreStats')} →
      </Link>
    </Section>
  )
}

/** Where the CO₂ figures come from and what they leave out, and where to see a particular car's estimate. */
export function MethodSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="method" title={t('read.fuel.methodTitle')} intro={t('read.fuel.methodIntro')}>
      <ul className="space-y-3">
        {METHOD.map(item => (
          <li key={item.key} className="text-muted">
            <strong className="text-(--color-text)">{t(`read.fuel.method.${item.key}`)}</strong>
            {' — '}
            {pick(item.text, i18n.language)}
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-3 inline-block text-sm text-primary">
        {t('read.fuel.searchPlate')} →
      </Link>
    </Section>
  )
}
