import { REGION_CENTERS } from '@/lib/region-centers'

export const BACKGROUND_MODES = ['images', 'map', 'earth', 'traffic', 'city'] as const
export type BackgroundMode = (typeof BACKGROUND_MODES)[number]

export type MapView = { lat: number; lon: number; zoom: number }

const CITY_ZOOM = 13
/** Whole-country view, used when the plate has no region (DІ/ЕD series, unknown prefix, no plate). */
const UKRAINE_VIEW: MapView = { lat: 48.6, lon: 31.2, zoom: 6 }

/** The region's capital as a city-level view; the Ukraine overview when the region is unknown. */
export function mapViewFor(region: string | undefined): MapView {
  const center = region ? REGION_CENTERS[region] : undefined
  return center ? { lat: center[0], lon: center[1], zoom: CITY_ZOOM } : UKRAINE_VIEW
}

/** Google Maps (keyless embed), centred on the view. (No live traffic: Google serves none inside Ukraine.) */
export function mapUrl({ lat, lon, zoom }: MapView): string {
  return `https://maps.google.com/maps?ll=${lat},${lon}&z=${zoom}&t=m&hl=uk&output=embed`
}

/** Travic (moving vehicles) refuses to be embedded, so the panel links out to it in a new tab. Coordinates are Web Mercator metres. */
export function travicUrl({ lat, lon }: MapView): string {
  const R = 6378137
  const x = R * ((lon * Math.PI) / 180)
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  return `https://travic.app/?z=12&x=${x.toFixed(1)}&y=${y.toFixed(1)}&l=osm_standard`
}

/** Single-segment paths that are app pages, not a plate/VIN query. */
const APP_PAGES = new Set(['about', 'history', 'favorites', 'stats', 'fuel', 'safety', 'news', 'discuss', 'advanced-search'])

/** True on a plate/VIN result route (`/:query`) — the only place the layers UI is offered. */
export function isResultPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length === 1 && !APP_PAGES.has(segments[0]!)
}

/** Layers that play a YouTube live stream picked from a selector (the rest are photos / the map). */
export const STREAM_MODES = ['earth', 'traffic', 'city'] as const
export type StreamMode = (typeof STREAM_MODES)[number]

export function isStreamMode(mode: BackgroundMode): mode is StreamMode {
  return (STREAM_MODES as readonly string[]).includes(mode)
}

export type LiveStream = { id: string; label: string }

/** YouTube live streams offered by each stream layer — add an entry to extend its selector. */
export const LIVE_STREAMS: Readonly<Record<StreamMode, readonly LiveStream[]>> = {
  earth: [
    { id: 'M3HKLzjvKPc', label: 'NASA · ISS live video' },
    { id: 'awQzjn72bI0', label: 'NASA · ISS live HD' },
    { id: '4QJEibrt9B8', label: 'Dream Trips · ISS live 24/7' }
  ],
  traffic: [
    { id: 'ZMcmtGYYg5E', label: 'Brazil · traffic 1' },
    { id: 'wMLsmSVkJwE', label: 'Brazil · traffic 2' },
    { id: 'nEN03dHPVsI', label: 'Brazil · traffic 3' },
    { id: 'z545k7Tcb5o', label: 'France · traffic' },
    { id: 'pmM2CeSAx0I', label: 'Taiwan · traffic' },
    { id: 'yn_8QwCWsyI', label: 'Taiwan · traffic cams' },
    { id: 'xrYXDI5uAoA', label: 'Spain · traffic cams' },
    { id: 'z-J2i32DUOE', label: 'USA · traffic cams 1' },
    { id: 'uCbwWg_hr0A', label: 'USA · traffic cams 2' },
    { id: 'sTF-6_xinUU', label: 'USA · traffic cams 3' }
  ],
  city: [{ id: 'z_fY1pj1VBw', label: 'Taiwan · city' }]
}

/** Explicit, not `LIVE_STREAMS[mode][0]` — list order is presentation, the default is semantics. */
export const DEFAULT_STREAMS: Readonly<Record<StreamMode, string>> = {
  earth: 'M3HKLzjvKPc',
  traffic: 'ZMcmtGYYg5E',
  city: 'z_fY1pj1VBw'
}

/** The stream is rendered at this tiny size and scaled up to cover the viewport: YouTube picks the quality from the player size, so this keeps bandwidth low. */
export const STREAM_PLAYER_SIZE = { width: 480, height: 270 } as const

export function streamEmbedUrl(videoId: string): string {
  return (
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    '?autoplay=1&mute=1&controls=0&disablekb=1&playsinline=1&rel=0&modestbranding=1'
  )
}
