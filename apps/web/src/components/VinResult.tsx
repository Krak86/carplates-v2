import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { fallbackVehicleColor, resolveVehicleColor, VEHICLE_COLOR_HEX } from '@carplates/shared'
import type { VinDecodeResponse } from '@carplates/shared'

import CardTiltToggle from '@/components/CardTiltToggle'
import FavoriteButton from '@/components/FavoriteButton'
import RegistrationTimeline from '@/components/RegistrationTimeline'
import SafetyRatings from '@/components/SafetyRatings'
import Card from '@/components/ui/Card'
import { extractVehicleInfo } from '@/components/VinResult.helpers'
import VinDecodeFields from '@/components/VinDecodeFields'
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
  const tiltEnabled = useUiStore(s => s.cardTiltEnabled)
  const glowRef = useCardMotion<HTMLDivElement>(tiltEnabled)

  return (
    <div className="relative w-full max-w-2xl">
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
        <CardTiltToggle className="absolute top-3 right-12 lg:hidden" />
        <FavoriteButton kind="vin" value={data.vin} label={null} className="absolute top-3 right-3" />

        <div className="mb-1 flex items-center gap-1.5 pr-20 text-xl font-semibold lg:pr-8">
          <span aria-hidden>🆔</span>
          {t('vin.title')}
        </div>
        <div className="mb-3 text-base text-[var(--color-muted)]">{data.vin}</div>

        {registry && (
          <div className="mb-4">
            <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
              <span aria-hidden>🕘</span>
              {t('vin.registryTitle')}
            </div>
            <RegistrationTimeline actions={registry.actions} />
          </div>
        )}

        <VinDecodeFields results={data.results} />
        <p className="mt-3 text-sm text-[var(--color-muted)]">{t('vin.source')}</p>

        <SafetyRatings brand={vehicle.brand} model={vehicle.model} year={vehicle.year} />
      </Card>
    </div>
  )
}
