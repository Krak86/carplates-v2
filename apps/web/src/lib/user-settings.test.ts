import { describe, it, expect } from 'vitest'
import { BACKGROUND_PRESET_LIMIT, userSettingsSchema, type BackgroundPreset } from '@carplates/shared'

import {
  DEFAULT_USER_SETTINGS,
  addPreset,
  canAddPreset,
  deletePreset,
  effectiveBackground,
  updatePreset
} from '@/lib/user-settings'
import { BACKGROUND_DEFAULTS } from '@/store/background-store'

const preset = (id: string, blurPx = 12): BackgroundPreset => ({
  id,
  name: id,
  settings: { ...BACKGROUND_DEFAULTS, blurPx }
})

describe('user settings', () => {
  it('defaults satisfy the shared schema', () => {
    expect(userSettingsSchema.safeParse(DEFAULT_USER_SETTINGS).success).toBe(true)
  })

  it('adds a preset and activates it, up to the limit', () => {
    let s = DEFAULT_USER_SETTINGS
    for (let i = 0; i < BACKGROUND_PRESET_LIMIT; i++) s = addPreset(s, preset(`p${i}`))
    expect(s.presets).toHaveLength(BACKGROUND_PRESET_LIMIT)
    expect(s.activePresetId).toBe(`p${BACKGROUND_PRESET_LIMIT - 1}`)
    expect(canAddPreset(s)).toBe(false)
    expect(addPreset(s, preset('extra'))).toBe(s)
  })

  it('uses the active preset unless defaults are forced', () => {
    const s = addPreset(DEFAULT_USER_SETTINGS, preset('a', 20))
    expect(effectiveBackground(s).blurPx).toBe(20)
    expect(effectiveBackground({ ...s, useDefaultBackground: true })).toBe(BACKGROUND_DEFAULTS)
  })

  it('falls back to defaults when the active preset is gone', () => {
    const s = deletePreset(addPreset(DEFAULT_USER_SETTINGS, preset('a')), 'a')
    expect(s.activePresetId).toBeNull()
    expect(effectiveBackground(s)).toBe(BACKGROUND_DEFAULTS)
  })

  it('keeps another preset active when a different one is deleted', () => {
    let s = addPreset(DEFAULT_USER_SETTINGS, preset('a'))
    s = addPreset(s, preset('b'))
    expect(deletePreset(s, 'a').activePresetId).toBe('b')
  })

  it('updates a preset in place', () => {
    const s = updatePreset(addPreset(DEFAULT_USER_SETTINGS, preset('a')), preset('a', 33))
    expect(s.presets[0]?.settings.blurPx).toBe(33)
  })
})
