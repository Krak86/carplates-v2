import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { mmToMetres, sizeClass } from '@/components/size/VehicleSize.helpers'
import Skeleton from '@/components/ui/Skeleton'
import { displayBrand } from '@/lib/display-brand'
import { generationGrowthQuery } from '@/lib/queries'
import ExamplePlates from '@/routes/read/ExamplePlates'
import {
  barPercent,
  generationName,
  generationYears,
  growthSummary,
  hasSize,
  mmToCm
} from '@/routes/read/generations/helpers'
import { displayModel, formatCount, pick, type ModelProfile } from '@/routes/read/helpers'
import { readHref } from '@/routes/read/links'
import type { L10n } from '@/routes/read/types'

type Props = {
  brand: string
  model: string
  note: L10n
  /** The model in the size rollup (fleet count, usual shape); undefined when the data does not hold it. */
  profile?: ModelProfile
}

/** One model across its generations: a length bar per generation, width, wheelbase and the total growth. */
export default function GrowthCard({ brand, model, note, profile }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending } = useQuery(generationGrowthQuery(brand, model))

  if (isPending) return <Skeleton className="h-48 w-full rounded-lg" />

  const generations = (data?.match?.generations ?? []).filter(hasSize)
  // One generation is no history: nothing to compare.
  if (generations.length < 2) return null

  const maxLength = Math.max(0, ...generations.map(g => g.lengthMm ?? 0))
  const growth = growthSummary(generations)
  const shape = profile?.shape ?? 'car'
  const classFrom = growth ? sizeClass(growth.from.lengthMm ?? 0, shape) : null
  const classTo = growth ? sizeClass(growth.to.lengthMm ?? 0, shape) : null
  const searchParams = new URLSearchParams({ brand, model })

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-lg font-semibold">
          {displayBrand(brand)} {displayModel(model)}
        </h3>
        {profile && (
          <span className="text-sm text-muted">
            {t('read.inUa', { n: formatCount(profile.model.n, i18n.language) })}
          </span>
        )}
      </header>

      <p className="text-sm text-muted">{pick(note, i18n.language)}</p>

      {growth && (
        <p className="font-medium">
          {t('read.gen.grew', {
            cm: mmToCm(growth.lengthDeltaMm),
            pct: growth.lengthPct,
            from: generationName(growth.from),
            to: generationName(growth.to)
          })}
          {growth.wheelbaseDeltaMm != null && growth.wheelbaseDeltaMm > 0 && (
            <span className="font-normal text-muted">
              {' · '}
              {t('read.gen.wheelbaseGrew', { cm: mmToCm(growth.wheelbaseDeltaMm) })}
            </span>
          )}
          {classFrom && classTo && classFrom.cls !== classTo.cls && (
            <span className="font-normal text-muted">
              {' · '}
              {t('read.gen.classMove', { from: classFrom.cls, to: classTo.cls })}
            </span>
          )}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-96 text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th scope="col" className="py-1 pr-2 font-normal">
                {t('read.gen.colGeneration')}
              </th>
              <th scope="col" className="w-2/5 py-1 pr-2 font-normal">
                {t('read.gen.colLength')}
              </th>
              <th scope="col" className="py-1 pr-2 text-right font-normal">
                {t('read.gen.colWidth')}
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                {t('read.gen.colWheelbase')}
              </th>
            </tr>
          </thead>

          <tbody>
            {generations.map(g => (
              <tr key={g.yearFrom} className="border-t border-border">
                <th scope="row" className="py-1.5 pr-2 text-left font-medium">
                  {generationName(g)}
                  <span className="block text-xs font-normal text-muted">{generationYears(g)}</span>
                </th>

                <td className="py-1.5 pr-2">
                  {g.lengthMm ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 rounded-full bg-(--color-bg)" aria-hidden>
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${barPercent(g.lengthMm, maxLength)}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right tabular-nums">{mmToMetres(g.lengthMm)}</span>
                    </div>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>

                <td className="py-1.5 pr-2 text-right tabular-nums">{g.widthMm ? mmToMetres(g.widthMm) : '-'}</td>
                <td className="py-1.5 text-right tabular-nums">{g.wheelbaseMm ? mmToMetres(g.wheelbaseMm) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <ExamplePlates brand={brand} model={model} />
        <Link to={readHref.sizes({ shape: profile?.shape, brand, model })} className="text-sm text-primary">
          {t('read.gen.explorer')} →
        </Link>
        <Link to={`/advanced-search?${searchParams.toString()}`} className="text-sm text-primary">
          {t('read.search')} →
        </Link>
      </div>
    </article>
  )
}
