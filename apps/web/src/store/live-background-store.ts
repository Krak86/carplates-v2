import { create } from 'zustand'

import { DEFAULT_STREAMS, mapViewFor, type BackgroundMode, type MapView, type StreamMode } from '@/lib/live-background'

type LiveBackgroundStore = {
  /** Session-only on purpose: a live stream/map costs data, so a reload returns to the photos. Routing never changes it. */
  mode: BackgroundMode
  /** YouTube video id picked in the layers panel, per stream layer. */
  streams: Record<StreamMode, string>
  /** Where the map layer points — captured when the user picks the map, so navigating doesn't move it. */
  mapView: MapView
  setMode: (mode: BackgroundMode) => void
  setStream: (mode: StreamMode, id: string) => void
  setMapView: (view: MapView) => void
}

export const useLiveBackgroundStore = create<LiveBackgroundStore>()(set => ({
  mode: 'images',
  streams: { ...DEFAULT_STREAMS },
  mapView: mapViewFor(undefined),
  setMode: (mode): void => set({ mode }),
  setStream: (mode, id): void => set(s => ({ streams: { ...s.streams, [mode]: id } })),
  setMapView: (mapView): void => set({ mapView })
}))
