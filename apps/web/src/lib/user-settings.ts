import {
  BACKGROUND_PRESET_LIMIT,
  type BackgroundPreset,
  type BackgroundSettings,
  type UserSettings
} from '@carplates/shared'

import { DEFAULT_STREAMS } from '@/lib/live-background'
import { BACKGROUND_DEFAULTS } from '@/store/background-store'

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultMode: 'images',
  streams: { ...DEFAULT_STREAMS },
  presets: [],
  activePresetId: null,
  useDefaultBackground: false
}

/** The photo-background settings that apply: the built-in defaults, or the active preset's. */
export function effectiveBackground(settings: UserSettings): BackgroundSettings {
  if (settings.useDefaultBackground) return BACKGROUND_DEFAULTS
  return settings.presets.find(p => p.id === settings.activePresetId)?.settings ?? BACKGROUND_DEFAULTS
}

export const canAddPreset = (settings: UserSettings): boolean => settings.presets.length < BACKGROUND_PRESET_LIMIT

/** Adds a preset (and makes it the active one); a no-op at the limit. */
export function addPreset(settings: UserSettings, preset: BackgroundPreset): UserSettings {
  if (!canAddPreset(settings)) return settings
  return { ...settings, presets: [...settings.presets, preset], activePresetId: preset.id }
}

export function updatePreset(settings: UserSettings, preset: BackgroundPreset): UserSettings {
  return { ...settings, presets: settings.presets.map(p => (p.id === preset.id ? preset : p)) }
}

/** Removes a preset; if it was the active one the built-in defaults take over. */
export function deletePreset(settings: UserSettings, id: string): UserSettings {
  return {
    ...settings,
    presets: settings.presets.filter(p => p.id !== id),
    activePresetId: settings.activePresetId === id ? null : settings.activePresetId
  }
}

export const newPresetId = (): string => crypto.randomUUID()
