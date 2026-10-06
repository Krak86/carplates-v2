import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  countOwners,
  fallbackVehicleColor,
  regionName,
  resolveVehicleColor,
  VEHICLE_COLOR_HEX
} from '@carplates/shared'
import type { VinDecodeResponse } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import CardTiltToggle from '@/components/CardTiltToggle'
import CarWikiInfo from '@/components/CarWikiInfo'
import CopyAllInfoButton from '@/components/CopyAllInfoButton'
import CopyButton from '@/components/CopyButton'
import FavoriteButton from '@/components/FavoriteButton'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import SafetyRatings from '@/components/SafetyRatings'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'
import Card from '@/components/ui/Card'
import { extractVehicleInfo } from '@/components/VinResult.helpers'
import VinRegistryHistory from '@/components/vin/VinRegistryHistory'
import VinDecodeTabs from '@/components/vin/VinDecodeTabs'
import { useCardMotion } from '@/hooks/useCardMotion'
import { useUiStore } from '@/store/ui-store'

type Props = {
  data: VinDecodeResponse
}

export default function VinResult({ data }: Props): ReactNode {
  const { t } = useTranslation()
  const registry = data.registry
  const vehicle = extractVehicleInfo(data)
  const vehicleColor = resolveVehicleColor(registry?.actions[0]?.color) ?? fallbackVehicleColor(data.vin)
  const plate = registry?.plate ?? null
  const region = plate ? (regionName(plate) ?? null) : null
  const tiltEnabled = useUiStore(s => s.cardTiltEnabled)
  const glowRef = useCardMotion<HTMLDivElement>(tiltEnabled)
  useCarHeroImageActions({ brand: vehicle.brand, model: vehicle.model, year: vehicle.year, key: data.vin })

  return (
    <div className="card-vt relative w-full max-w-content">
      {/* Wide viewports have room beside the card — float the toggle out there instead
          of stacking it above, which otherwise pushes the card down for no reason. */}
      <CardTiltToggle className="absolute top-3 -right-14 hidden lg:inline-flex" />
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
        <div className="mb-3 flex items-center gap-1.5 text-base text-[var(--color-muted)]">
          {data.vin}
          <CopyButton text={data.vin} label={t('field.vin')} />
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

            <VinRegistryHistory registry={registry} />
          </div>
        )}

        <VinDecodeTabs data={data} />

        <SafetyRatings brand={vehicle.brand} model={vehicle.model} year={vehicle.year} body={vehicle.body} />
        <CarWikiInfo brand={vehicle.brand} model={vehicle.model} year={vehicle.year} />
      </Card>
    </div>
  )
}
