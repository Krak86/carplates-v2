import type { ReactNode } from 'react'

import { useBackgroundStore } from '@/store/background-store'
import type { BackgroundSettings } from '@/store/background-store'

type Props = {
  enabledKey: keyof BackgroundSettings
  valueKey: keyof BackgroundSettings
  label: string
  min: number
  max: number
  step: number
  unit: string
}

export default function BackgroundDevPanelRow({ enabledKey, valueKey, label, min, max, step, unit }: Props): ReactNode {
  const enabled = useBackgroundStore(s => s[enabledKey]) as boolean
  const value = useBackgroundStore(s => s[valueKey]) as number
  const setField = useBackgroundStore(s => s.setField)

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <input type="checkbox" checked={enabled} onChange={e => setField(enabledKey, e.target.checked)} />
          {label}
        </span>
        <span className="text-[var(--color-muted)]">
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
        onChange={e => setField(valueKey, Number(e.target.value))}
        className="w-full disabled:opacity-40"
      />
    </div>
  )
}
