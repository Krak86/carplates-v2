import type { ReactNode } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyCausesQuery, roadSafetyRegionsQuery, roadSafetyTimeQuery } from '@/lib/queries'
import { formatCount, pick } from '@/routes/read/helpers'
import { ROAD_NOTE, TEST_LINKS, WHY_NOTE } from '@/routes/read/safety/content'
import {
  changePercent,
  crashShare,
  deathsPer100Crashes,
  lastTwoFullYears,
  percentOf
} from '@/routes/read/safety/helpers'
import type { YearTotals } from '@/routes/read/safety/helpers'
import { hourLabel, peakBucket, weekdayLabel } from '@/routes/road-safety/helpers'

type StatProps = { label: string; value: string }

function Stat({ label, value }: StatProps): ReactNode {
  return (
    <div className="rounded-lg bg-(--color-bg) p-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}

/** National crash totals of the newest year, how they moved over the years, and how many crashes involve pedestrians and children. */
export function RoadSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const locale = toIntlLocale(language)
  const latest = useQuery(roadSafetyRegionsQuery())
  const years = latest.data?.years.toSorted((a, b) => a.year - b.year) ?? []
  const yearQueries = useQueries({ queries: years.map(y => roadSafetyRegionsQuery(y.year)) })

  const rows: YearTotals[] = years.flatMap((y, i) => {
    const national = yearQueries[i]?.data?.national
    return national ? [{ year: y.year, partial: y.partial, ...national }] : []
  })
  const maxDeaths = Math.max(1, ...rows.map(r => r.deaths))
  const pair = lastTwoFullYears(rows)
  const change = pair ? changePercent(pair.previous.deaths, pair.latest.deaths) : null
  const data = latest.data
  const per100 = data ? deathsPer100Crashes(data.national) : null
  const pedestrians = data ? crashShare(data.regions, 'pedestrianCrashes') : null
  const children = data ? crashShare(data.regions, 'childCrashes') : null

  return (
    <Card id="road" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.safety.roadTitle')}</h2>
      <p className="mb-3 text-muted">{pick(ROAD_NOTE, language)}</p>

      {latest.isPending && <Skeleton className="h-40 w-full rounded-lg" />}
      {latest.isError && <p className="text-muted">{t('read.loadError')}</p>}

      {data && (
        <>
          <p className="mb-2 text-sm text-muted">{t('read.safety.roadYear', { year: data.year })}</p>

          <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Stat label={t('roadSafety.summary.crashes')} value={formatCount(data.national.crashes, language)} />
            <Stat label={t('roadSafety.summary.deaths')} value={formatCount(data.national.deaths, language)} />
            <Stat label={t('roadSafety.summary.injured')} value={formatCount(data.national.injured, language)} />
            {per100 != null && <Stat label={t('read.safety.per100')} value={per100.toLocaleString(locale)} />}
          </dl>

          {rows.length > 1 && (
            <>
              <h3 className="mt-5 mb-2 font-semibold">{t('read.safety.dynamicsTitle')}</h3>

              {pair && change != null && (
                <p className="mb-3">
                  {t(change <= 0 ? 'read.safety.deathsFell' : 'read.safety.deathsRose', {
                    from: pair.previous.year,
                    to: pair.latest.year,
                    pct: Math.abs(change)
                  })}
                </p>
              )}

              <div className="flex h-32 items-end gap-2" role="img" aria-label={t('read.safety.dynamicsTitle')}>
                {rows.map(r => (
                  <span
                    key={r.year}
                    title={`${r.year}: ${formatCount(r.deaths, language)}`}
                    className="flex-1 rounded-t-sm bg-primary"
                    style={{ height: `${Math.max(2, (r.deaths / maxDeaths) * 100)}%`, opacity: r.partial ? 0.45 : 1 }}
                  />
                ))}
              </div>

              <p className="mt-1 flex gap-2 text-xs text-muted tabular-nums">
                {rows.map(r => (
                  <span key={r.year} className="flex-1 text-center">
                    {r.year}
                    {r.partial ? '*' : ''}
                  </span>
                ))}
              </p>

              <p className="mt-2 text-sm text-muted">{t('read.safety.dynamicsNote')}</p>
            </>
          )}

          {(pedestrians != null || children != null) && (
            <ul className="mt-5 space-y-1 text-sm">
              {pedestrians != null && (
                <li>{t('read.safety.pedestrianShare', { pct: pedestrians.toLocaleString(locale) })}</li>
              )}
              {children != null && <li>{t('read.safety.childShare', { pct: children.toLocaleString(locale) })}</li>}
            </ul>
          )}

          <Link to="/road-safety" className="mt-4 inline-block text-sm text-primary">
            {t('read.safety.moreRoad')} →
          </Link>
        </>
      )}
    </Card>
  )
}

type Entry = { name: string; deaths: number }

type EntryListProps = { title: string; entries: readonly Entry[]; total: number }

function EntryList({ title, entries, total }: EntryListProps): ReactNode {
  const { i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)

  return (
    <section>
      <h3 className="mb-2 font-semibold">{title}</h3>

      <ol className="space-y-1 text-sm">
        {entries.map((e, i) => (
          <li key={e.name} className="flex items-baseline gap-2">
            <span className="w-5 text-right text-muted tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">{e.name}</span>
            <span className="font-medium whitespace-nowrap tabular-nums">
              {percentOf(e.deaths, total).toLocaleString(locale)}%
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** What kills on the road (types and causes), when crashes peak, and how each connects to what crash tests measure. */
export function WhySection(): ReactNode {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const locale = toIntlLocale(language)
  const causes = useQuery(roadSafetyCausesQuery())
  const time = useQuery(roadSafetyTimeQuery())
  const types = causes.data?.types.slice(0, 5) ?? []
  const topCauses = causes.data?.causes.slice(0, 5) ?? []
  const typeDeaths = causes.data?.types.reduce((sum, e) => sum + e.deaths, 0) ?? 0
  const causeDeaths = causes.data?.causes.reduce((sum, e) => sum + e.deaths, 0) ?? 0
  const peakHour = time.data ? peakBucket(time.data.hours) : null
  const peakDay = time.data ? peakBucket(time.data.weekdays) : null

  return (
    <Card id="why" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.safety.whyTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.safety.whyIntro')}</p>

      {causes.isPending && <Skeleton className="h-40 w-full rounded-lg" />}

      {(types.length > 0 || topCauses.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {types.length > 0 && <EntryList title={t('read.safety.typesByDeaths')} entries={types} total={typeDeaths} />}
          {topCauses.length > 0 && (
            <EntryList title={t('read.safety.causesByDeaths')} entries={topCauses} total={causeDeaths} />
          )}
        </div>
      )}

      {(peakHour || peakDay) && (
        <p className="mt-4 text-sm">
          {peakHour && t('read.safety.peakHour', { hour: hourLabel(peakHour.bucket) })}{' '}
          {peakDay && t('read.safety.peakDay', { day: weekdayLabel(peakDay.bucket, locale) })}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {TEST_LINKS.map(link => (
          <li key={link.key} className="text-muted">
            <strong className="text-(--color-text)">{t(`read.safety.link.${link.key}`)}</strong>
            {' - '}
            {pick(link.text, language)}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted">{pick(WHY_NOTE, language)}</p>

      <Link to="/road-safety" className="mt-3 inline-block text-sm text-primary">
        {t('read.safety.moreRoad')} →
      </Link>
    </Card>
  )
}
