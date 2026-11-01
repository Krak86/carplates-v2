import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { isVin } from '@carplates/shared'

import { extractVehicleInfo } from '@/components/VinResult.helpers'
import UaAuctionCheck from '@/components/UaAuctionCheck'
import WantedCheck from '@/components/WantedCheck'
import { auctionLotsQuery, vinQuery, wantedQuery } from '@/lib/queries'

const VinResult = lazy(() => import('@/components/VinResult'))

type Props = {
  plate: string
}

/** First non-empty value of a field across the matched records (newest first), null when none carries it. */
const firstOf = <T,>(values: (T | null | undefined)[]): T | null => values.find(v => !!v) ?? null

/**
 * Shown under a registry 404 for a plate: when the plate is in the wanted lists or a SETAM auction lot, say so and show what
 * those sources hold. With a VIN-shaped VIN in those records the full VIN card follows (registry history of the VIN, decode,
 * the same wanted / auction sections keyed on plate AND VIN); without one the sections open by themselves so the page
 * starts with the data visible. Renders nothing while loading or without a hit. Shares its queries with the sections.
 */
export default function OtherSourcesFound({ plate }: Props): ReactNode {
  const { t } = useTranslation()
  const wanted = useQuery({ ...wantedQuery(plate, null) }).data
  const auctions = useQuery({ ...auctionLotsQuery(plate, null) }).data

  const records = wanted?.records ?? []
  const plates = wanted?.plates ?? []
  const lots = auctions?.lots ?? []
  const inWanted = records.length > 0 || plates.length > 0
  const inAuctions = lots.length > 0

  const vin = firstOf([...records.map(r => r.vin), ...lots.map(l => l.vin)])
  const usableVin = vin && isVin(vin) ? vin : null
  const vinCard = useQuery({ ...vinQuery(usableVin ?? ''), enabled: !!usableVin }).data

  if (!inWanted && !inAuctions) return null

  const brand = firstOf([...records.map(r => r.brand), ...lots.map(l => l.make)])
  const model = firstOf([...records.map(r => r.model), ...lots.map(l => l.model)])
  const year = firstOf(lots.map(l => l.year))
  const color = firstOf(records.map(r => r.color))
  const vehicleType = firstOf(records.map(r => r.vehicleType))
  const vehicle = [brand, model, year].filter(Boolean).join(' ')
  const cardNamesVehicle = !!vinCard && !!extractVehicleInfo(vinCard).brand
  const sources = [inWanted && t('wanted.title'), inAuctions && t('uaAuctions.title')].filter(Boolean).join(', ')

  const facts: [string, ReactNode][] = [
    [t('otherSources.vehicle'), vehicle || null],
    [t('otherSources.type'), vehicleType],
    [t('wanted.color'), color],
    [t('wanted.vin'), !vinCard && vin && <span className="font-mono">{vin}</span>]
  ]

  return (
    <div className="mt-3 space-y-2">
      <p
        role="status"
        className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-300"
      >
        {t('otherSources.banner', { sources })}
      </p>

      {/* The VIN card shows the vehicle itself; the short list is for when there is no card or the decode named no make. */}
      {!cardNamesVehicle && facts.some(([, value]) => !!value) && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {facts.map(([label, value]) =>
            value ? (
              <div key={label} className="contents">
                <dt className="text-[var(--color-muted)]">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ) : null
          )}
        </dl>
      )}

      <p className="text-sm text-[var(--color-muted)]">{t(vinCard ? 'otherSources.noteVin' : 'otherSources.note')}</p>

      {vinCard ? (
        <Suspense fallback={null}>
          <VinResult data={vinCard} searchedPlate={plate} />
        </Suspense>
      ) : (
        <>
          {inWanted && <WantedCheck plate={plate} vin={null} />}

          {inAuctions && <UaAuctionCheck plate={plate} vin={null} startOpen />}
        </>
      )}
    </div>
  )
}
