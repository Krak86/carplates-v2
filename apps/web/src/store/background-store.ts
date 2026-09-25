import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BackgroundSettings {
  photosEnabled: boolean
  blurEnabled: boolean
  blurPx: number
  grayscaleEnabled: boolean
  grayscalePercent: number
  brightnessEnabled: boolean
  brightnessPercent: number
  overlayEnabled: boolean
  overlayOpacity: number
  mouseParallaxEnabled: boolean
  mouseParallaxStrength: number
  scrollParallaxEnabled: boolean
  scrollParallaxStrength: number
  cycleEnabled: boolean
  cycleIntervalSec: number
}

export const BACKGROUND_DEFAULTS: BackgroundSettings = {
  photosEnabled: true,
  blurEnabled: true,
  blurPx: 5,
  grayscaleEnabled: true,
  grayscalePercent: 50,
  brightnessEnabled: true,
  brightnessPercent: 50,
  overlayEnabled: true,
  overlayOpacity: 50,
  mouseParallaxEnabled: true,
  mouseParallaxStrength: 10,
  scrollParallaxEnabled: true,
  scrollParallaxStrength: 5,
  cycleEnabled: true,
  cycleIntervalSec: 60
}

interface BackgroundStore extends BackgroundSettings {
  setField: (key: keyof BackgroundSettings, value: BackgroundSettings[keyof BackgroundSettings]) => void
  reset: () => void
}

export const useBackgroundStore = create<BackgroundStore>()(
  persist(
    set => ({
      ...BACKGROUND_DEFAULTS,
      setField: (key, value): void => {
        set({ [key]: value } as Partial<BackgroundSettings>)
      },
      reset: (): void => {
        set(BACKGROUND_DEFAULTS)
      }
    }),
    { name: 'carplates.bg-settings' }
  )
)
