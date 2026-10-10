import type { ReactNode } from 'react'
import type { PowertrainClass } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { bandForCo2, formatPercent } from '@/routes/fuel/helpers'

type Props = {
  classes: PowertrainClass[]
  selected: string
  onSelect: (fuelClass: PowertrainClass['fuelClass']) => void
}

/** One row per fuel class (largest first): count, share of the fleet, variety, top model and average CO₂. */
export default function PowertrainTable({ classes, selected, onSelect }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const maxShare = Math.max(...classes.map(c => c.share), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)] uppercase">
            <th className="py-1.5 pr-2 font-medium">{t('fuel.pt.col.fuel')}</th>
            <th className="px-2 text-right font-medium">{t('fuel.pt.col.cars')}</th>
            <th className="px-2 font-medium">{t('fuel.pt.col.share')}</th>
            <th className="px-2 text-right font-medium">{t('fuel.pt.col.models')}</th>
            <th className="px-2 text-right font-medium">{t('fuel.pt.col.brands')}</th>
            <th className="px-2 font-medium">{t('fuel.pt.col.topModel')}</th>
            <th className="px-2 text-right font-medium">{t('fuel.pt.col.co2')}</th>
          </tr>
        </thead>
        <tbody>
          {classes.map(c => (
            <tr
              key={c.fuelClass}
              onClick={() => onSelect(c.fuelClass)}
              className={cn(
                'cursor-pointer border-b border-[var(--color-border)]/50 transition-colors hover:bg-[var(--color-bg)]',
                c.fuelClass === selected && 'bg-[var(--color-bg)] font-medium'
              )}
            >
              <td className="py-1.5 pr-2">
                <button type="button" onClick={() => onSelect(c.fuelClass)} className="text-left">
                  {t(`fuel.fuelClass.${c.fuelClass}`)}
                </button>
              </td>
              <td className="px-2 text-right tabular-nums">{numberFormat.format(c.n)}</td>
              <td className="px-2">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-16 overflow-hidden rounded-full bg-[var(--color-border)]/40">
                    <span
                      className="block h-full rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${(c.share / maxShare) * 100}%` }}
                    />
                  </span>
                  <span className="tabular-nums">{formatPercent(c.share)}</span>
                </span>
              </td>
              <td className="px-2 text-right tabular-nums">{numberFormat.format(c.models)}</td>
              <td className="px-2 text-right tabular-nums">{numberFormat.format(c.brands)}</td>
              <td className="max-w-[12rem] truncate px-2">
                {c.topModel ? `${c.topModel.brand} ${c.topModel.model}` : '—'}
              </td>
              <td
                className="px-2 text-right tabular-nums"
                style={c.avgCo2 != null ? { color: CO2_BAND_COLOR[bandForCo2(c.avgCo2)] } : undefined}
              >
                {c.avgCo2 != null ? Math.round(c.avgCo2) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
