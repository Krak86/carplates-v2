import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { fallbackVehicleColor, resolveVehicleColor, resolveVehicleKind, VEHICLE_COLOR_HEX } from '@carplates/shared'
import type { CatalogModel } from '@carplates/shared'

import Model360Button from '@/components/Model360Button'
import Model3dButton from '@/components/Model3dButton'
import RaceTestDriveChip from '@/components/game/RaceTestDriveChip'
import PartsCatalogChip from '@/components/PartsCatalogChip'
import TuningChip from '@/components/TuningChip'
import VdbChips from '@/components/VdbChips'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const RaceGameModal = lazy(() => import('@/components/game/RaceGameModal'))

type Props = {
  model: CatalogModel
}

/**
 * The plate card's model-level chips for a catalog model: cross-market (VehiclesDB), 3D, 3DTuning (latest year, dominant body), 360° and the test drive. The racer
 * opens on the model's most common colour and kind, with no plate. Flows in the parent's wrapping chip row (`contents`).
 */
export default function CatalogViewChips({ model }: Props): ReactNode {
  const online = useOnlineStatus()
  const [raceOpen, setRaceOpen] = useState(false)
  const color = resolveVehicleColor(model.stats.color[0]?.[0]) ?? fallbackVehicleColor(model.model)

  return (
    <div className="contents">
      <VdbChips brand={model.topBrand} model={model.topModel} kind={model.kind} />
      <Model3dButton brand={model.topBrand} model={model.topModel} />
      <TuningChip
        brand={model.topBrand}
        model={model.topModel}
        year={model.yearMax}
        body={model.stats.body[0]?.[0] ?? null}
      />
      <Model360Button brand={model.topBrand} model={model.topModel} />
      <PartsCatalogChip brand={model.topBrand} />
      <RaceTestDriveChip onOpen={() => setRaceOpen(true)} />

      {raceOpen && online && (
        <Suspense fallback={null}>
          <RaceGameModal
            color={VEHICLE_COLOR_HEX[color]}
            kind={resolveVehicleKind(model.kind)}
            bodyText={model.stats.body[0]?.[0]}
            plate=""
            brand={model.topBrand}
            vehicleLabel={`${model.makeName} ${model.modelName}`.trim()}
            shared={null}
            onClose={() => setRaceOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
