import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { VdbStatsModel } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import Card from '@/components/ui/Card'
import { isoFlag } from '@/components/vin/helpers'
import { decileBand, MAX_FLAGS } from '@/components/VdbChips.helpers'
import { toIntlLocale } from '@/lib/intl'
import { vdbStatsQuery } from '@/lib/queries'

function ModelList({ titleKey, icon, rows }: { titleKey: string; icon: string; rows: VdbStatsModel[] }): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)] uppercase">
        <span aria-hidden>{icon}</span> {t(titleKey)}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('stats.noRows')}</p>
      ) : (
        <ol className="space-y-1">
          {rows.map(row => (
            <li key={`${row.make}|${row.model}`} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {row.make} {row.model}
                <span aria-hidden className="ml-1.5 text-xs">
                  {row.countries
                    .filter(c => c !== 'ua')
                    .slice(0, MAX_FLAGS)
                    .map(isoFlag)
                    .join(' ')}
                </span>
              </span>
              <span className="shrink-0 text-[var(--color-muted)] tabular-nums">{numberFormat.format(row.n)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/**
 * "Markets" panel on /stats, from the VehiclesDB catalog: how the registry's passenger cars spread over the catalog's
 * cross-market popularity deciles, plus the models that are common here but rare elsewhere and the UA-only ones.
 * Online-only (not in the offline cache); renders nothing while loading, on error, or before the rollup is built.
 */
export default function VdbStatsPanel(): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const { data } = useQuery(vdbStatsQuery())
  if (!data || data.total === 0) return null

  const max = Math.max(...data.byDecile.map(d => d.n), 1)
  const pct = (n: number, of: number): string => `${of > 0 ? Math.round((n / of) * 100) : 0}%`

  return (
    <Card className="mb-6">
      <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
        <span aria-hidden>🌍</span>
        {t('stats.vdb.title')}
        <InfoPopover label={t('vin.info.about', { field: t('stats.vdb.title') })} title={t('stats.vdb.title')}>
          <InfoText text={t('stats.vdb.info')} />
        </InfoPopover>
      </div>
      <p className="mb-3 text-sm text-[var(--color-muted)]">
        {t('stats.vdb.coverage', {
          matched: pct(data.matched, data.total),
          uaOnly: numberFormat.format(data.uaOnly)
        })}
      </p>

      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold text-[var(--color-muted)] uppercase">{t('stats.vdb.byDecile')}</div>
        <ul className="space-y-1">
          {data.byDecile.map(row => (
            <li key={row.decile} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm">
              <span className="whitespace-nowrap">{t('stats.vdb.band', { band: decileBand(row.decile) })}</span>
              <span className="h-3 overflow-hidden rounded-full bg-[var(--color-border)]/40">
                <span
                  className="block h-full rounded-full bg-[var(--color-primary)]"
                  style={{ width: `${(row.n / max) * 100}%` }}
                />
              </span>
              <span className="text-right whitespace-nowrap tabular-nums">
                {pct(row.n, data.ranked)}{' '}
                <span className="text-xs text-[var(--color-muted)]">{numberFormat.format(row.n)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModelList titleKey="stats.vdb.rare" icon="💎" rows={data.rareElsewhere} />
        <ModelList titleKey="stats.vdb.uaOnly" icon="🇺🇦" rows={data.uaOnlyModels} />
      </div>
    </Card>
  )
}
