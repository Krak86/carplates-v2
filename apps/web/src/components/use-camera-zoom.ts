import { useEffect, useState } from 'react'

type ZoomRange = { min: number; max: number; step: number }

// `zoom` isn't in the TS DOM lib yet; Chrome on Android exposes it on capable cameras (iOS Safari doesn't).
type ZoomCapabilities = MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } }
type ZoomConstraint = MediaTrackConstraintSet & { zoom?: number }

export type CameraZoom = {
  range: ZoomRange | null
  zoom: number
  setZoom: (value: number) => void
}

export function useCameraZoom(stream: MediaStream | null): CameraZoom {
  const [range, setRange] = useState<ZoomRange | null>(null)
  const [zoom, setZoomValue] = useState(1)

  useEffect(() => {
    const track = stream?.getVideoTracks()[0]
    const caps = track?.getCapabilities?.() as ZoomCapabilities | undefined
    if (caps?.zoom && caps.zoom.max > caps.zoom.min) {
      setRange({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 })
      setZoomValue(caps.zoom.min)
    } else {
      setRange(null)
    }
  }, [stream])

  const setZoom = (value: number): void => {
    setZoomValue(value)
    const constraint: ZoomConstraint = { zoom: value }
    stream
      ?.getVideoTracks()[0]
      ?.applyConstraints({ advanced: [constraint] })
      .catch(() => undefined)
  }

  return { range, zoom, setZoom }
}
