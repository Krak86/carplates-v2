import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { displayBrand } from '@/lib/display-brand'
import { toIntlLocale } from '@/lib/intl'
import { evStatsQuery } from '@/lib/queries'
import { useRegionLabel } from '@/lib/region-label'
import { PLUGS, WHAT_COUNTS, YEARS_NOTE } from '@/routes/read/electric/content'
import { bevShare, evYears, peakYear, topRegions } from '@/routes/read/electric/helpers'
import ShareBars from '@/routes/read/fleet/ShareBars'
import { displayModel, formatCount, pick } from '@/routes/read/helpers'

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

/** What the registry calls an electric car, with the totals. */
export function KindsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(evStatsQuery())

  return (
    <Section
      id="kinds"
      title={t('read.electric.kindsTitle')}
      intro={pick(WHAT_COUNTS, i18n.language)}
      isPending={isPending}
      isError={isError}
    >
      {data && (
        <dl className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-(--color-bg) p-3">
            <dt className="text-sm text-muted">{t('read.electric.bev')}</dt>
            <dd className="text-2xl font-bold tabular-nums">{formatCount(data.total.bev, i18n.language)}</dd>
          </div>

          <div className="rounded-lg bg-(--color-bg) p-3">
            <dt className="text-sm text-muted">{t('read.electric.hybrid')}</dt>
            <dd className="text-2xl font-bold tabular-nums">{formatCount(data.total.hybrid, i18n.language)}</dd>
          </div>
        </dl>
      )}
    </Section>
  )
}

/** Electric-only cars per model year as columns; each tooltip carries the count and the share of that year's cars. */
export function YearsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(evStatsQuery())
  const years = evYears(data?.byYear ?? [])
  const peak = peakYear(years)
  const biggest = Math.max(1, ...years.map(y => y.bev))
  const percent = (n: number): string =>
    n.toLocaleString(toIntlLocale(i18n.language), { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <Section
      id="years"
      title={t('read.electric.yearsTitle')}
      intro={t('read.electric.yearsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {peak && (
        <p className="mb-3 font-medium">
          {t('read.electric.peak', {
            year: peak.year,
            n: formatCount(peak.bev, i18n.language),
            pct: percent(bevShare(peak))
          })}
        </p>
      )}

      <div className="flex h-32 items-end gap-px" role="img" aria-label={t('read.electric.yearsTitle')}>
        {years.map(y => (
          <span
            key={y.year}
            title={`${y.year}: ${formatCount(y.bev, i18n.language)} · ${percent(bevShare(y))}%`}
            className="flex-1 rounded-t-sm bg-primary"
            style={{ height: `${Math.max(2, (y.bev / biggest) * 100)}%` }}
          />
        ))}
      </div>

      {years.length > 0 && (
        <p className="mt-1 flex justify-between text-xs text-muted tabular-nums">
          <span>{years[0]?.year}</span>
          <span>{years[years.length - 1]?.year}</span>
        </p>
      )}

      <p className="mt-3 text-sm text-muted">{pick(YEARS_NOTE, i18n.language)}</p>
    </Section>
  )
}

/** The regions with the most electrified cars, each bar a share of those regions' total. */
export function RegionsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const regionLabel = useRegionLabel()
  const { data, isPending, isError } = useQuery(evStatsQuery())
  const regions = topRegions(data?.byRegion ?? [])
  const total = regions.reduce((sum, r) => sum + r.bev + r.hybrid, 0)

  return (
    <Section
      id="regions"
      title={t('read.electric.regionsTitle')}
      intro={t('read.electric.regionsIntro')}
      isPending={isPending}
      isError={isError}
    >
      <ShareBars
        language={i18n.language}
        total={total}
        bars={regions.map(r => ({ id: r.region, label: regionLabel(r.region), n: r.bev + r.hybrid }))}
      />
    </Section>
  )
}

/** The biggest electric-only models. */
export function ModelsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(evStatsQuery())
  const models = data?.topModels ?? []
  const total = models.reduce((sum, m) => sum + m.n, 0)

  return (
    <Section
      id="models"
      title={t('read.electric.modelsTitle')}
      intro={t('read.electric.modelsIntro')}
      isPending={isPending}
      isError={isError}
    >
      <ShareBars
        language={i18n.language}
        total={total}
        bars={models.map(m => ({
          id: `${m.brand}|${m.model}`,
          label: `${displayBrand(m.brand)} ${displayModel(m.model)}`,
          n: m.n
        }))}
      />

      <Link to="/stats?dim=fuel" className="mt-3 inline-block text-sm text-primary">
        {t('read.electric.moreFuel')} →
      </Link>
    </Section>
  )
}

/** Plug standards: which one a car has decides where it can charge. Static copy. */
export function PlugsSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="plugs" title={t('read.electric.plugsTitle')} intro={t('read.electric.plugsIntro')}>
      <dl className="space-y-3">
        {PLUGS.map(plug => (
          <div key={plug.name}>
            <dt className="font-semibold">{plug.name}</dt>
            <dd className="text-muted">{pick(plug.text, i18n.language)}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
