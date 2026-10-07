import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { BackgroundSettings } from '@carplates/shared'

import type { BACKGROUND_CONTROLS } from '@/lib/background-controls'

type Control = (typeof BACKGROUND_CONTROLS)[number]

type Props = {
  control: Control
  settings: BackgroundSettings
  onChange: (key: keyof BackgroundSettings, value: boolean | number) => void
}

/** One effect of the photo background: an on/off checkbox + a slider, controlled by the preset being edited. */
export default function BackgroundSliderRow({ control, settings, onChange }: Props): ReactNode {
  const { t } = useTranslation()
  const { enabledKey, valueKey, label, min, max, step, unit } = control
  const enabled = settings[enabledKey]
  const value = settings[valueKey]

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={e => onChange(enabledKey, e.target.checked)} />
          {t(`settings.bg.${label}`)}
        </span>
        <span className="text-[var(--color-muted)] tabular-nums">
          {value}
          {unit}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={!enabled}
        aria-label={t(`settings.bg.${label}`)}
        onChange={e => onChange(valueKey, Number(e.target.value))}
        className="w-full disabled:opacity-40"
      />
    </div>
  )
}
