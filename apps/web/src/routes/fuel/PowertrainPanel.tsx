import type { ReactNode } from 'react'
import type { PowertrainClass } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import Card from '@/components/ui/Card'
import { powertrainStatsQuery } from '@/lib/queries'
import { parseFuelClass, parsePowertrainView } from '@/routes/fuel/helpers'
import type { PowertrainView } from '@/routes/fuel/helpers'
import PowertrainDetail from '@/routes/fuel/PowertrainDetail'
import PowertrainSkeleton from '@/routes/fuel/PowertrainSkeleton'
import PowertrainTable from '@/routes/fuel/PowertrainTable'

/** Electric / hybrid / gas / … breakdown of the passenger-car fleet — a table plus a drill-down per fuel class. */
export default function PowertrainPanel(): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(powertrainStatsQuery())
  const [searchParams, setSearchParams] = useSearchParams()
  const picked = parseFuelClass(searchParams.get('pt'))
  const view = parsePowertrainView(searchParams.get('ptView'))

  // Each pick is a history entry, so Back returns to the previously selected fuel class / view.
  const updateParams = (change: (params: URLSearchParams) => void): void => {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        change(params)
        return params
      },
      { preventScrollReset: true }
    )
  }
  const handleSelect = (fuelClass: PowertrainClass['fuelClass']): void => {
    updateParams(params => {
      params.set('pt', fuelClass)
      params.delete('ptView')
    })
  }
  const handleViewChange = (next: PowertrainView): void => {
    updateParams(params => params.set('ptView', next))
  }

  // Skeleton while loading (not while offline-paused), so the panel does not pop in and push the content below it down.
  if (stats.isPending && stats.fetchStatus !== 'paused') return <PowertrainSkeleton />

  const data = stats.data
  if (!data || data.classes.length === 0) return null

  // Default to electric (the headline case), else the largest class.
  const current =
    data.classes.find(c => c.fuelClass === picked) ??
    data.classes.find(c => c.fuelClass === 'electric') ??
    data.classes[0]!

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-base font-semibold">{t('fuel.pt.title')}</h2>
      <p className="mb-3 text-xs text-[var(--color-muted)]">{t('fuel.pt.note')}</p>

      <PowertrainTable classes={data.classes} selected={current.fuelClass} onSelect={handleSelect} />

      <div className="mt-5">
        <PowertrainDetail data={current} rareMinCars={data.rareMinCars} view={view} onViewChange={handleViewChange} />
      </div>
    </Card>
  )
}
