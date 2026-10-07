import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { PAID_FEATURE_ICON } from '@/lib/paid-features'
import { adminAnalyticsQuery, adminStatsQuery } from '@/lib/queries'

type TileProps = { label: string; value: number | null }

function Tile({ label, value }: TileProps): ReactNode {
  return (
    <Card>
      <div className="text-2xl font-bold tabular-nums">{value === null ? '—' : value.toLocaleString()}</div>
      <div className="text-sm text-[var(--color-muted)]">{label}</div>
    </Card>
  )
}

export default function AdminStatsTab(): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(adminStatsQuery())
  const analytics = useQuery(adminAnalyticsQuery())

  if (stats.isPending) return <Spinner />
  if (stats.isError) return <p className="text-red-600">{t('result.error')}</p>

  const { totals, windows, daily, languages, featureOptIns } = stats.data
  const maxDaily = Math.max(1, ...daily.map(d => d.searches))
  const a = analytics.data

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={t('admin.stats.users')} value={totals.users} />
        <Tile label={t('admin.stats.newUsers7d')} value={totals.newUsers7d} />
        <Tile label={t('admin.stats.activeUsers7d')} value={totals.activeUsers7d} />
        <Tile label={t('admin.stats.favorites')} value={totals.favorites} />
      </section>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
            <tr>
              <th className="p-3 font-medium">{t('admin.stats.event')}</th>
              <th className="p-3 text-right font-medium">{t('admin.stats.d1')}</th>
              <th className="p-3 text-right font-medium">{t('admin.stats.d7')}</th>
              <th className="p-3 text-right font-medium">{t('admin.stats.d30')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] tabular-nums">
            {windows.map(w => (
              <tr key={w.kind}>
                <td className="p-3">{t(`admin.stats.kind.${w.kind}`)}</td>
                <td className="p-3 text-right">{w.d1.toLocaleString()}</td>
                <td className="p-3 text-right">{w.d7.toLocaleString()}</td>
                <td className="p-3 text-right">{w.d30.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t('admin.stats.daily')}</h2>
        <div className="flex h-32 items-end gap-0.5" role="img" aria-label={t('admin.stats.daily')}>
          {daily.map(d => (
            <div
              key={d.day}
              title={`${d.day}: ${d.searches} (${d.notFound} ${t('admin.stats.notFound')})`}
              className="flex-1 rounded-t bg-[var(--color-primary)]/70"
              style={{ height: `${Math.max(2, (d.searches / maxDaily) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-[var(--color-muted)]">
          <span>{daily[0]?.day}</span>
          <span>{daily.at(-1)?.day}</span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">{t('admin.stats.languages')}</h2>
          {languages.length === 0 && <p className="text-sm text-[var(--color-muted)]">—</p>}
          {languages.map(l => (
            <div key={l.lang} className="flex justify-between text-sm tabular-nums">
              <span>{l.lang}</span>
              <span>{l.count.toLocaleString()}</span>
            </div>
          ))}
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">{t('admin.stats.optIns')}</h2>
          {featureOptIns.map(f => (
            <div key={f.feature} className="flex justify-between text-sm tabular-nums">
              <span>
                <span aria-hidden>{PAID_FEATURE_ICON[f.feature]}</span> {t(`paid.${f.feature}.title`)}
              </span>
              <span>{f.users}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">{t('admin.stats.posthog')}</h2>
        {analytics.isPending && <Spinner />}
        {a && !a.configured && <p className="text-sm text-[var(--color-muted)]">{t('admin.stats.posthogOff')}</p>}
        {a?.error && <p className="text-sm text-red-600">{a.error}</p>}
        {a?.configured && !a.error && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label={t('admin.stats.visitors7d')} value={a.visitors7d} />
            <Tile label={t('admin.stats.pageviews7d')} value={a.pageviews7d} />
            <Tile label={t('admin.stats.visitors30d')} value={a.visitors30d} />
            <Tile label={t('admin.stats.pageviews30d')} value={a.pageviews30d} />
          </div>
        )}
        {a && a.topPaths.length > 0 && (
          <div className="mt-3 text-sm">
            {a.topPaths.map(p => (
              <div key={p.path} className="flex justify-between gap-3 tabular-nums">
                <span className="truncate">{p.path}</span>
                <span>{p.views}</span>
              </div>
            ))}
          </div>
        )}
        {a && (
          <div className="mt-4 flex flex-wrap gap-2">
            {a.links.map(l => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)]"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
