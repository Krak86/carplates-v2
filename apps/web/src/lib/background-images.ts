export type BackgroundImage = { id: string; css: string }

// Real photos go in src/assets/backgrounds/cars/ (jpg/jpeg/png/webp) — drop files in,
// no code changes needed, this glob and the component consuming it pick them up as-is.
// vite-imagetools re-encodes each one to AVIF + WebP at import time (full-size originals are 0.5-5 MB).
// Until then (empty dir today), it falls back to generated gradient tiles so the whole
// mechanism — filters, parallax, cycling, the dev panel — is testable without real assets.
const avifModules = import.meta.glob('/src/assets/backgrounds/cars/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
  query: '?w=1920&format=avif&quality=50'
}) as Record<string, string>
const webpModules = import.meta.glob('/src/assets/backgrounds/cars/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
  query: '?w=1920&format=webp&quality=70'
}) as Record<string, string>

// `image-set()` with `type()` lets the browser fetch only the first format it can decode (AVIF, else WebP).
// A browser that can't parse it would drop the whole declaration, so it gets the plain WebP `url()` instead.
const SUPPORTS_IMAGE_SET_TYPE =
  typeof CSS !== 'undefined' && CSS.supports('background-image', 'image-set(url(a.avif) type("image/avif"))')

function toCss(avifUrl: string | undefined, webpUrl: string): string {
  if (!avifUrl || !SUPPORTS_IMAGE_SET_TYPE) return `url(${webpUrl})`
  return `image-set(url(${avifUrl}) type("image/avif"), url(${webpUrl}) type("image/webp"))`
}

const PLACEHOLDER_GRADIENTS: readonly (readonly [string, string])[] = [
  ['#1e3a5f', '#4a6fa5'],
  ['#3d2645', '#7b4b94'],
  ['#0f3d3e', '#2d8a8a'],
  ['#4a1942', '#a63d6e'],
  ['#1a3a2e', '#4a7c59'],
  ['#3a2517', '#8b5a2b'],
  ['#1f2b4a', '#5470b5'],
  ['#4a2c2a', '#a15c4f'],
  ['#2b1f3d', '#6b4f9e'],
  ['#0d3b47', '#2f8f9d'],
  ['#3d1f2b', '#8f3d5c'],
  ['#1c2b1f', '#4f7a5c']
]

// Shown first on load (the rest follow alphabetically in the rotation).
const FIRST_IMAGE = 'quilia-FcyipqujfGg-unsplash-crop.jpg'

export function getBackgroundImages(): BackgroundImage[] {
  const real = Object.entries(webpModules)
    .sort(([a], [b]) => Number(b.endsWith(FIRST_IMAGE)) - Number(a.endsWith(FIRST_IMAGE)) || a.localeCompare(b))
    .map(([path, webpUrl]) => ({ id: path, css: toCss(avifModules[path], webpUrl) }))

  if (real.length > 0) return real

  return PLACEHOLDER_GRADIENTS.map(([from, to], i) => ({
    id: `placeholder-${i}`,
    css: `linear-gradient(135deg, ${from}, ${to})`
  }))
}
