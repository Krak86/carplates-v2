import { useEffect, useState } from 'react'

import { roundCoord } from '@/components/NearbyServices.helpers'
import type { LatLng } from '@/lib/maps'

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'unsupported'

type UseNearbyLocationActions = {
  status: LocationStatus
  coords: LatLng | null
  handleRequestLocation: () => void
}

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }

// Geolocation only exists in a secure context (https or localhost) — plain-http LAN dev URLs don't get it.
function isGeolocationSupported(): boolean {
  return window.isSecureContext && 'geolocation' in navigator
}

/**
 * Browser geolocation for the nearby-services map. The permission prompt is only ever triggered from
 * `handleRequestLocation` (called from a click), never on mount — browsers penalise unprompted requests.
 */
export function useNearbyLocationActions(): UseNearbyLocationActions {
  const [status, setStatus] = useState<LocationStatus>(() => (isGeolocationSupported() ? 'idle' : 'unsupported'))
  const [coords, setCoords] = useState<LatLng | null>(null)

  // Reflect the current permission (and live changes to it from the browser's site settings) without prompting.
  useEffect(() => {
    if (!isGeolocationSupported() || !navigator.permissions) return
    let permission: PermissionStatus | null = null
    let cancelled = false
    const handleChange = (): void => {
      if (permission?.state === 'denied') setStatus('denied')
      else setStatus(s => (s === 'denied' ? 'idle' : s))
    }
    navigator.permissions
      .query({ name: 'geolocation' })
      .then(p => {
        if (cancelled) return
        permission = p
        p.addEventListener('change', handleChange)
        handleChange()
      })
      .catch(() => {
        /* Permissions API unsupported for geolocation (older Safari) — the prompt still works */
      })
    return (): void => {
      cancelled = true
      permission?.removeEventListener('change', handleChange)
    }
  }, [])

  const handleRequestLocation = (): void => {
    if (!isGeolocationSupported()) return
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude) })
        setStatus('ready')
      },
      err => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      GEO_OPTIONS
    )
  }

  return { status, coords, handleRequestLocation }
}
