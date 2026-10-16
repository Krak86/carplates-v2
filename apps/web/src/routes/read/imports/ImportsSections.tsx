import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { countryName, isoFlag } from '@/components/vin/helpers'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { displayBrand } from '@/lib/display-brand'
import { toIntlLocale } from '@/lib/intl'
import { importsStatsQuery } from '@/lib/queries'
import { CHECKS, COUNTRY_NOTE, WHAT_COUNTS, YEARS_NOTE } from '@/routes/read/imports/content'
import { importShare, peakImportYear, percentOf, splitCountries } from '@/routes/read/imports/helpers'
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

/** What "imported" and "via a dealer" mean here, with the totals. */
export function KindsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(importsStatsQuery())

  return (
    <Section
      id="kinds"
      title={t('read.imports.kindsTitle')}
      intro={pick(WHAT_COUNTS, i18n.language)}
      isPending={isPending}
      isError={isError}
    >
      {data && (
        <dl className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-(--color-bg) p-3">
            <dt className="text-sm text-muted">{t('read.imports.imported')}</dt>
            <dd className="text-2xl font-bold tabular-nums">{formatCount(data.total.import, i18n.language)}</dd>
          </div>

          <div className="rounded-lg bg-(--color-bg) p-3">
            <dt className="text-sm text-muted">{t('read.imports.dealer')}</dt>
            <dd className="text-2xl font-bold tabular-nums">{formatCount(data.total.dealer, i18n.language)}</dd>
          </div>
        </dl>
      )}
    </Section>
  )
}

/** Imports (dark) and dealer sales (light) per year as paired columns; each tooltip carries both counts and the import share. */
export function YearsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(importsStatsQuery())
  const years = data?.byYear ?? []
  const peak = peakImportYear(years)
  const biggest = Math.max(1, ...years.map(y => Math.max(y.import, y.dealer)))
  const percent = (n: number): string =>
    n.toLocaleString(toIntlLocale(i18n.language), { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <Section
      id="years"
      title={t('read.imports.yearsTitle')}
      intro={t('read.imports.yearsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {peak && (
        <p className="mb-3 font-medium">
          {t('read.imports.peak', {
            year: peak.year,
            n: formatCount(peak.import, i18n.language),
            pct: percent(importShare(peak))
          })}
        </p>
      )}

      <div className="flex h-32 items-end gap-1" role="img" aria-label={t('read.imports.yearsTitle')}>
        {years.map(y => (
          <span
            key={y.year}
            title={`${y.year}: ${t('read.imports.imported')} ${formatCount(y.import, i18n.language)} · ${t('read.imports.dealer')} ${formatCount(y.dealer, i18n.language)} · ${percent(importShare(y))}%`}
            className="flex h-full flex-1 items-end gap-px"
          >
            <span
              className="flex-1 rounded-t-sm bg-primary"
              style={{ height: `${Math.max(2, (y.import / biggest) * 100)}%` }}
            />
            <span
              className="flex-1 rounded-t-sm bg-primary opacity-35"
              style={{ height: `${Math.max(2, (y.dealer / biggest) * 100)}%` }}
            />
          </span>
        ))}
      </div>

      {years.length > 0 && (
        <p className="mt-1 flex justify-between text-xs text-muted tabular-nums">
          <span>{years[0]?.year}</span>
          <span>{years[years.length - 1]?.year}</span>
        </p>
      )}

      <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted">
        <span>
          <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
          {t('read.imports.imported')}
        </span>
        <span>
          <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-primary opacity-35" />
          {t('read.imports.dealer')}
        </span>
      </p>

      <p className="mt-3 text-sm text-muted">{pick(YEARS_NOTE, i18n.language)}</p>
    </Section>
  )
}

/** The biggest imported models; the note says how many of each were built in the US or Canada. */
export function ModelsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(importsStatsQuery())
  const models = data?.topModels ?? []

  return (
    <Section
      id="models"
      title={t('read.imports.modelsTitle')}
      intro={t('read.imports.modelsIntro')}
      isPending={isPending}
      isError={isError}
    >
      <ShareBars
        language={i18n.language}
        total={data?.total.import ?? 1}
        bars={models.map(m => ({
          id: `${m.brand}|${m.model}`,
          label: `${displayBrand(m.brand)} ${displayModel(m.model)}`,
          n: m.n
        }))}
      />

      <Link to="/stats" className="mt-3 inline-block text-sm text-primary">
        {t('read.imports.moreStats')} →
      </Link>
    </Section>
  )
}

/** Import countries read off the VIN, with the US + Canada total called out. */
export function CountriesSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(importsStatsQuery())
  const countries = data?.byCountry ?? []
  const total = data?.total.import ?? 1
  const split = splitCountries(countries)

  return (
    <Section
      id="countries"
      title={t('read.imports.countriesTitle')}
      intro={t('read.imports.countriesIntro')}
      isPending={isPending}
      isError={isError}
    >
      {data && (
        <p className="mb-3 font-medium">
          {t('read.imports.northAmerica', {
            n: formatCount(split.northAmerica, i18n.language),
            pct: percentOf(split.northAmerica, total).toLocaleString(toIntlLocale(i18n.language))
          })}
        </p>
      )}

      <ShareBars
        language={i18n.language}
        total={total}
        bars={countries.map(c => ({
          id: c.country || 'unknown',
          label: c.country
            ? `${isoFlag(c.country)} ${countryName(c.country, i18n.language)}`
            : t('read.imports.unknownVin'),
          n: c.n
        }))}
      />

      <p className="mt-3 text-sm text-muted">{pick(COUNTRY_NOTE, i18n.language)}</p>
    </Section>
  )
}

/** What to check before buying: the plate-card checks, link-out only. */
export function ChecksSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="checks" title={t('read.imports.checksTitle')} intro={t('read.imports.checksIntro')}>
      <ul className="space-y-3">
        {CHECKS.map(check => (
          <li key={check.key} className="text-muted">
            <strong className="text-(--color-text)">{t(`read.imports.check.${check.key}`)}</strong>
            {' — '}
            {pick(check.text, i18n.language)}
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-3 inline-block text-sm text-primary">
        {t('read.imports.searchPlate')} →
      </Link>
    </Section>
  )
}
