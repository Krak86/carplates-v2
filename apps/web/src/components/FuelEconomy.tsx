import { useState } from 'react'
import type { ReactNode } from 'react'
import { MAX_YEAR_GAP } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import CO2Badge from '@/components/CO2Badge'
import { similarVehiclesHref } from '@/components/CO2Badge.helpers'
import { cn } from '@/lib/cn'
import { fuelEconomyQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  fuel?: string | null
  capacity?: number | null
}

/**
 * Collapsed "Show emissions" section (same toggle as the safety ratings): the estimate is only fetched once it
 * is opened, and the section is hidden entirely for a car with no make/model/year to match on.
 */
export default function FuelEconomy({ brand, model, year, fuel, capacity }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasQuery = !!(brand && model && year)
  const result = useQuery({
    ...fuelEconomyQuery({ make: brand ?? '', model: model ?? '', year: year ?? 0, fuel, capacity }),
    enabled: hasQuery && open
  })

  if (!hasQuery) return null
  const estimate = result.data?.estimate

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <div className="flex items-center justify-between text-base">
        <span className="flex items-center gap-1.5 text-base font-semibold">{t('co2.title')}</span>

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-[var(--color-primary)]"
        >
          <span aria-hidden className="no-underline">
            🌿
          </span>
          <span className="underline group-hover:no-underline">{open ? t('co2.hide') : t('co2.show')}</span>
          <span
            aria-hidden
            className={cn('inline-block no-underline transition-transform duration-200', open && 'rotate-180')}
          >
            ▾
          </span>
        </button>
      </div>

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2">
            {result.isPending && open && <p className="text-sm text-[var(--color-muted)]">…</p>}
            {result.isSuccess && !estimate && <p className="text-sm text-[var(--color-muted)]">{t('co2.noData')}</p>}
            {estimate && (
              <CO2Badge
                co2GKmMin={estimate.co2GKmMin}
                co2GKmMax={estimate.co2GKmMax}
                l100kmMin={estimate.l100kmMin}
                l100kmMax={estimate.l100kmMax}
                evKwh100km={estimate.evKwh100km}
                cycle={estimate.cycle}
                similarHref={similarVehiclesHref(brand ?? '', model ?? '', year ?? 0, MAX_YEAR_GAP)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
