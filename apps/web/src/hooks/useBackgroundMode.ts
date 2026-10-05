import { useLocation } from 'react-router'
import { normalizePlate, regionName } from '@carplates/shared'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { usePoorConnection } from '@/hooks/usePoorConnection'
import { isResultPath, isStreamMode, mapViewFor, type BackgroundMode, type MapView } from '@/lib/live-background'
import { useLiveBackgroundStore } from '@/store/live-background-store'

/**
 * Live modes need the network — offline it resolves to the photos. The YouTube stream layers also fall back to the
 * photos on a poor connection and start by themselves once it improves (the picked mode is kept).
 */
export function useBackgroundMode(): BackgroundMode {
  const online = useOnlineStatus()
  const poor = usePoorConnection()
  const mode = useLiveBackgroundStore(s => s.mode)
  if (!online || (poor && isStreamMode(mode))) return 'images'
  return mode
}

function regionFromSegment(raw: string): string | undefined {
  try {
    return raw ? regionName(normalizePlate(decodeURIComponent(raw))) : undefined
  } catch {
    return undefined
  }
}

/** Map view for the page on screen: the plate's region capital on a result page, else the whole of Ukraine. */
export function useLiveMapView(): MapView {
  const { pathname } = useLocation()
  return mapViewFor(isResultPath(pathname) ? regionFromSegment(pathname.split('/')[1] ?? '') : undefined)
}
