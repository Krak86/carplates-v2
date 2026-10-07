import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { backgroundPresetSchema, type BackgroundPreset, type BackgroundSettings } from '@carplates/shared'

import { BACKGROUND_CONTROLS } from '@/lib/background-controls'
import { effectiveBackground } from '@/lib/user-settings'
import BackgroundSliderRow from '@/routes/settings/BackgroundSliderRow'
import { useBackgroundStore } from '@/store/background-store'
import { useSettingsStore } from '@/store/settings-store'

type Props = {
  initial: BackgroundPreset
  onSave: (preset: BackgroundPreset) => void
  onCancel: () => void
}

/** Edits a copy of a preset; nothing is stored until Save. */
export default function PresetEditor({ initial, onSave, onCancel }: Props): ReactNode {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(initial)

  const parsed = backgroundPresetSchema.safeParse(draft)
  const replaceBackground = useBackgroundStore(s => s.replace)

  // Live preview: the page background follows the sliders; closing the editor (save or cancel) puts back whatever
  // the saved settings dictate — the freshly saved preset if it is the active one, otherwise the unchanged look.
  useEffect(() => {
    replaceBackground(draft.settings)
  }, [draft.settings, replaceBackground])
  useEffect(
    () => (): void => {
      useBackgroundStore.getState().replace(effectiveBackground(useSettingsStore.getState().settings))
    },
    []
  )

  const handleChange = (key: keyof BackgroundSettings, value: boolean | number): void =>
    setDraft(d => ({ ...d, settings: { ...d.settings, [key]: value } }))

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault()
    if (parsed.success) onSave(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1 text-sm">
        {t('settings.presets.name')}
        <input
          type="text"
          value={draft.name}
          maxLength={40}
          required
          placeholder={t('settings.presets.namePlaceholder')}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.settings.photosEnabled}
          onChange={e => handleChange('photosEnabled', e.target.checked)}
        />
        {t('settings.presets.photos')}
      </label>

      {BACKGROUND_CONTROLS.map(control => (
        <BackgroundSliderRow
          key={control.valueKey}
          control={control}
          settings={draft.settings}
          onChange={handleChange}
        />
      ))}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!parsed.success}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {t('settings.presets.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 hover:bg-[var(--color-bg)]"
        >
          {t('settings.presets.cancel')}
        </button>
      </div>
    </form>
  )
}
