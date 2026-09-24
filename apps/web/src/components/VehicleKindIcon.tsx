import type { CSSProperties, ReactNode } from 'react'
import { VEHICLE_COLOR_HEX, VEHICLE_COLOR_SHADOW_HEX } from '@carplates/shared'
import type { VehicleColor, VehicleKind } from '@carplates/shared'

import { BusShape, MotorcycleShape, SedanShape, TrailerShape, TruckShape } from '@/assets/vehicleShapes'
import { cn } from '@/lib/cn'

type Props = {
  kind: VehicleKind | null
  color?: VehicleColor | null
  animated?: boolean
  className?: string
}

/**
 * Only 5 body shapes are drawn (see `assets/vehicleShapes.tsx`) — the other 8 `kind` values
 * reuse the closest one rather than going unillustrated. `undetermined` falls back to the
 * sedan silhouette too, same as any other unrecognized shape would.
 */
const SHAPE_BY_KIND: Readonly<Record<VehicleKind, (props: { spin: boolean }) => ReactNode>> = {
  passenger: SedanShape,
  undetermined: SedanShape,
  truck: TruckShape,
  specialized: TruckShape,
  special: TruckShape,
  bus: BusShape,
  motorcycle: MotorcycleShape,
  moped: MotorcycleShape,
  quad: MotorcycleShape,
  tricycle: MotorcycleShape,
  motoTricycle: MotorcycleShape,
  trailer: TrailerShape,
  semiTrailer: TrailerShape
}

/**
 * Small side-view pictogram of a vehicle's `kind`, tinted by its registry `color` via two CSS
 * custom properties the shape components read for their body/shadow fills. `animated` drives
 * both the wheel spin (`animate-vehicle-wheel-spin`) and a gentle color sheen
 * (`animate-vehicle-sheen`) — see global.css; both are `prefers-reduced-motion`-aware.
 *
 * No default width/height here — `cn` is plain `clsx` (no tailwind-merge dedup in this repo),
 * so a built-in size class could never be reliably overridden by the caller's `className`.
 * Callers must size it themselves.
 */
export default function VehicleKindIcon({ kind, color, animated = true, className }: Props): ReactNode {
  if (!kind) return null
  const Shape = SHAPE_BY_KIND[kind]
  const style = {
    '--vehicle-body-color': VEHICLE_COLOR_HEX[color ?? 'gray'],
    '--vehicle-body-shadow-color': VEHICLE_COLOR_SHADOW_HEX[color ?? 'gray']
  } as CSSProperties

  return (
    <svg
      viewBox="0 0 90 90"
      aria-hidden
      focusable="false"
      className={cn('shrink-0', animated && 'animate-vehicle-sheen', className)}
      style={style}
    >
      <Shape spin={animated} />
    </svg>
  )
}
