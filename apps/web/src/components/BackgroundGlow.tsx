import type { ReactNode } from 'react'
import { VEHICLE_COLOR_HEX, type VehicleColor } from '@carplates/shared'

type Props = {
  color: VehicleColor
}

/** Fixed, page-wide radial glow behind all content — breathes slowly and crossfades when `color` changes. */
export default function BackgroundGlow({ color }: Props): ReactNode {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 animate-glow-breathe opacity-60 blur-3xl transition-[background] duration-1000 ease-in-out"
      style={{ background: `radial-gradient(circle at 50% 30%, ${VEHICLE_COLOR_HEX[color]}, transparent 60%)` }}
    />
  )
}
