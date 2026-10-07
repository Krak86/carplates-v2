import type { BackgroundSettings } from '@/store/background-store'

/** The adjustable photo-background effects: an on/off flag + a numeric value each. Shared by the dev panel and /settings. */
export const BACKGROUND_CONTROLS = [
  { enabledKey: 'blurEnabled', valueKey: 'blurPx', label: 'blur', min: 0, max: 40, step: 1, unit: 'px' },
  {
    enabledKey: 'grayscaleEnabled',
    valueKey: 'grayscalePercent',
    label: 'grayscale',
    min: 0,
    max: 100,
    step: 5,
    unit: '%'
  },
  {
    enabledKey: 'brightnessEnabled',
    valueKey: 'brightnessPercent',
    label: 'brightness',
    min: 20,
    max: 150,
    step: 5,
    unit: '%'
  },
  { enabledKey: 'overlayEnabled', valueKey: 'overlayOpacity', label: 'overlay', min: 0, max: 100, step: 5, unit: '%' },
  {
    enabledKey: 'mouseParallaxEnabled',
    valueKey: 'mouseParallaxStrength',
    label: 'mouseParallax',
    min: 0,
    max: 60,
    step: 2,
    unit: 'px'
  },
  {
    enabledKey: 'scrollParallaxEnabled',
    valueKey: 'scrollParallaxStrength',
    label: 'scrollParallax',
    min: 0,
    max: 100,
    step: 5,
    unit: '%'
  },
  { enabledKey: 'cycleEnabled', valueKey: 'cycleIntervalSec', label: 'cycle', min: 3, max: 60, step: 1, unit: 's' }
] as const satisfies readonly {
  enabledKey: keyof BackgroundSettings
  valueKey: keyof BackgroundSettings
  label: string
  min: number
  max: number
  step: number
  unit: string
}[]
