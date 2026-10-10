import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { PowertrainClass } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import BrandLogo from '@/components/BrandLogo'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { POWERTRAIN_VIEWS, formatPercent, searchFuelFor } from '@/routes/fuel/helpers'
import type { PowertrainView } from '@/routes/fuel/helpers'
import { useCrossfade } from '@/routes/fuel/use-crossfade'
import PowertrainYearTrend from '@/routes/fuel/PowertrainYearTrend'

const COLLAPSED_ROWS = 10

type Props = {
  data: PowertrainClass
  rareMinCars: number
  view: PowertrainView
  onViewChange: (view: PowertrainView) => void
}

type Row = {
  key: string
  brand: string
  model?: string
  n: number
  classShare: number
  ownShare: number
}

function modelRows(models: PowertrainClass['topModels']): Row[] {
  return models.map(m => ({
    key: `${m.brand}|${m.model}`,
    brand: m.brand,
    model: m.model,
    n: m.n,
    classShare: m.classShare,
    ownShare: m.modelShare
  }))
}

function rowsFor(view: PowertrainView, data: PowertrainClass): Row[] {
  if (view === 'models') return modelRows(data.topModels)
  if (view === 'rare') return modelRows(data.rareModels)
  if (view === 'brands') {
    return data.topBrands.map(b => ({
      key: b.brand,
      brand: b.brand,
      n: b.n,
      classShare: b.classShare,
      ownShare: b.brandShare
    }))
  }
  return []
}

/** Advanced-search query for a row: its brand (and model), narrowed to the fuel class when the filter knows it. */
function searchQuery(row: Row, fuelClass: PowertrainClass['fuelClass']): string {
  const params = new URLSearchParams({ brand: row.brand })
  if (row.model) params.set('model', row.model)
  const fuel = searchFuelFor(fuelClass)
  if (fuel) params.set('fuel', fuel)
  return params.toString()
}

/** Ranked list for one fuel class: top models, top brands, rare models or the model-year trend. */
export default function PowertrainDetail({ data, rareMinCars, view, onViewChange }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  // The content cross-fades: the old list fades out, then the new one mounts and its rows stagger in.
  const target = useMemo(() => ({ view, data }), [view, data])
  const { shown, leaving } = useCrossfade(target)
  const contentKey = `${shown.data.fuelClass}|${shown.view}`
  const expanded = expandedKey === contentKey

  const rows = rowsFor(shown.view, shown.data)
  const canExpand = rows.length > COLLAPSED_ROWS
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS)
  const ownHeader = shown.view === 'brands' ? t('fuel.pt.brandShare') : t('fuel.pt.modelShare')

  const handleViewChange = (next: PowertrainView): void => {
    onViewChange(next)
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <h3 className="mr-2 text-base font-semibold">{t(`fuel.fuelClass.${shown.data.fuelClass}`)}</h3>
        {POWERTRAIN_VIEWS.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => handleViewChange(v)}
            className={cn(
              'rounded-md border px-2.5 py-0.5 text-xs transition-colors duration-200',
              v === view
                ? 'border-transparent bg-[var(--color-bg)] font-medium shadow-sm'
                : 'border-[var(--color-border)]/50 text-[var(--color-muted)] hover:text-[var(--color-fg)]'
            )}
          >
            {t(`fuel.pt.view.${v}`)}
          </button>
        ))}
      </div>

      <div
        key={contentKey}
        className={cn('transition-opacity duration-150', leaving ? 'opacity-0' : 'animate-fade-in')}
      >
        {shown.view === 'rare' && (
          <p className="mb-2 text-xs text-[var(--color-muted)]">{t('fuel.pt.rareNote', { count: rareMinCars })}</p>
        )}

        {shown.view === 'years' ? (
          <PowertrainYearTrend data={shown.data} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{t('fuel.pt.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-muted)] uppercase">
                <th className="w-8 py-1 text-right font-medium">#</th>
                <th className="px-2 text-left font-medium" />
                <th className="px-2 text-right font-medium">{t('fuel.pt.col.cars')}</th>
                <th className="px-2 text-right font-medium">{t('fuel.pt.classShare')}</th>
                <th className="px-2 text-right font-medium">{ownHeader}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr
                  key={r.key}
                  className="animate-row-in border-b border-[var(--color-border)]/40"
                  style={{ '--row-i': i % COLLAPSED_ROWS } as CSSProperties}
                >
                  <td className="py-1 text-right text-[var(--color-muted)] tabular-nums">{i + 1}</td>
                  <td className="px-2">
                    <span className="flex items-center gap-2">
                      <BrandLogo brand={r.brand} size="sm" placeholder />
                      <Link
                        viewTransition
                        to={`/advanced-search?${searchQuery(r, shown.data.fuelClass)}`}
                        className="min-w-0 truncate text-[var(--color-primary)]"
                      >
                        {r.model ? `${r.brand} ${r.model}` : r.brand}
                      </Link>
                    </span>
                  </td>
                  <td className="px-2 text-right tabular-nums">{numberFormat.format(r.n)}</td>
                  <td className="px-2 text-right tabular-nums">{formatPercent(r.classShare)}</td>
                  <td className="px-2 text-right tabular-nums">{formatPercent(r.ownShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {shown.view !== 'years' && canExpand && (
          <button
            type="button"
            onClick={() => setExpandedKey(expanded ? null : contentKey)}
            className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
          >
            {expanded ? t('fuel.showLess', { count: COLLAPSED_ROWS }) : t('fuel.showMore', { count: rows.length })}
          </button>
        )}
      </div>
    </section>
  )
}
