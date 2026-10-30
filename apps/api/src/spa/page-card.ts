import { STATIC_PAGES } from './spa-text.js'

/** `/og/page/<slug>.png` slug of a static path: `/stats` → `stats`, `/read/vin` → `read--vin`. Null for `/` (the default card). */
export const pageCardSlug = (path: string): string | null => (path === '/' ? null : path.slice(1).replace(/\//g, '--'))

/** The static path a card slug names, or null for an unknown slug (so the route cannot render arbitrary text). */
export const pagePathForSlug = (slug: string): string | null =>
  Object.keys(STATIC_PAGES).find(p => pageCardSlug(p) === slug) ?? null
