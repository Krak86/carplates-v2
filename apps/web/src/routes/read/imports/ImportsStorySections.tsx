import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { pick } from '@/routes/read/helpers'
import {
  APP_INTRO,
  HISTORY,
  HISTORY_INTRO,
  HISTORY_NOTE,
  MARKET_FACTS,
  MARKET_INTRO,
  MARKET_NOTE,
  MARKET_OFFICES,
  MARKET_ORIGINS,
  SOURCES,
  SOURCES_NOTE,
  WHY,
  WHY_INTRO,
  WHY_NOTE
} from '@/routes/read/imports/story'

/** Used-car imports in the world and in Ukraine, 1900s to 2024, with the year of every figure. */
export function HistorySection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="history" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.imports.historyTitle')}</h2>
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

/** Why people buy cars abroad: price, no loans, an older fleet, the war, a squeeze in Europe, customs value. */
export function WhySection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="why" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.imports.whyTitle')}</h2>
      <p className="mb-3 text-muted">{pick(WHY_INTRO, i18n.language)}</p>

      <ul className="mb-3 space-y-3">
        {WHY.map(reason => (
          <li key={reason.id}>
            <h3 className="font-medium">{pick(reason.title, i18n.language)}</h3>
            <p className="text-sm">{pick(reason.text, i18n.language)}</p>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">{pick(WHY_NOTE, i18n.language)}</p>
    </Card>
  )
}

/** The 2023 customs picture: where imports came from, through which offices. */
export function MarketSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="market" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.imports.marketTitle')}</h2>
      <p className="mb-3 text-muted">{pick(MARKET_INTRO, i18n.language)}</p>

      <dl className="mb-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {MARKET_FACTS.map(fact => (
          <div key={fact.id} className="rounded-lg bg-(--color-bg) p-3">
            <dd className="text-2xl font-bold tabular-nums">{pick(fact.value, i18n.language)}</dd>
            <dt className="text-sm text-muted">{pick(fact.label, i18n.language)}</dt>
          </div>
        ))}
      </dl>

      <p className="mb-2 text-sm">{pick(MARKET_ORIGINS, i18n.language)}</p>
      <p className="mb-2 text-sm">{pick(MARKET_OFFICES, i18n.language)}</p>
      <p className="text-sm text-muted">{pick(MARKET_NOTE, i18n.language)}</p>
    </Card>
  )
}

/** Where the figures of the history, why and market sections come from. */
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

/** How to look an imported car up in this app, with a pointer to the VIN guide. */
export function AppSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="app" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.imports.appTitle')}</h2>
      <p className="mb-3 text-muted">{pick(APP_INTRO, i18n.language)}</p>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/" className="text-primary">
          {t('read.imports.searchLink')}
        </Link>
        <Link to="/read/vin" className="text-primary">
          {t('nav.readVin')} →
        </Link>
      </p>
    </Card>
  )
}
