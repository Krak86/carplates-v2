import { catalogSlugSchema, isShareAlias, type ShareAlias } from '@carplates/shared'

import { STATIC_PAGES } from './spa-text.js'

/** `/og/page/<slug>.png` slug of a static path: `/stats` → `stats`, `/read/vin` → `read--vin`. Null for `/` (the default card). */
export const pageCardSlug = (path: string): string | null => (path === '/' ? null : path.slice(1).replace(/\//g, '--'))

/** The static path a card slug names, or null for an unknown slug (so the route cannot render arbitrary text). */
export const pagePathForSlug = (slug: string): string | null =>
  Object.keys(STATIC_PAGES).find(p => pageCardSlug(p) === slug) ?? null

const GO_CARD_PREFIX = 'go'

/** `/og/page/<slug>.png` slug of a share alias: `ar` → `go--ar`. */
export const shareAliasCardSlug = (alias: ShareAlias): string => `${GO_CARD_PREFIX}--${alias}`

/** The share alias a card slug names, or null when it is not one. */
export function shareAliasOfCard(slug: string): ShareAlias | null {
  const [root, alias, ...rest] = slug.split('--')
  return root === GO_CARD_PREFIX && rest.length === 0 && isShareAlias(alias) ? alias : null
}

const CARS_PREFIX = 'cars'

/** `/og/page/<slug>.png` slug of a catalog page: `bmw` + `3series` → `cars--bmw--3series` (slugs never contain a double hyphen). */
export const catalogPageSlug = (make: string, model: string): string => `${CARS_PREFIX}--${make}--${model}`

const slugOk = catalogSlugSchema.safeParse.bind(catalogSlugSchema)

/** The make and model of a `/cars/:make/:model` path (a trailing slash is fine), or null for any other path or an invalid slug. */
export function catalogSlugsOfPath(pathname: string): { make: string; model: string } | null {
  const [root, make, model, ...rest] = pathname.split('/').filter(Boolean)
  if (root !== CARS_PREFIX || !make || !model || rest.length > 0) return null
  return slugOk(make).success && slugOk(model).success ? { make, model } : null
}

/** The make and model a catalog card slug names, or null when it is not one. */
export function catalogSlugsOfCard(slug: string): { make: string; model: string } | null {
  const [root, make, model, ...rest] = slug.split('--')
  return root === CARS_PREFIX && make && model && rest.length === 0
    ? catalogSlugsOfPath(`/cars/${make}/${model}`)
    : null
}
