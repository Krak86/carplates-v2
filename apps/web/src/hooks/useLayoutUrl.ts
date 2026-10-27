import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

import i18n from '@/i18n'
import { useLiveMapView } from '@/hooks/useBackgroundMode'
import { BACKGROUND_MODES, LIVE_STREAMS, isStreamMode, type BackgroundMode } from '@/lib/live-background'
import { useLiveBackgroundStore } from '@/store/live-background-store'
import { setFontParam } from '@/store/ui-store'

export const LAYOUT_PARAM = 'layout'
export const STREAM_PARAM = 'stream'

function parseMode(raw: string | null): BackgroundMode | undefined {
  return BACKGROUND_MODES.find(m => m === raw)
}

/** The layout a link on the current URL asked for — it wins over the signed-in user's saved default layer/stream. */
export function layoutFromLocation(): { mode: BackgroundMode; stream: string | null } | undefined {
  const p = new URLSearchParams(window.location.search)
  const mode = parseMode(p.get(LAYOUT_PARAM))
  return mode ? { mode, stream: p.get(STREAM_PARAM) } : undefined
}

/**
 * Applies a `?layout=` (and `?stream=`) link to the background store. The params live only on the URL they were
 * set on — links and navigation don't carry them, so they reset on every new route.
 */
export function useApplyLayoutFromUrl(): void {
  const [params] = useSearchParams()
  const view = useLiveMapView()
  const setMode = useLiveBackgroundStore(s => s.setMode)
  const setStream = useLiveBackgroundStore(s => s.setStream)
  const setMapView = useLiveBackgroundStore(s => s.setMapView)
  const rawMode = params.get(LAYOUT_PARAM)
  const rawStream = params.get(STREAM_PARAM)

  useEffect(() => {
    const mode = parseMode(rawMode)
    if (!mode) return
    if (mode === 'map') setMapView(view)
    // Only known ids: the value ends up in an iframe src.
    if (isStreamMode(mode) && rawStream && LIVE_STREAMS[mode].some(s => s.id === rawStream)) setStream(mode, rawStream)
    setMode(mode)
    // `view` is deliberately not a dependency: the map pins to the page it was opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMode, rawStream])
}

/** Writes the picked layout (and stream) into the current URL, keeping its other params. */
export function useLayoutUrlActions(): {
  writeLayout: (mode: BackgroundMode, streamId?: string) => void
} {
  const [, setSearchParams] = useSearchParams()

  return {
    writeLayout: (mode, streamId) =>
      setSearchParams(prev => applyLayoutParams(new URLSearchParams(prev), mode, streamId), { replace: true })
  }
}

function applyLayoutParams(p: URLSearchParams, mode: BackgroundMode, streamId?: string): URLSearchParams {
  p.delete(LAYOUT_PARAM)
  p.delete(STREAM_PARAM)
  if (mode !== 'images') p.set(LAYOUT_PARAM, mode)
  if (isStreamMode(mode) && streamId) p.set(STREAM_PARAM, streamId)
  return p
}

/** Shared layouts always open on the (otherwise empty) relax route, carrying the sharer's language. */
export function buildLayoutShareUrl(mode: BackgroundMode, streamId?: string): string {
  const p = applyLayoutParams(new URLSearchParams(), mode, streamId)
  p.set('lang', i18n.language)
  setFontParam(p)
  return `${window.location.origin}/relax?${p.toString()}`
}
