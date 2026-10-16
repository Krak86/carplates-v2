import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { bandLabel, formatShare, formatTests, groupKey } from '@/components/MotFaults.helpers'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { displayBrand } from '@/lib/display-brand'
import { caRecallsQuery, motQuery, nhtsaRecallsQuery, rdwRecallsQuery } from '@/lib/queries'
import { displayModel, formatCount, pick } from '@/routes/read/helpers'
import {
  EXAMPLES,
  FAULTS_NOTE,
  KINDS_NOTE,
  READING,
  RECALLS_NOTE,
  type RecallExample
} from '@/routes/read/recalls/content'
import { barHeight, failCurve, topFaultGroups } from '@/routes/read/recalls/helpers'

const TOP_GROUPS = 5

type SectionProps = {
  id: string
  title: string
  intro: string
  isPending?: boolean
  isError?: boolean
  children?: ReactNode
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

const exampleName = (e: RecallExample): string => `${displayBrand(e.brand)} ${displayModel(e.model)}`

/** A recall is not a wear fault: the two ideas, side by side. */
export function KindsSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="kinds" title={t('read.recalls.kindsTitle')} intro={t('read.recalls.kindsIntro')}>
      <p className="text-muted">{pick(KINDS_NOTE, i18n.language)}</p>
    </Section>
  )
}

type PickerProps = {
  index: number
  onPick: (index: number) => void
}

/** The model every live block below shows. */
export function ModelPicker({ index, onPick }: PickerProps): ReactNode {
  const { t } = useTranslation()

  return (
    <Card id="model" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.recalls.pickTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.recalls.pickIntro')}</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('read.recalls.pickTitle')}>
        {EXAMPLES.map((e, i) => (
          <button
            key={exampleName(e)}
            type="button"
            aria-pressed={i === index}
            onClick={() => onPick(i)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              i === index ? 'border-primary bg-primary text-white' : 'border-border hover:bg-(--color-bg)'
            )}
          >
            {exampleName(e)}
          </button>
        ))}
      </div>
    </Card>
  )
}

type ExampleProps = { example: RecallExample }

/** Campaign counts per market for the picked model: EU (RDW), US (NHTSA) and Canada-only (Transport Canada). */
export function RecallsSection({ example }: ExampleProps): ReactNode {
  const { t, i18n } = useTranslation()
  const { brand, model, year } = example
  const eu = useQuery(rdwRecallsQuery(brand, model))
  const us = useQuery(nhtsaRecallsQuery(brand, model, year))
  const ca = useQuery(caRecallsQuery(brand, model, year))
  const isPending = eu.isPending || us.isPending || ca.isPending
  const isError = !isPending && eu.isError && us.isError && ca.isError
  const lang = i18n.language
  const latest = us.data?.recalls[0]

  const rows = [
    { key: 'eu', flag: '🇪🇺', total: eu.data?.match?.total },
    { key: 'us', flag: '🇺🇸', total: us.data?.total },
    { key: 'ca', flag: '🇨🇦', total: ca.data?.match?.total }
  ]

  return (
    <Section
      id="recalls"
      title={t('read.recalls.recallsTitle', { name: exampleName(example) })}
      intro={t('read.recalls.recallsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {!isPending && !isError && (
        <>
          <ul className="space-y-2">
            {rows.map(row => (
              <li key={row.key} className="flex items-baseline gap-2">
                <span aria-hidden>{row.flag}</span>
                <span className="text-muted">{t(`read.recalls.market.${row.key}`)}</span>
                <strong className="ml-auto tabular-nums">
                  {row.total == null ? '-' : formatCount(row.total, lang)}
                </strong>
              </li>
            ))}
          </ul>

          {latest?.component && (
            <p className="mt-3 text-sm text-muted">{t('read.recalls.latestUs', { component: latest.component })}</p>
          )}
        </>
      )}

      <p className="mt-3 text-sm text-muted">{pick(RECALLS_NOTE, lang)}</p>
    </Section>
  )
}

/** Fail rate by mileage next to the UK average, and the fault groups behind most failed tests. */
export function FaultsSection({ example }: ExampleProps): ReactNode {
  const { t, i18n } = useTranslation()
  const { brand, model, year } = example
  const { data, isPending, isError } = useQuery(motQuery(brand, model, year, 'car'))
  const match = data?.match
  const lang = i18n.language
  const curve = match ? failCurve(match) : []
  const top = Math.max(0.05, ...curve.flatMap(p => [p.failRate ?? 0, p.baselineFailRate ?? 0]))
  const groups = match ? topFaultGroups(match, TOP_GROUPS) : []

  return (
    <Section
      id="faults"
      title={t('read.recalls.faultsTitle', { name: exampleName(example) })}
      intro={t('read.recalls.faultsIntro')}
      isPending={isPending}
      isError={isError}
    >
      {data && !match && <p className="text-muted">{t('read.recalls.noMot')}</p>}

      {match && (
        <>
          <div className="flex h-32 items-end gap-1" role="img" aria-label={t('read.recalls.faultsChart')}>
            {curve.map(p => (
              <span
                key={p.band}
                title={`${bandLabel(match.edgesKm, p.band)}: ${formatShare(p.failRate)} · ${t('read.recalls.ukAverage')} ${formatShare(p.baselineFailRate)} · ${formatTests(p.tests)}`}
                className="relative flex-1 self-stretch"
              >
                <span
                  className="absolute inset-x-0 bottom-0 rounded-t-sm bg-primary"
                  style={{ height: `${barHeight(p.failRate, top)}%` }}
                />
                {p.baselineFailRate != null && (
                  <span
                    className="absolute inset-x-0 h-0.5 bg-(--color-text)"
                    style={{ bottom: `${barHeight(p.baselineFailRate, top)}%` }}
                  />
                )}
              </span>
            ))}
          </div>

          <p className="mt-1 flex justify-between text-xs text-muted tabular-nums">
            {curve.map(p => (
              <span key={p.band}>{bandLabel(match.edgesKm, p.band)}</span>
            ))}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t('read.recalls.faultsAxis')} · <span aria-hidden>▬</span> {t('read.recalls.ukAverage')} ·{' '}
            {t('read.recalls.testsBehind', { n: formatTests(match.tests) })}
          </p>

          <h3 className="mt-4 mb-2 font-semibold">{t('read.recalls.topGroups')}</h3>
          <ul className="space-y-1">
            {groups.map(g => (
              <li key={g.code} className="flex items-baseline gap-2">
                <span className="text-muted">{t(groupKey(g.code))}</span>
                <strong className="ml-auto tabular-nums">{formatShare(g.failShare)}</strong>
                <span className="w-24 text-right text-sm text-muted tabular-nums">
                  {t('read.recalls.watch', { share: formatShare(g.watchShare) })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-3 text-sm text-muted">{pick(FAULTS_NOTE, lang)}</p>
    </Section>
  )
}

/** How to read these numbers, and where to see a particular car's own list. */
export function ReadSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Section id="read" title={t('read.recalls.readTitle')} intro={t('read.recalls.readIntro')}>
      <ul className="space-y-3">
        {READING.map(item => (
          <li key={item.key} className="text-muted">
            <strong className="text-(--color-text)">{t(`read.recalls.read.${item.key}`)}</strong>
            {' - '}
            {pick(item.text, i18n.language)}
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-3 inline-block text-sm text-primary">
        {t('read.recalls.searchLink')} →
      </Link>
    </Section>
  )
}
