import { useEffect, useRef } from 'react'

import type { RacerInput } from '@/lib/racer/engine'

/** Degrees of tilt from level before the car starts steering. */
const TILT_DEAD_ZONE_DEG = 8

type PermissionedOrientationEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }

/** iOS asks once, and only from a tap; elsewhere (Android, desktop) there is no prompt. Resolves to whether tilt may be used. */
export async function requestTiltPermission(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === 'undefined') return false
  const { requestPermission } = DeviceOrientationEvent as PermissionedOrientationEvent
  if (!requestPermission) return true
  try {
    return (await requestPermission.call(DeviceOrientationEvent)) === 'granted'
  } catch {
    return false
  }
}

/** The tilt that steers, in degrees (right = positive), whichever way the screen is rotated. */
function steerTilt(e: DeviceOrientationEvent): number {
  const angle = ((screen.orientation?.angle ?? 0) + 360) % 360
  const beta = e.beta ?? 0
  const gamma = e.gamma ?? 0
  if (angle === 90) return beta
  if (angle === 270) return -beta
  if (angle === 180) return -gamma
  return gamma
}

/** Degrees of pitch from the starting hold that move the camera all the way. */
const PITCH_RANGE_DEG = 25
const PITCH_DEAD_ZONE_DEG = 4

/** How far the phone leans back (screen turning up, positive) in degrees, whichever way the screen is rotated. */
function pitchBack(e: DeviceOrientationEvent): number {
  const angle = ((screen.orientation?.angle ?? 0) + 360) % 360
  const beta = e.beta ?? 0
  const gamma = e.gamma ?? 0
  if (angle === 90) return gamma
  if (angle === 270) return -gamma
  if (angle === 180) return beta
  return -beta
}

/**
 * Turns the phone's tilt into left/right presses and, from its forward/back pitch (relative to how it was held when
 * tilt turned on), a camera level in -1…1 (leaning back = higher, wider camera). Releases everything when `enabled` turns off.
 */
export function useRaceTilt(
  enabled: boolean,
  onInput: (input: Partial<RacerInput>) => void,
  onCamera: (level: number) => void
): void {
  const onInputRef = useRef(onInput)
  const onCameraRef = useRef(onCamera)

  useEffect(() => {
    onInputRef.current = onInput
    onCameraRef.current = onCamera
  }, [onInput, onCamera])

  useEffect(() => {
    if (!enabled) return
    let left = false
    let right = false
    let basePitch: number | null = null
    let cameraLevel = 0
    const handleOrientation = (e: DeviceOrientationEvent): void => {
      const pitch = pitchBack(e)
      basePitch ??= pitch
      const delta = pitch - basePitch
      const nextLevel = Math.abs(delta) < PITCH_DEAD_ZONE_DEG ? 0 : Math.max(-1, Math.min(1, delta / PITCH_RANGE_DEG))
      if (Math.abs(nextLevel - cameraLevel) > 0.05) {
        cameraLevel = nextLevel
        onCameraRef.current(cameraLevel)
      }
      const tilt = steerTilt(e)
      const nextLeft = tilt < -TILT_DEAD_ZONE_DEG
      const nextRight = tilt > TILT_DEAD_ZONE_DEG
      if (nextLeft === left && nextRight === right) return
      left = nextLeft
      right = nextRight
      onInputRef.current({ left, right })
    }
    // the picture must not spin while the phone is tilted: Android locks it in full screen, iOS has no lock (ignored)
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    // tablets (shortest side >= 600 css px) are held in whichever landscape they are in: a forced 'landscape' is often
    // ignored there or flips the picture, so lock the current one when it already is landscape
    const isTablet = Math.min(screen.width, screen.height) >= 600
    const current = orientation?.type
    const target = isTablet && current?.startsWith('landscape') ? current : 'landscape'
    void orientation?.lock?.(target).catch(() => orientation?.lock?.('landscape').catch(() => undefined))
    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      orientation?.unlock?.()
      onInputRef.current({ left: false, right: false })
      onCameraRef.current(0)
    }
  }, [enabled])
}
