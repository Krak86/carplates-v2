/**
 * Registration offices (`dep`) aren't geocoded yet — this searches by name as
 * a stand-in until real coordinates land, without changing the call site.
 */
export function depMapsUrl(dep: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dep)}`
}

// Optional: the official Maps Embed API (free, unlimited) needs a key; without one we fall back to the keyless embed.
const EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY ?? ''
const NEARBY_ZOOM = 13

export type LatLng = { lat: number; lng: number }

// App language codes → Google's `hl`/`language` (Google uses ISO 639-1 `uk`, not `ua`).
function googleLang(lang: string): string {
  return lang === 'ua' ? 'uk' : lang
}

// Location goes in `ll`/`center`, never into `q`: a "… near lat,lng" query makes the keyless embed
// geocode it as a single place and drop the result markers.
export function nearbyEmbedUrl(query: string, at: LatLng, lang: string): string {
  const q = encodeURIComponent(query)
  const hl = googleLang(lang)
  if (EMBED_KEY) {
    return `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(EMBED_KEY)}&q=${q}&center=${at.lat},${at.lng}&zoom=${NEARBY_ZOOM}&language=${hl}`
  }
  return `https://maps.google.com/maps?q=${q}&ll=${at.lat},${at.lng}&z=${NEARBY_ZOOM}&hl=${hl}&output=embed`
}

/** Without coordinates, Google Maps itself falls back to the device's own location (app) or IP (web). */
export function nearbyMapsUrl(query: string, at: LatLng | null): string {
  if (!at) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${at.lat},${at.lng},${NEARBY_ZOOM}z`
}
