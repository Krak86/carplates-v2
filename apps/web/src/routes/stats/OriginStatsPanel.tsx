import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Flag from '@/components/Flag'
import SectionInfo from '@/components/SectionInfo'
import Card from '@/components/ui/Card'
import { countryLabel } from '@/components/vin/helpers'
import { toIntlLocale } from '@/lib/intl'
import { originStatsQuery } from '@/lib/queries'
import { originBars } from '@/routes/stats/OriginStatsPanel.helpers'
import type { OriginBars } from '@/routes/stats/OriginStatsPanel.helpers'

type BoardProps = {
  title: string
  bars: OriginBars
}

function OriginBoard({ title, bars }: BoardProps): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const percentFormat = new Intl.NumberFormat(toIntlLocale(i18n.language), {
    style: 'percent',
    maximumFractionDigits: 1
  })

  return (
    <section>
      <h3 className="mb-2 text-base font-semibold">{title}</h3>

      <ol className="space-y-1.5 text-sm">
        {bars.bars.map(b => (
          <li key={b.country}>
            <div className="flex items-center gap-2">
              <Flag code={b.country} />

              <span className="min-w-0 flex-1 truncate">{countryLabel(b.country, i18n.language, t)}</span>

              <span className="font-medium whitespace-nowrap tabular-nums">{numberFormat.format(b.n)}</span>

              <span className="w-12 text-right text-xs text-[var(--color-muted)] tabular-nums">
                {percentFormat.format(b.share)}
              </span>
            </div>

            <div className="mt-0.5 h-1.5 rounded-full bg-[var(--color-border)]/40" aria-hidden>
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${bars.maxShare > 0 ? (b.share / bars.maxShare) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {bars.other > 0 && `${t('stats.origin.other')}: ${numberFormat.format(bars.other)}. `}
        {bars.unknown > 0 && `${t('stats.origin.unknown')}: ${numberFormat.format(bars.unknown)}.`}
      </p>
    </section>
  )
}

/**
 * Passenger cars in Ukraine by the brand's home country and by the country the VIN says they were assembled in (former
 * states by model year, e.g. a 1985 Skoda is Czechoslovakia). Online-only, so not in `lib/offline-cache.ts`; renders nothing
 * before the rollup is built (`db:refresh-origin-stats`).
 */
export default function OriginStatsPanel(): ReactNode {
  const { t } = useTranslation()
  const { data } = useQuery(originStatsQuery())
  if (!data || data.total === 0) return null

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t('stats.origin.title')}</h2>

        <SectionInfo section="statsOrigin" title={t('stats.origin.title')} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <OriginBoard title={t('stats.origin.brand')} bars={originBars(data.byBrand, data.total)} />

        <OriginBoard title={t('stats.origin.plant')} bars={originBars(data.byPlant, data.total)} />
      </div>
    </Card>
  )
}
