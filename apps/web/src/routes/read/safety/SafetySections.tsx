import type { ReactNode } from 'react'
import { CRASH_BANDS } from '@carplates/shared'
import type { SafetyStatsModel } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { toIntlLocale } from '@/lib/intl'
import { safetyStatsQuery } from '@/lib/queries'
import { displayModel, formatCount, pick } from '@/routes/read/helpers'
import { COVERAGE_NOTE, LIMITS, MODELS_NOTE, PROGRAMMES, WHAT_IS_TEST, YEARS_NOTE } from '@/routes/read/safety/content'
import { bandShares, chartYears, percentOf, yearTrend } from '@/routes/read/safety/helpers'
import { bandForScore } from '@/routes/safety/helpers'

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

/** The five programmes, their scales, and how many registered cars each one rates. */
export function ProgrammesSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(safetyStatsQuery())

  return (
    <Section
      id="programmes"
      title={t('read.safety.programmesTitle')}
      intro={pick(WHAT_IS_TEST, i18n.language)}
      isPending={isPending}
      isError={isError}
    >
      <ul className="space-y-3">
        {PROGRAMMES.map(p => {
          const row = data?.bySource.find(s => s.source === p.source)

          return (
            <li key={p.source} className="text-muted">
              <strong className="text-(--color-text)">{t(`safety.source.${p.source}`)}</strong>
              {' · '}
              {pick(p.scale, i18n.language)}
              {' - '}
              {pick(p.text, i18n.language)}
              {row && row.matched > 0 && (
                <span className="block text-sm">
                  {t('read.safety.rated', {
                    n: formatCount(row.matched, i18n.language),
                    pct: percentOf(row.matched, data?.total ?? 0).toLocaleString(toIntlLocale(i18n.language))
                  })}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/** How much of the fleet has a rating, how the rated cars score, and the share in each colour band. */
export function FleetSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(safetyStatsQuery())
  const language = i18n.language
  const maxBand = data ? Math.max(1, ...data.distribution.map(b => b.n)) : 1
  const shares = data ? bandShares(data.distribution, data.bandWidth) : null

  return (
    <Section
      id="fleet"
      title={t('read.safety.fleetTitle')}
      intro={t('read.safety.fleetIntro')}
      isPending={isPending}
      isError={isError}
    >
      {data && shares && (
        <>
          <dl className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-(--color-bg) p-3">
              <dt className="text-sm text-muted">{t('read.safety.coverage')}</dt>
              <dd className="text-2xl font-bold tabular-nums">
                {percentOf(data.matched, data.total).toLocaleString(toIntlLocale(language))}%
              </dd>
            </div>

            <div className="rounded-lg bg-(--color-bg) p-3">
              <dt className="text-sm text-muted">{t('read.safety.average')}</dt>
              <dd
                className="text-2xl font-bold tabular-nums"
                style={
                  data.fleetAvgScore != null ? { color: CO2_BAND_COLOR[bandForScore(data.fleetAvgScore)] } : undefined
                }
              >
                {data.fleetAvgScore != null ? Math.round(data.fleetAvgScore) : '-'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex h-32 items-end gap-0.5" role="img" aria-label={t('read.safety.fleetTitle')}>
            {data.distribution.map(b => (
              <span
                key={b.from}
                title={`${b.from}–${b.from + data.bandWidth}: ${formatCount(b.n, language)}`}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${Math.max(2, (b.n / maxBand) * 100)}%`,
                  background: CO2_BAND_COLOR[bandForScore(b.from + data.bandWidth / 2)]
                }}
              />
            ))}
          </div>

          <p className="mt-1 flex justify-between text-xs text-muted tabular-nums">
            <span>0</span>
            <span>{t('read.safety.scoreAxis')}</span>
            <span>100</span>
          </p>

          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            {CRASH_BANDS.map(band => (
              <li key={band} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: CO2_BAND_COLOR[band] }}
                />
                <span className="text-muted">{t(`read.safety.band.${band}`)}</span>
                <span className="tabular-nums">
                  {percentOf(shares[band], data.matched).toLocaleString(toIntlLocale(language))}%
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-sm text-muted">{pick(COVERAGE_NOTE, language)}</p>
        </>
      )}
    </Section>
  )
}

/** Average score per model year as columns; the headline compares the oldest and newest charted year. */
export function YearsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(safetyStatsQuery())
  const years = data ? chartYears(data.byYear, new Date().getFullYear()) : []
  const trend = yearTrend(years)

  return (
    <Section
      id="years"
      title={t('read.safety.yearsTitle')}
      intro={t('read.safety.yearsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {trend && trend.from.avgScore != null && trend.to.avgScore != null && (
        <p className="mb-3 font-medium">
          {t('read.safety.trend', {
            from: trend.from.label,
            to: trend.to.label,
            fromScore: Math.round(trend.from.avgScore),
            toScore: Math.round(trend.to.avgScore)
          })}
        </p>
      )}

      <div className="flex h-32 items-end gap-1" role="img" aria-label={t('read.safety.yearsTitle')}>
        {years.map(y => (
          <span
            key={y.label}
            title={`${y.label}: ${Math.round(y.avgScore ?? 0)} · ${t('read.safety.ratedCars', { n: formatCount(y.matched, i18n.language) })}`}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${Math.max(2, y.avgScore ?? 0)}%`,
              background: CO2_BAND_COLOR[bandForScore(y.avgScore ?? 0)]
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

function ModelList({ title, models }: { title: string; models: readonly SafetyStatsModel[] }): ReactNode {
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
              style={{ color: CO2_BAND_COLOR[bandForScore(m.avgScore)] }}
            >
              {Math.round(m.avgScore)}
              <span className="text-xs font-normal text-muted">
                {' '}
                · {t('safety.sourcesShort', { count: m.sources })}
              </span>
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

/** The best- and worst-scoring common models, each linking to the advanced search. */
export function ModelsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(safetyStatsQuery())

  return (
    <Section
      id="models"
      title={t('read.safety.modelsTitle')}
      intro={t('read.safety.modelsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <ModelList title={t('read.safety.safest')} models={data.safestModels} />
          <ModelList title={t('read.safety.leastSafe')} models={data.leastSafeModels} />
        </div>
      )}

      <p className="mt-3 text-sm text-muted">{pick(MODELS_NOTE, i18n.language)}</p>

      <Link to="/safety" className="mt-3 inline-block text-sm text-primary">
        {t('read.safety.moreStats')} →
      </Link>
    </Section>
  )
}

/** What a rating does not tell you, and where to see a particular car's rating. */
export function LimitsSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="limits" title={t('read.safety.limitsTitle')} intro={t('read.safety.limitsIntro')}>
      <ul className="space-y-3">
        {LIMITS.map(limit => (
          <li key={limit.key} className="text-muted">
            <strong className="text-(--color-text)">{t(`read.safety.limit.${limit.key}`)}</strong>
            {' - '}
            {pick(limit.text, i18n.language)}
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-3 inline-block text-sm text-primary">
        {t('read.safety.searchPlate')} →
      </Link>
    </Section>
  )
}
