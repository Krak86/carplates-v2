export type BackgroundImage = { id: string; css: string }

// Real photos go in src/assets/backgrounds/cars/ (jpg/jpeg/png/webp) — drop files in,
// no code changes needed, this glob and the component consuming it pick them up as-is.
// Until then (empty dir today), it falls back to generated gradient tiles so the whole
// mechanism — filters, parallax, cycling, the dev panel — is testable without real assets.
const modules = import.meta.glob('/src/assets/backgrounds/cars/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default'
}) as Record<string, string>

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

export function getBackgroundImages(): BackgroundImage[] {
  const real = Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, url]) => ({ id: path, css: `url(${url})` }))

  if (real.length > 0) return real

  return PLACEHOLDER_GRADIENTS.map(([from, to], i) => ({
    id: `placeholder-${i}`,
    css: `linear-gradient(135deg, ${from}, ${to})`
  }))
}
