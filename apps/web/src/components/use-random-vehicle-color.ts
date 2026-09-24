import { useEffect, useState } from 'react'
import { VEHICLE_COLORS, type VehicleColor } from '@carplates/shared'

const CYCLE_INTERVAL_MS = 10_000

function randomColor(): VehicleColor {
  return VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)] as VehicleColor
}

function nextColor(current: VehicleColor): VehicleColor {
  const options = VEHICLE_COLORS.filter(color => color !== current)
  return options[Math.floor(Math.random() * options.length)] as VehicleColor
}

/** Ambient color for when no search result is driving the background glow — a fresh random pick every 10s while `enabled`. */
export function useRandomVehicleColor(enabled: boolean): VehicleColor {
  const [color, setColor] = useState<VehicleColor>(randomColor)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setColor(nextColor), CYCLE_INTERVAL_MS)
    return (): void => clearInterval(id)
  }, [enabled])

  return color
}
