import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  userSettingsSchema,
  type BackgroundMode,
  type BackgroundPreset,
  type SettingsDocument,
  type StreamMode,
  type UserSettings
} from '@carplates/shared'

import { addLabel, deleteLabel, renameLabel as renameLabelIn } from '@/lib/favorite-labels'
import { DEFAULT_USER_SETTINGS, addPreset, deletePreset, updatePreset } from '@/lib/user-settings'

type SettingsStore = {
  /** Account whose settings these are — a different user signing in on this device starts from the defaults. */
  ownerId: string | null
  settings: UserSettings
  /** Last local edit (ms), or the server document's time after a pull; 0 = never edited. Drives last-write-wins sync. */
  updatedAt: number
  claim: (userId: string) => void
  /** Adopts the server's document as-is (no edit time bump, so it isn't pushed back). */
  replace: (document: SettingsDocument) => void
  setDefaultMode: (mode: BackgroundMode) => void
  setStream: (mode: StreamMode, id: string) => void
  setUseDefaultBackground: (value: boolean) => void
  setActivePreset: (id: string | null) => void
  createPreset: (preset: BackgroundPreset) => void
  savePreset: (preset: BackgroundPreset) => void
  removePreset: (id: string) => void
  createLabel: (id: string, name: string) => void
  renameLabel: (id: string, name: string) => void
  removeLabel: (id: string) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => {
      const edit = (change: (s: UserSettings) => UserSettings): void => {
        set(state => {
          const settings = change(state.settings)
          return settings === state.settings ? {} : { settings, updatedAt: Math.max(Date.now(), state.updatedAt + 1) }
        })
      }

      return {
        ownerId: null,
        settings: DEFAULT_USER_SETTINGS,
        updatedAt: 0,
        claim: (userId): void => {
          set(state =>
            state.ownerId === userId ? {} : { ownerId: userId, settings: DEFAULT_USER_SETTINGS, updatedAt: 0 }
          )
        },
        replace: (document): void => {
          set({ settings: document.settings, updatedAt: document.updatedAt })
        },
        setDefaultMode: (defaultMode): void => edit(s => ({ ...s, defaultMode })),
        setStream: (mode, id): void =>
          edit(s => (s.streams[mode] === id ? s : { ...s, streams: { ...s.streams, [mode]: id } })),
        setUseDefaultBackground: (useDefaultBackground): void => edit(s => ({ ...s, useDefaultBackground })),
        setActivePreset: (activePresetId): void =>
          // Choosing a preset also ends "use the defaults" — otherwise picking one would appear to do nothing.
          edit(s => ({ ...s, activePresetId, useDefaultBackground: false })),
        createPreset: (preset): void => edit(s => addPreset({ ...s, useDefaultBackground: false }, preset)),
        savePreset: (preset): void => edit(s => updatePreset(s, preset)),
        removePreset: (id): void => edit(s => deletePreset(s, id)),
        createLabel: (id, name): void => edit(s => addLabel(s, id, name)),
        renameLabel: (id, name): void => edit(s => renameLabelIn(s, id, name)),
        removeLabel: (id): void => edit(s => deleteLabel(s, id))
      }
    },
    {
      name: 'carplates.user-settings',
      version: 1,
      partialize: (state): Pick<SettingsStore, 'ownerId' | 'settings' | 'updatedAt'> => ({
        ownerId: state.ownerId,
        settings: state.settings,
        updatedAt: state.updatedAt
      }),
      // Anything stored that no longer fits the schema falls back to the defaults rather than breaking the page.
      merge: (persisted, current): SettingsStore => {
        const stored = persisted as Partial<Pick<SettingsStore, 'ownerId' | 'settings' | 'updatedAt'>> | undefined
        const settings = userSettingsSchema.safeParse(stored?.settings)
        if (!settings.success) return current
        return {
          ...current,
          ownerId: typeof stored?.ownerId === 'string' ? stored.ownerId : null,
          settings: settings.data,
          updatedAt: typeof stored?.updatedAt === 'number' ? stored.updatedAt : 0
        }
      }
    }
  )
)
