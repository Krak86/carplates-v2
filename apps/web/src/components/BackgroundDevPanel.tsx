import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import BackgroundDevPanelRow from '@/components/BackgroundDevPanelRow'
import { BACKGROUND_CONTROLS } from '@/lib/background-controls'
import { useBackgroundStore } from '@/store/background-store'

// 'mouseParallax' -> 'Mouse parallax' (the shared control ids double as i18n keys on /settings).
const devLabel = (id: string): string => {
  const words = id.replace(/([A-Z])/g, ' $1').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Dev-only tuning panel for BackgroundPhotos — never shown to regular visitors.
// Opens via ?debug=bg on first load, or Ctrl+Shift+B at any time. Not i18n'd:
// this is a developer tool, not end-user UI.
export default function BackgroundDevPanel(): ReactNode {
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(() => searchParams.get('debug') === 'bg')

  const photosEnabled = useBackgroundStore(s => s.photosEnabled)
  const setField = useBackgroundStore(s => s.setField)
  const reset = useBackgroundStore(s => s.reset)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!open) return null

  return (
    <div className="fixed right-3 bottom-3 z-50 flex max-h-[80vh] w-72 flex-col gap-3 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Background (dev)</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-[var(--color-muted)]">
          ✕
        </button>
      </div>

      <label className="flex items-center justify-between gap-2">
        <span>Photos enabled</span>
        <input type="checkbox" checked={photosEnabled} onChange={e => setField('photosEnabled', e.target.checked)} />
      </label>

      {BACKGROUND_CONTROLS.map(control => (
        <BackgroundDevPanelRow key={control.valueKey} {...control} label={devLabel(control.label)} />
      ))}

      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-[var(--color-border)]/50 px-2 py-1 text-[var(--color-fg)]"
      >
        Reset to defaults
      </button>
    </div>
  )
}
