import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MAX_YEAR_GAP } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import CO2Badge from '@/components/CO2Badge'
import { similarVehiclesHref } from '@/components/CO2Badge.helpers'
import SectionInfo from '@/components/SectionInfo'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { fuelEconomyQuery, rdwQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  fuel?: string | null
  capacity?: number | null
  /** Registry kind text — picks which Dutch-register kinds the RDW fallback may match. */
  kind?: string | null
}

/**
 * Collapsed "Show emissions" section (same toggle as the safety ratings): the estimate is only fetched once it
 * is opened, and the section is hidden entirely for a car with no make/model/year to match on.
 */
export default function FuelEconomy({ brand, model, year, fuel, capacity, kind }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedEmissions = searchParams.get('section') === 'emissions'
  const [open, setOpen] = useState(() => isSharedEmissions)
  const sectionRef = useRef<HTMLDivElement>(null)
  const hasQuery = !!(brand && model && year)
  const result = useQuery({
    ...fuelEconomyQuery({ make: brand ?? '', model: model ?? '', year: year ?? 0, fuel, capacity }),
    enabled: hasQuery && open
  })

  // EPA / EEA cover little before 2010 and few non-EU models; the Dutch register's CO2 (same query the Specs block uses) fills that gap.
  const noEstimate = result.isSuccess && !result.data?.estimate
  const rdw = useQuery({
    ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: hasQuery && open && noEstimate
  })
  const rdwMatch = rdw.data?.match
  const rdwCo2 = rdwMatch?.specs.co2GKm ?? null

  useEffect(() => {
    if (isSharedEmissions && hasQuery && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedEmissions, hasQuery])

  if (!hasQuery) return null
  const estimate = result.data?.estimate

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="🌿"
        title={t('co2.title')}
        info={<SectionInfo section="emissions" title={t('co2.title')} />}
        actions={<ShareButton section="emissions" label={t('share.button', { section: t('co2.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('co2.show')}
        hideLabel={t('co2.hide')}
      />

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
            {noEstimate && rdw.isPending && <p className="text-sm text-[var(--color-muted)]">…</p>}
            {noEstimate && !rdw.isPending && !rdwCo2 && (
              <p className="text-sm text-[var(--color-muted)]">{t('co2.noData')}</p>
            )}
            {noEstimate && rdwMatch && rdwCo2 && (
              <CO2Badge
                co2GKmMin={rdwCo2.min}
                co2GKmMax={rdwCo2.max}
                scoreGKm={rdwCo2.median}
                l100kmMin={null}
                l100kmMax={null}
                cycle="WLTP / NEDC"
                source="rdw"
                similarHref={similarVehiclesHref(brand ?? '', model ?? '', year ?? 0, MAX_YEAR_GAP)}
                matches={rdwMatch.specs.n}
                modelYear={rdwMatch.specs.year}
                carYear={year}
              />
            )}
            {estimate && (
              <CO2Badge
                co2GKmMin={estimate.co2GKmMin}
                co2GKmMax={estimate.co2GKmMax}
                l100kmMin={estimate.l100kmMin}
                l100kmMax={estimate.l100kmMax}
                evKwh100km={estimate.evKwh100km}
                cycle={estimate.cycle}
                similarHref={similarVehiclesHref(brand ?? '', model ?? '', year ?? 0, MAX_YEAR_GAP)}
                matches={estimate.matches}
                modelYear={estimate.modelYear}
                carYear={year}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
