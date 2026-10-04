import { useLocation } from 'react-router'
import { normalizePlate, regionName } from '@carplates/shared'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { isResultPath, mapViewFor, type BackgroundMode, type MapView } from '@/lib/live-background'
import { useLiveBackgroundStore } from '@/store/live-background-store'

/** Live modes need the network and a plate/VIN result on screen — otherwise it resolves to the photos. */
export function useBackgroundMode(): BackgroundMode {
  const online = useOnlineStatus()
  const mode = useLiveBackgroundStore(s => s.mode)
  const { pathname } = useLocation()
  return online && isResultPath(pathname) ? mode : 'images'
}

function regionFromSegment(raw: string): string | undefined {
  try {
    return raw ? regionName(normalizePlate(decodeURIComponent(raw))) : undefined
  } catch {
    return undefined
  }
}

/** Map view for the plate on screen: its region's capital, else the whole of Ukraine. */
export function useLiveMapView(): MapView {
  const { pathname } = useLocation()
  return mapViewFor(regionFromSegment(pathname.split('/')[1] ?? ''))
}
