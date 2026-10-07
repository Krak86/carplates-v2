import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BACKGROUND_PRESET_LIMIT, type BackgroundPreset } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { canAddPreset, effectiveBackground, newPresetId } from '@/lib/user-settings'
import PresetEditor from '@/routes/settings/PresetEditor'
import { useSettingsStore } from '@/store/settings-store'

/** Which preset is open in the editor: an existing one, a brand-new draft, or none. */
type Editing = { preset: BackgroundPreset; isNew: boolean } | null

const BUTTON_CLASS = 'rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-bg)]'

export default function BackgroundPresetsSection(): ReactNode {
  const { t } = useTranslation()
  const settings = useSettingsStore(s => s.settings)
  const setUseDefault = useSettingsStore(s => s.setUseDefaultBackground)
  const setActive = useSettingsStore(s => s.setActivePreset)
  const createPreset = useSettingsStore(s => s.createPreset)
  const savePreset = useSettingsStore(s => s.savePreset)
  const removePreset = useSettingsStore(s => s.removePreset)
  const [editing, setEditing] = useState<Editing>(null)

  const { presets, activePresetId, useDefaultBackground } = settings

  const handleNew = (): void =>
    setEditing({
      isNew: true,
      preset: {
        id: newPresetId(),
        name: t('settings.presets.defaultName', { n: presets.length + 1 }),
        // Start from what is on screen now, so a new preset is a tweak of the current look.
        settings: effectiveBackground(settings)
      }
    })

  const handleSave = (preset: BackgroundPreset): void => {
    if (editing?.isNew) createPreset(preset)
    else savePreset(preset)
    setEditing(null)
  }

  const handleDelete = (preset: BackgroundPreset): void => {
    if (!window.confirm(t('settings.presets.deleteConfirm', { name: preset.name }))) return
    if (editing?.preset.id === preset.id) setEditing(null)
    removePreset(preset.id)
  }

  return (
    <section>
      <h2 className="mt-8 mb-2 inline-block rounded-lg bg-[var(--color-surface)] px-3 py-1 text-lg font-semibold">
        {t('settings.presets.title')}
      </h2>
      <Card className="p-0">
        <p className="p-4 pb-2 text-sm text-[var(--color-muted)]">
          {t('settings.presets.intro', { limit: BACKGROUND_PRESET_LIMIT })}
        </p>

        <label className="flex cursor-pointer items-start gap-3 border-b border-[var(--color-border)] p-4 pt-2">
          <input
            type="checkbox"
            checked={useDefaultBackground}
            onChange={e => setUseDefault(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span className="text-sm">
            <span className="block font-medium">{t('settings.presets.useDefaults')}</span>
            <span className="block text-[var(--color-muted)]">{t('settings.presets.useDefaultsHint')}</span>
          </span>
        </label>

        {presets.length === 0 && <p className="p-4 text-sm text-[var(--color-muted)]">{t('settings.presets.empty')}</p>}

        <ul className="divide-y divide-[var(--color-border)]">
          {presets.map(preset => {
            const isActive = !useDefaultBackground && preset.id === activePresetId
            const isEditing = editing?.preset.id === preset.id && !editing.isNew
            return (
              <li key={preset.id}>
                <div className="flex flex-wrap items-center gap-2 p-4">
                  <span
                    className={cn('min-w-0 flex-1 truncate font-medium', isActive && 'text-[var(--color-primary)]')}
                  >
                    {preset.name}
                    {isActive && <span className="ml-2 text-xs font-normal">✓ {t('settings.presets.active')}</span>}
                  </span>
                  {!isActive && (
                    <button type="button" onClick={() => setActive(preset.id)} className={BUTTON_CLASS}>
                      {t('settings.presets.use')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(isEditing ? null : { preset, isNew: false })}
                    className={BUTTON_CLASS}
                  >
                    {t('settings.presets.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(preset)}
                    className={cn(BUTTON_CLASS, 'text-red-600')}
                  >
                    {t('settings.presets.delete')}
                  </button>
                </div>
                {isEditing && <PresetEditor initial={preset} onSave={handleSave} onCancel={() => setEditing(null)} />}
              </li>
            )
          })}
        </ul>

        {editing?.isNew && (
          <div className="border-t border-[var(--color-border)]">
            <PresetEditor initial={editing.preset} onSave={handleSave} onCancel={() => setEditing(null)} />
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            disabled={!canAddPreset(settings) || editing?.isNew === true}
            onClick={handleNew}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            + {t('settings.presets.new')}
          </button>
          {!canAddPreset(settings) && (
            <span className="text-sm text-[var(--color-muted)]">
              {t('settings.presets.limit', { limit: BACKGROUND_PRESET_LIMIT })}
            </span>
          )}
        </div>
      </Card>
    </section>
  )
}
