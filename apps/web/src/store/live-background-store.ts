import { create } from 'zustand'

import { DEFAULT_EARTH_STREAM, type BackgroundMode } from '@/lib/live-background'

type LiveBackgroundStore = {
  /** Session-only on purpose: a live stream/map costs data, so a reload returns to the photos. */
  mode: BackgroundMode
  /** YouTube video id of the Earth stream picked in the layers panel. */
  earthStream: string
  setMode: (mode: BackgroundMode) => void
  setEarthStream: (id: string) => void
  reset: () => void
}

export const useLiveBackgroundStore = create<LiveBackgroundStore>()(set => ({
  mode: 'images',
  earthStream: DEFAULT_EARTH_STREAM,
  setMode: (mode): void => set({ mode }),
  setEarthStream: (earthStream): void => set({ earthStream }),
  reset: (): void => set({ mode: 'images', earthStream: DEFAULT_EARTH_STREAM })
}))
