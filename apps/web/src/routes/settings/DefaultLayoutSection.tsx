import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { BackgroundMode, StreamMode } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { BACKGROUND_MODES, LIVE_STREAMS, MODE_ICON, STREAM_MODES, isStreamMode } from '@/lib/live-background'
import { useLiveBackgroundStore } from '@/store/live-background-store'
import { useSettingsStore } from '@/store/settings-store'

type Draft = { mode: BackgroundMode; streams: Record<StreamMode, string> }

/** Puts the saved layer + streams back on the live background (drops an unsaved preview). */
function restoreSaved(): void {
  const { defaultMode, streams } = useSettingsStore.getState().settings
  const live = useLiveBackgroundStore.getState()
  live.setMode(defaultMode)
  for (const m of STREAM_MODES) live.setStream(m, streams[m])
}

export default function DefaultLayoutSection(): ReactNode {
  const { t } = useTranslation()
  const saved = useSettingsStore(s => s.settings)
  const setDefaultMode = useSettingsStore(s => s.setDefaultMode)
  const setStream = useSettingsStore(s => s.setStream)
  const setLiveMode = useLiveBackgroundStore(s => s.setMode)
  const setLiveStream = useLiveBackgroundStore(s => s.setStream)

  // Unsaved choice: shown on the real background at once, stored only on Save.
  const [draft, setDraft] = useState<Draft | null>(null)
  const previewing = useRef(false)

  const mode = draft?.mode ?? saved.defaultMode
  const streams = draft?.streams ?? saved.streams
  const changed =
    !!draft && (draft.mode !== saved.defaultMode || STREAM_MODES.some(m => draft.streams[m] !== saved.streams[m]))

  // Leaving the page without saving drops the preview.
  useEffect(
    () => (): void => {
      if (previewing.current) restoreSaved()
    },
    []
  )

  const handleSelect = (m: BackgroundMode): void => {
    previewing.current = true
    setDraft({ mode: m, streams })
    setLiveMode(m)
  }

  const handleStream = (id: string): void => {
    if (!isStreamMode(mode)) return
    previewing.current = true
    setDraft({ mode, streams: { ...streams, [mode]: id } })
    setLiveStream(mode, id)
  }

  const handleSave = (): void => {
    if (!draft) return
    setDefaultMode(draft.mode)
    for (const m of STREAM_MODES) setStream(m, draft.streams[m])
    previewing.current = false
    setDraft(null)
  }

  const handleDiscard = (): void => {
    restoreSaved()
    previewing.current = false
    setDraft(null)
  }

  return (
    <section>
      <h2 className="mb-2 inline-block rounded-lg bg-[var(--color-surface)] px-3 py-1 text-lg font-semibold">
        {t('settings.layout.title')}
      </h2>
      <Card className="p-0">
        <p className="p-4 pb-2 text-sm text-[var(--color-muted)]">{t('settings.layout.intro')}</p>

        <div className="grid gap-2 p-4 pt-2 sm:grid-cols-2">
          {BACKGROUND_MODES.map(m => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => handleSelect(m)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-[var(--color-bg)]',
                mode === m ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
              )}
            >
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--color-bg)] text-2xl"
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

        {isStreamMode(mode) && (
          <label className="flex flex-col gap-1 border-t border-[var(--color-border)] p-4 text-sm">
            {t('settings.layout.stream')}
            <select
              value={streams[mode]}
              onChange={e => handleStream(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
            >
              {LIVE_STREAMS[mode].map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--color-muted)]">{t('settings.layout.streamHint')}</span>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            disabled={!changed}
            onClick={handleSave}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {t('settings.presets.save')}
          </button>
          {draft && (
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 hover:bg-[var(--color-bg)]"
            >
              {t('settings.presets.cancel')}
            </button>
          )}
          {changed && <span className="text-sm text-[var(--color-muted)]">{t('settings.unsaved')}</span>}
        </div>
      </Card>
    </section>
  )
}
