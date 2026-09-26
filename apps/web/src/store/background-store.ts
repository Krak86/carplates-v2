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

/** A resolved car image standing in for the ambient rotation, scoped to one result view (VIN, or plate when that row has no VIN on file). */
export interface HeroOverride {
  key: string
  css: string
  sourceUrl: string | null
  attribution: { author: string | null; license: string | null; licenseUrl: string | null } | null
}

interface BackgroundStore extends BackgroundSettings {
  /** Set while a plate/VIN result with a resolved wiki image is on screen; null otherwise (ambient rotation shows). */
  heroOverride: HeroOverride | null
  setField: (key: keyof BackgroundSettings, value: BackgroundSettings[keyof BackgroundSettings]) => void
  reset: () => void
  setHeroOverride: (override: HeroOverride) => void
  /** No-ops unless `key` still matches the active override — guards against a stale unmount
   *  clearing an override a newer result already set (route transitions can race). */
  clearHeroOverride: (key: string) => void
}

export const useBackgroundStore = create<BackgroundStore>()(
  persist(
    set => ({
      ...BACKGROUND_DEFAULTS,
      heroOverride: null,
      setField: (key, value): void => {
        set({ [key]: value } as Partial<BackgroundSettings>)
      },
      reset: (): void => {
        set(BACKGROUND_DEFAULTS)
      },
      setHeroOverride: (override): void => {
        set({ heroOverride: override })
      },
      clearHeroOverride: (key): void => {
        set(state => (state.heroOverride?.key === key ? { heroOverride: null } : {}))
      }
    }),
    {
      name: 'carplates.bg-settings',
      // heroOverride is per-session UI state, not a setting — never persist it (a stale car
      // image from a previous visit must never survive a reload on an unrelated page).
      partialize: (state): BackgroundSettings => ({
        photosEnabled: state.photosEnabled,
        blurEnabled: state.blurEnabled,
        blurPx: state.blurPx,
        grayscaleEnabled: state.grayscaleEnabled,
        grayscalePercent: state.grayscalePercent,
        brightnessEnabled: state.brightnessEnabled,
        brightnessPercent: state.brightnessPercent,
        overlayEnabled: state.overlayEnabled,
        overlayOpacity: state.overlayOpacity,
        mouseParallaxEnabled: state.mouseParallaxEnabled,
        mouseParallaxStrength: state.mouseParallaxStrength,
        scrollParallaxEnabled: state.scrollParallaxEnabled,
        scrollParallaxStrength: state.scrollParallaxStrength,
        cycleEnabled: state.cycleEnabled,
        cycleIntervalSec: state.cycleIntervalSec
      })
    }
  )
)
