import type { ReactNode } from 'react'
import { isLightVehicleColor, resolveVehicleColor, VEHICLE_COLOR_HEX } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  value: string | null
  className?: string
}

/**
 * Small filled circle for a raw registry color value, meant to sit right next to that
 * value's text label. Renders nothing for an unresolved/absent color — no decorative
 * fallback here, unlike VehicleKindIcon, since this swatch is asserting "this is the
 * actual recorded color", not filling in a placeholder.
 */
export default function ColorSwatch({ value, className }: Props): ReactNode {
  const color = resolveVehicleColor(value)
  if (!color) return null

  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-3 w-3 shrink-0 rounded-full border',
        isLightVehicleColor(color) ? 'border-black/50' : 'border-black/15',
        className
      )}
      style={{ backgroundColor: VEHICLE_COLOR_HEX[color] }}
    />
  )
}
