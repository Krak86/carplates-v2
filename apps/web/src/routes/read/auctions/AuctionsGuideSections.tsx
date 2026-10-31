import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { SETAM_URL } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { auctionStatsQuery } from '@/lib/queries'
import { pick } from '@/routes/read/helpers'
import {
  CHECK_TITLE,
  CHECKS,
  HISTORY,
  HISTORY_INTRO,
  HISTORY_NOTE,
  HISTORY_TITLE,
  LIVE_INTRO,
  LIVE_NOTE,
  LIVE_TITLE,
  LOTS,
  LOTS_INTRO,
  LOTS_TITLE,
  SOURCES,
  SOURCES_NOTE,
  TAKE_INTRO,
  TAKE_NOTE,
  TAKE_STEPS,
  TAKE_TITLE,
  WORLD,
  WORLD_NOTE,
  WORLD_TITLE
} from '@/routes/read/auctions/content'
import type { Fact } from '@/routes/read/auctions/content'

function FactList({ facts }: { facts: Fact[] }): ReactNode {
  const { i18n } = useTranslation()

  return (
    <ul className="mb-3 space-y-3">
      {facts.map(fact => (
        <li key={fact.id}>
          <h3 className="font-medium">{pick(fact.title, i18n.language)}</h3>
          <p className="text-sm">{pick(fact.text, i18n.language)}</p>
        </li>
      ))}
    </ul>
  )
}

/** What a lot is, why one car can have several, and what "sold" means here. */
export function LotsSection(): ReactNode {
  const { i18n } = useTranslation()

  return (
    <Card id="lots" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{pick(LOTS_TITLE, i18n.language)}</h2>
      <p className="mb-3 text-muted">{pick(LOTS_INTRO, i18n.language)}</p>

      <FactList facts={LOTS} />
    </Card>
  )
}

/** Headline figures of our own lot table, from the same endpoint as /auctions. */
export function LiveSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data } = useQuery(auctionStatsQuery())
  const locale = toIntlLocale(i18n.language)
  const summary = data?.summary

  const count = (n: number): string => new Intl.NumberFormat(locale).format(n)
  const cells = summary
    ? [
        { id: 'lots', value: count(summary.lots), label: t('auctions.page.card.lots') },
        { id: 'sold', value: count(summary.sold), label: t('auctions.page.card.sold') },
        { id: 'open', value: count(summary.open), label: t('auctions.page.card.open') },
        {
          id: 'median',
          value: summary.medianSale === null ? '-' : `${count(Math.round(summary.medianSale))} ₴`,
          label: t('auctions.page.card.medianSale')
        }
      ]
    : []

  return (
    <Card id="live" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{pick(LIVE_TITLE, i18n.language)}</h2>
      <p className="mb-3 text-muted">{pick(LIVE_INTRO, i18n.language)}</p>

      {cells.length > 0 && (
        <dl className="mb-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {cells.map(cell => (
            <div key={cell.id} className="rounded-lg bg-(--color-bg) p-3">
              <dd className="text-2xl font-bold tabular-nums">{cell.value}</dd>
              <dt className="text-sm text-muted">{cell.label}</dt>
            </div>
          ))}
        </dl>
      )}

      <p className="mb-2 text-sm text-muted">{pick(LIVE_NOTE, i18n.language)}</p>

      <p className="text-sm">
        <Link to="/auctions" className="text-primary">
          {t('auctions.page.title')} →
        </Link>
      </p>
    </Card>
  )
}

/** The general flow of taking part; no sums or deadlines (they change). */
export function TakeSection(): ReactNode {
  const { i18n } = useTranslation()

  return (
    <Card id="take" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{pick(TAKE_TITLE, i18n.language)}</h2>
      <p className="mb-3 text-muted">{pick(TAKE_INTRO, i18n.language)}</p>

      <FactList facts={TAKE_STEPS} />

      <p className="mb-2 text-sm text-muted">{pick(TAKE_NOTE, i18n.language)}</p>

      <p className="text-sm">
        <a href={SETAM_URL} target="_blank" rel="noopener noreferrer" className="text-primary">
          setam.net.ua ↗
        </a>
      </p>
    </Card>
  )
}

/** US government, UK police and insurance salvage auctions in a few lines. */
export function WorldSection(): ReactNode {
  const { i18n } = useTranslation()

  return (
    <Card id="world" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{pick(WORLD_TITLE, i18n.language)}</h2>

      <FactList facts={WORLD} />

      <p className="text-sm text-muted">{pick(WORLD_NOTE, i18n.language)}</p>
    </Card>
  )
}

/** Auctions from Babylon to the Ukrainian system, with the year of every item. */
export function HistorySection(): ReactNode {
  const { i18n } = useTranslation()

  return (
    <Card id="history" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{pick(HISTORY_TITLE, i18n.language)}</h2>
      <p className="mb-3 text-muted">{pick(HISTORY_INTRO, i18n.language)}</p>

      <ol className="mb-3 space-y-3 border-l-2 border-border pl-4">
        {HISTORY.map(item => (
          <li key={item.when.en}>
            <h3 className="font-mono text-sm font-semibold">{pick(item.when, i18n.language)}</h3>
            <p className="text-sm">{pick(item.text, i18n.language)}</p>
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted">{pick(HISTORY_NOTE, i18n.language)}</p>
    </Card>
  )
}

/** What to check before bidding, with links to the other lookups in the app. */
export function CheckSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="check" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{pick(CHECK_TITLE, i18n.language)}</h2>

      <FactList facts={CHECKS} />

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/" className="text-primary">
          {t('read.imports.searchLink')}
        </Link>
        <Link to="/wanted" className="text-primary">
          {t('nav.wanted')} →
        </Link>
        <Link to="/read/vin" className="text-primary">
          {t('nav.readVin')} →
        </Link>
        <Link to="/read/imports" className="text-primary">
          {t('nav.readImports')} →
        </Link>
      </p>
    </Card>
  )
}

/** Where the dated facts come from. */
export function SourcesSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="sources" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.imports.sourcesTitle')}</h2>

      <ul className="mb-3 space-y-2">
        {SOURCES.map(source => (
          <li key={source.href} className="text-sm">
            <a href={source.href} target="_blank" rel="noopener noreferrer" className="text-primary">
              {pick(source.title, i18n.language)} ↗
            </a>
            <span className="text-muted"> - {pick(source.note, i18n.language)}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">{pick(SOURCES_NOTE, i18n.language)}</p>
    </Card>
  )
}
