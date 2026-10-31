import { lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  countOwners,
  fallbackVehicleColor,
  regionName,
  resolveVehicleColor,
  resolveVehicleKind,
  VEHICLE_COLOR_HEX
} from '@carplates/shared'
import type { VinDecodeResponse } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import CatalogModelChip from '@/components/catalog/CatalogModelChip'
import CompareChip from '@/components/compare/CompareChip'
import CardTiltToggle from '@/components/CardTiltToggle'
import RaceGameButton from '@/components/game/RaceGameButton'
import CarWikiInfo from '@/components/CarWikiInfo'
import CopyAllInfoButton from '@/components/CopyAllInfoButton'
import FavoriteButton from '@/components/FavoriteButton'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import SafetyRatings from '@/components/SafetyRatings'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'
import Card from '@/components/ui/Card'
import { extractVehicleInfo } from '@/components/VinResult.helpers'
import VinBarcode from '@/components/vin/VinBarcode'
import VinRegistryHistory from '@/components/vin/VinRegistryHistory'
import VinDecodeTabs from '@/components/vin/VinDecodeTabs'
import VinTypicalData from '@/components/vin/VinTypicalData'
import LazySection from '@/components/LazySection'
import OriginChip from '@/components/OriginChip'
import UaAuctionChip from '@/components/ua-auctions/UaAuctionChip'
import SteeringChip from '@/components/SteeringChip'
import { useCardMotion } from '@/hooks/useCardMotion'
import { ukraineFromActions } from '@/components/OriginSection.helpers'
import { countryIso, toFieldMap } from '@/components/vin/helpers'
import { hasImportOperation } from '@/lib/auction-sites'
import { useUiStore } from '@/store/ui-store'

const AuctionCheck = lazy(() => import('@/components/AuctionCheck'))
const OriginSection = lazy(() => import('@/components/OriginSection'))
const WantedCheck = lazy(() => import('@/components/WantedCheck'))
const UaAuctionCheck = lazy(() => import('@/components/UaAuctionCheck'))

type Props = {
  data: VinDecodeResponse
  /** Plate the visitor searched when this VIN was reached through another source (the registry has no row for it). */
  searchedPlate?: string | null
  /** Starts the auctions section expanded, without scrolling to it (the first view stays at the top). */
  openAuctions?: boolean
}

export default function VinResult({ data, searchedPlate = null, openAuctions = false }: Props): ReactNode {
  const { t } = useTranslation()
  const registry = data.registry
  const vehicle = extractVehicleInfo(data)
  const fields = toFieldMap(data.results)
  const vehicleColor = resolveVehicleColor(registry?.actions[0]?.color) ?? fallbackVehicleColor(data.vin)
  const plate = registry?.plate ?? null
  const region = plate ? (regionName(plate) ?? null) : null
  // The origin chip opens the "Where it comes from" section (mounting it first if it is still lazy).
  const [originOpenSignal, setOriginOpenSignal] = useState(0)
  const [uaAuctionOpenSignal, setUaAuctionOpenSignal] = useState(0)
  // Wanted / auction lookups use the plate too (Garpun lists plates only, lots may name only the plate); the searched one wins.
  const sourcePlate = searchedPlate ?? plate
  const tiltEnabled = useUiStore(s => s.cardTiltEnabled)
  const glowRef = useCardMotion<HTMLDivElement>(tiltEnabled)
  useCarHeroImageActions({ brand: vehicle.brand, model: vehicle.model, year: vehicle.year, key: data.vin })

  return (
    <div className="card-vt relative w-full max-w-content">
      {/* Wide viewports have room beside the card — float the toggle out there instead
          of stacking it above, which otherwise pushes the card down for no reason. */}
      <CardTiltToggle className="absolute top-0 -left-14 hidden lg:inline-flex" />
      <RaceGameButton
        color={VEHICLE_COLOR_HEX[vehicleColor]}
        kind={resolveVehicleKind(registry?.actions[0]?.kind)}
        bodyText={registry?.actions[0]?.body}
        plate={registry?.plate ?? ''}
        brand={vehicle.brand}
        vehicleLabel={[
          [vehicle.brand, vehicle.model].filter(Boolean).join(' '),
          vehicle.year ? `(${vehicle.year})` : '',
          registry?.plate
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <Card
        ref={glowRef}
        className="group relative isolate w-full transform-[perspective(var(--tilt-perspective,1200px))_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] overflow-hidden shadow-2xl! transition-[transform,box-shadow] duration-200 ease-out will-change-transform backface-hidden hover:shadow-xl!"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-12 -z-20 animate-glow-breathe opacity-35 blur-3xl transition-[background] duration-300 ease-out"
          style={{
            background: `radial-gradient(ellipse at var(--glow-x, 0%) var(--glow-y, 0%), ${VEHICLE_COLOR_HEX[vehicleColor]}, transparent 70%)`
          }}
        />
        <BrandLogo brand={vehicle.brand} variant="watermark" />
        <FavoriteButton kind="vin" value={data.vin} label={null} className="absolute top-3 right-3" />

        <div className="mb-1 flex items-center gap-1.5 pr-10 text-xl font-semibold lg:pr-8">
          <span aria-hidden>🆔</span>
          {t('vin.title')}
          <CopyAllInfoButton
            vehicle={vehicle}
            plate={plate}
            region={region}
            current={registry?.actions[0] ?? null}
            vin={data.vin}
            vinDecodeResults={data.results}
            vinRegistryActions={registry?.actions ?? null}
          />
        </div>
        <VinBarcode vin={data.vin} />

        <div className="mb-3 flex flex-wrap items-center gap-1.5 empty:hidden">
          <OriginChip
            brand={vehicle.brand}
            model={vehicle.model}
            year={vehicle.year}
            vin={data.vin}
            plantCountry={countryIso(fields.get('Plant Country'))}
            plantCity={fields.get('Plant City')}
            onOpenSection={() => setOriginOpenSignal(n => n + 1)}
          />
          <SteeringChip steering={fields.get('Steering Location')} />
          <CatalogModelChip brand={vehicle.brand} model={vehicle.model} />
          <UaAuctionChip plate={sourcePlate} vin={data.vin} onOpen={() => setUaAuctionOpenSignal(n => n + 1)} />
          <CompareChip from={{ kind: 'vin', vin: data.vin }} />
        </div>

        {registry && (
          <div className="mb-4">
            <div className="flex justify-between gap-4 py-1.5 text-base">
              <span className="flex items-center gap-1.5 rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">
                {t('field.ownersCount')}
                <InfoPopover
                  label={t('vin.info.about', { field: t('field.ownersCount') })}
                  title={t('field.ownersCount')}
                >
                  <InfoText text={t('field.about.ownersCount')} />
                </InfoPopover>
              </span>
              <span className="rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-right font-medium">
                {t('field.ownersCountValue', { count: countOwners(registry.actions) })}
              </span>
            </div>

            <VinRegistryHistory registry={registry} vin={data.vin} />
          </div>
        )}

        <LazySection sections={['wanted']}>
          <WantedCheck plate={sourcePlate} vin={data.vin} />
        </LazySection>

        <LazySection sections={['ua-auctions']} forceMount={uaAuctionOpenSignal > 0 || openAuctions}>
          <UaAuctionCheck
            plate={sourcePlate}
            vin={data.vin}
            openSignal={uaAuctionOpenSignal}
            startOpen={openAuctions}
          />
        </LazySection>

        <VinDecodeTabs
          data={data}
          overviewExtras={
            <>
              <SafetyRatings brand={vehicle.brand} model={vehicle.model} year={vehicle.year} body={vehicle.body} />
              <CarWikiInfo brand={vehicle.brand} model={vehicle.model} year={vehicle.year} />
              <VinTypicalData data={data} />
            </>
          }
        />

        <LazySection sections={['origin']} forceMount={originOpenSignal > 0}>
          <OriginSection
            openSignal={originOpenSignal}
            brand={vehicle.brand}
            model={vehicle.model}
            year={vehicle.year}
            vin={data.vin}
            plantCountry={countryIso(fields.get('Plant Country'))}
            plantCity={fields.get('Plant City')}
            ukraine={ukraineFromActions(registry?.actions ?? [])}
          />
        </LazySection>

        <LazySection sections={['auctions']}>
          <AuctionCheck vin={data.vin} imported={hasImportOperation(registry?.actions ?? [])} />
        </LazySection>
      </Card>
    </div>
  )
}
