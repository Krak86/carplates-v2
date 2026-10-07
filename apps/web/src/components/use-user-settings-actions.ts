import { useEffect, useRef } from 'react'

import { useSession } from '@/components/auth/use-session'
import { getSettings, putSettings } from '@/lib/api'
import { effectiveBackground } from '@/lib/user-settings'
import { STREAM_MODES } from '@/lib/live-background'
import { useBackgroundStore } from '@/store/background-store'
import { useLiveBackgroundStore } from '@/store/live-background-store'
import { useSettingsStore } from '@/store/settings-store'

/** A local edit is pushed this long after the last one, so dragging a slider is one request. */
const PUSH_DEBOUNCE_MS = 1000
/** Returning to the tab / coming back online re-syncs, but not more often than this. */
const MIN_PULL_INTERVAL_MS = 60_000

/**
 * Wires the signed-in user's settings (/settings) into the app: keeps the local copy and the server document in step
 * (last edit wins, pushed shortly after a change, pulled on sign-in / reconnect / tab focus), then applies them — the
 * default layer and saved streams to the live background, the active preset (or the defaults) to the photo background.
 * Anonymous and offline visitors keep whatever was last applied.
 */
export function useUserSettingsActions(): void {
  const { user } = useSession()
  const userId = user?.id ?? null
  const ownerId = useSettingsStore(s => s.ownerId)
  const settings = useSettingsStore(s => s.settings)
  const ready = !!userId && ownerId === userId

  const lastSyncedAt = useRef(0)
  const lastRunAt = useRef(0)

  useEffect(() => {
    if (!userId) return

    const store = useSettingsStore
    store.getState().claim(userId)
    lastSyncedAt.current = 0

    let timer: ReturnType<typeof setTimeout> | undefined
    let inFlight = false
    let again = false

    // Push when there are unsent local edits, otherwise just pull; adopt the server's document if it is newer.
    const run = async (): Promise<void> => {
      if (inFlight) {
        again = true
        return
      }
      inFlight = true
      lastRunAt.current = Date.now()
      try {
        const local = store.getState()
        const response =
          local.updatedAt > lastSyncedAt.current
            ? await putSettings({ settings: local.settings, updatedAt: local.updatedAt })
            : await getSettings()
        const document = response.document
        if (document) {
          lastSyncedAt.current = document.updatedAt
          if (document.updatedAt > store.getState().updatedAt) store.getState().replace(document)
        }
      } catch {
        // Offline / API down: the edit stays local and goes out with the next change, reconnect or tab focus.
      } finally {
        inFlight = false
        if (again) {
          again = false
          void run()
        }
      }
    }

    const handleChange = (): void => {
      clearTimeout(timer)
      timer = setTimeout(() => void run(), PUSH_DEBOUNCE_MS)
    }
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.updatedAt !== prev.updatedAt && state.updatedAt > lastSyncedAt.current) handleChange()
    })
    const handleOnline = (): void => void run()
    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible' && Date.now() - lastRunAt.current > MIN_PULL_INTERVAL_MS) void run()
    }

    void run()
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
    return (): void => {
      clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [userId])

  // Photo background: the active preset's settings, or the built-in defaults.
  const background = effectiveBackground(settings)
  const replaceBackground = useBackgroundStore(s => s.replace)
  useEffect(() => {
    if (ready) replaceBackground(background)
  }, [ready, background, replaceBackground])

  // Default layer: applied on sign-in and whenever it is changed on /settings. Deliberately not tied to the streams,
  // so picking a stream in the layers panel never switches the layer under the user.
  const defaultMode = settings.defaultMode
  const setMode = useLiveBackgroundStore(s => s.setMode)
  useEffect(() => {
    if (ready) setMode(defaultMode)
  }, [ready, defaultMode, setMode])

  const streams = settings.streams
  const setStream = useLiveBackgroundStore(s => s.setStream)
  useEffect(() => {
    if (!ready) return
    for (const mode of STREAM_MODES) setStream(mode, streams[mode])
  }, [ready, streams, setStream])
}
