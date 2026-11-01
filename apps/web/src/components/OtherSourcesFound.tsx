import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { isVin } from '@carplates/shared'

import { extractVehicleInfo } from '@/components/VinResult.helpers'
import UaAuctionCheck from '@/components/UaAuctionCheck'
import WantedCheck from '@/components/WantedCheck'
import WikiHeroImage from '@/components/WikiHeroImage'
import { FUEL_TYPES, MAX_HERO_LOT_PHOTOS, TRANSMISSIONS, knownValue } from '@/components/ua-auctions/helpers'
import { toIntlLocale } from '@/lib/intl'
import { auctionLotsQuery, vinQuery, wantedQuery } from '@/lib/queries'

const VinResult = lazy(() => import('@/components/VinResult'))

type Fact = [label: string, value: ReactNode]

type Props = {
  plate: string
  /** Rows listed first in the facts below the photo (the not-found plate and region), shown alone when no source has the plate. */
  leadFacts?: Fact[]
}

/** First non-empty value of a field across the matched records (newest first), null when none carries it. */
const firstOf = <T,>(values: (T | null | undefined)[]): T | null => values.find(v => !!v) ?? null

function FactList({ facts }: { facts: Fact[] }): ReactNode {
  if (!facts.some(([, value]) => !!value)) return null
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {facts.map(([label, value]) =>
        value ? (
          <div key={label} className="contents">
            <dt className="text-[var(--color-muted)]">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ) : null
      )}
    </dl>
  )
}

/**
 * Shown under a registry 404 for a plate: when the plate is in the wanted lists or a SETAM auction lot, say so and show what
 * those sources hold. With a VIN-shaped VIN in those records the full VIN card follows (registry history of the VIN, decode,
 * the same wanted / auction sections keyed on plate AND VIN); without one the sections open by themselves so the page
 * starts with the data visible. Renders nothing while loading or without a hit. Shares its queries with the sections.
 */
export default function OtherSourcesFound({ plate, leadFacts = [] }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
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

  if (!inWanted && !inAuctions) return <FactList facts={leadFacts} />

  const brand = firstOf([...records.map(r => r.brand), ...lots.map(l => l.make)])
  const model = firstOf([...records.map(r => r.model), ...lots.map(l => l.model)])
  const year = firstOf(lots.map(l => l.year))
  const color = firstOf([...records.map(r => r.color), ...lots.map(l => l.color)])
  const vehicleType = firstOf(records.map(r => r.vehicleType))
  const fuel = firstOf(lots.map(l => l.fuel))
  const knownFuel = knownValue(FUEL_TYPES, fuel)
  const engineCc = firstOf(lots.map(l => l.engineCc))
  const transmission = firstOf(lots.map(l => l.transmission))
  const knownTransmission = knownValue(TRANSMISSIONS, transmission)
  const vehicle = [brand, model, year].filter(Boolean).join(' ')
  const cardNamesVehicle = !!vinCard && !!extractVehicleInfo(vinCard).brand
  const lotPhotos = lots.flatMap(l => l.photos ?? []).slice(0, MAX_HERO_LOT_PHOTOS)
  const sources = [inWanted && t('wanted.title'), inAuctions && t('uaAuctions.title')].filter(Boolean).join(', ')

  // The VIN card shows the vehicle itself; its name and type are listed only when there is no card or the decode named no make.
  const facts: [string, ReactNode][] = [
    ...leadFacts,
    ...(cardNamesVehicle
      ? []
      : ([
          [t('otherSources.vehicle'), vehicle || null],
          [t('otherSources.type'), vehicleType]
        ] as [string, ReactNode][])),
    [t('wanted.color'), color],
    [t('field.fuel'), knownFuel ? t(`uaAuctions.fuel.${knownFuel}`) : fuel],
    [t('uaAuctions.specs.engine'), engineCc && `${engineCc.toLocaleString(locale)} ${t('uaAuctions.specs.cc')}`],
    [
      t('uaAuctions.specs.transmission'),
      knownTransmission ? t(`uaAuctions.transmission.${knownTransmission}`) : transmission
    ],
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

      {/* Same hero slot as a registry hit: the lots' own photos, then the model photo (nothing when neither exists). */}
      <WikiHeroImage
        brand={brand}
        model={model}
        year={year}
        rawKind={vehicleType}
        vehicleKey={usableVin ?? plate}
        lotPhotos={lotPhotos}
      />

      <FactList facts={facts} />

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
