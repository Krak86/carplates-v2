import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/components/auth/use-session'
import { useLiveMapView } from '@/hooks/useBackgroundMode'
import { usePoorConnection } from '@/hooks/usePoorConnection'
import { cn } from '@/lib/cn'
import {
  BACKGROUND_MODES,
  LIVE_STREAMS,
  MODE_ICON,
  isStreamMode,
  travicUrl,
  type BackgroundMode,
  type StreamMode
} from '@/lib/live-background'
import { useLiveBackgroundStore } from '@/store/live-background-store'
import { useSettingsStore } from '@/store/settings-store'

// Lazy-loaded (see LayersButton.tsx).
export default function LayersPanel(): ReactNode {
  const { t } = useTranslation()
  const mode = useLiveBackgroundStore(s => s.mode)
  const setMode = useLiveBackgroundStore(s => s.setMode)
  const streams = useLiveBackgroundStore(s => s.streams)
  const setStream = useLiveBackgroundStore(s => s.setStream)
  const { user } = useSession()
  const saveStream = useSettingsStore(s => s.setStream)
  const setMapView = useLiveBackgroundStore(s => s.setMapView)
  const view = useLiveMapView()
  const poor = usePoorConnection()

  // The map is pinned to the page it was picked on (region capital, else all of Ukraine); picking it again re-pins it.
  const handleSelect = (m: BackgroundMode): void => {
    if (m === 'map') setMapView(view)
    setMode(m)
  }

  // For a signed-in user a picked video source becomes their saved stream for that layer (/settings, synced).
  const handleStreamChange = (m: StreamMode, id: string): void => {
    setStream(m, id)
    if (user) saveStream(m, id)
  }

  return (
    <div className="w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-lg">
      <div className="flex flex-col gap-1.5">
        {BACKGROUND_MODES.map(m => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            disabled={poor && isStreamMode(m)}
            onClick={() => handleSelect(m)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:hover:bg-transparent',
              mode === m ? 'border-[var(--color-primary)]' : 'border-transparent'
            )}
          >
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface)] text-2xl"
            >
              {MODE_ICON[m]}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t(`layers.${m}.title`)}</span>
              <span className="block text-xs text-[var(--color-muted)]">{t(`layers.${m}.text`)}</span>
            </span>
          </button>
        ))}
      </div>

      {poor && (
        <p
          role="status"
          className="mt-2 border-t border-[var(--color-border)] px-1 pt-2 text-xs text-[var(--color-muted)]"
        >
          {t('layers.poorConnection')}
        </p>
      )}

      {isStreamMode(mode) && (
        <label className="mt-2 flex flex-col gap-1 border-t border-[var(--color-border)] px-1 pt-2 text-xs">
          {t('layers.stream.label')}
          <select
            value={streams[mode]}
            onChange={e => handleStreamChange(mode, e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
          >
            {LIVE_STREAMS[mode].map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {mode === 'map' && (
        <a
          href={travicUrl(view)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block border-t border-[var(--color-border)] px-1 pt-2 text-xs text-[var(--color-primary)] underline hover:no-underline"
        >
          {t('layers.map.travic')}
        </a>
      )}
    </div>
  )
}
