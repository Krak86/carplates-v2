import { useState } from 'react'
import type { ReactNode } from 'react'
import type { SafetyStatsModel } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import { toIntlLocale } from '@/lib/intl'
import { bandForScore } from '@/routes/safety/helpers'

// Collapsed default, same as the fuel page's leaderboards; the API already sends the full list.
const DEFAULT_VISIBLE_N = 5

type Props = {
  title: string
  models: SafetyStatsModel[]
}

/** A short ranked list of models (safest or least safe) — each links to an advanced search for that make and model. */
export default function SafetyModelList({ title, models }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const [expanded, setExpanded] = useState(false)
  const canExpand = models.length > DEFAULT_VISIBLE_N
  const visible = expanded ? models : models.slice(0, DEFAULT_VISIBLE_N)

  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <ol className="space-y-1 text-sm">
        {visible.map((m, i) => (
          <li key={`${m.brand}-${m.model}`} className="flex items-center gap-2">
            <span className="w-5 text-right text-[var(--color-muted)] tabular-nums">{i + 1}</span>
            <BrandLogo brand={m.brand} size="sm" />
            <Link
              to={`/advanced-search?${new URLSearchParams({ brand: m.brand, model: m.model })}`}
              className="min-w-0 flex-1 truncate text-[var(--color-primary)]"
            >
              {m.brand} {m.model}
            </Link>
            <span
              className="font-medium whitespace-nowrap tabular-nums"
              style={{ color: CO2_BAND_COLOR[bandForScore(m.avgScore)] }}
            >
              {Math.round(m.avgScore)}
              <span className="text-xs font-normal text-[var(--color-muted)]">
                {' '}
                · {t('safety.sourcesShort', { count: m.sources })}
              </span>
            </span>
            <span className="hidden text-xs whitespace-nowrap text-[var(--color-muted)] sm:inline">
              {t('fuel.cars', { count: numberFormat.format(m.n) })}
            </span>
          </li>
        ))}
      </ol>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
        >
          {expanded ? t('fuel.showLess', { count: DEFAULT_VISIBLE_N }) : t('fuel.showMore', { count: models.length })}
        </button>
      )}
    </section>
  )
}
