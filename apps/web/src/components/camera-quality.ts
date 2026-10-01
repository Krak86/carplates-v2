export const CAMERA_QUALITIES = ['hd', 'fhd', '4k'] as const
export type CameraQuality = (typeof CAMERA_QUALITIES)[number]

export const DEFAULT_CAMERA_QUALITY: CameraQuality = 'fhd'

export const CAMERA_QUALITY_LABEL: Record<CameraQuality, string> = { hd: 'HD', fhd: 'Full HD', '4k': '4K' }

const SIZE: Record<CameraQuality, { width: number; height: number }> = {
  hd: { width: 1280, height: 720 },
  fhd: { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 }
}

/** Ideal (not exact) size: the browser falls back to the nearest mode the camera supports. */
export function videoConstraints(quality: CameraQuality, deviceId: string | null): MediaTrackConstraints {
  const { width, height } = SIZE[quality]
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
    width: { ideal: width },
    height: { ideal: height }
  }
}
