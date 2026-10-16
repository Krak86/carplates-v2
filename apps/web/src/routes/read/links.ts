import type { SizeClass, SizeShape } from '@/components/size/VehicleSize.helpers'

export const READ_PATH = '/read'
export const BODY_TYPES_PATH = '/read/body-types'
export const SIZES_PATH = '/read/sizes'
export const FLEET_PATH = '/read/fleet'
export const PLATES_PATH = '/read/plates'
export const GENERATIONS_PATH = '/read/generations'
export const ELECTRIC_PATH = '/read/electric'
export const IMPORTS_PATH = '/read/imports'

/** Shapes the body-types article has a card for (the plate card links only these). */
export const BODY_GUIDE_SHAPES = ['sedan', 'hatch', 'wagon', 'coupe', 'suv', 'mpv', 'van', 'pickup'] as const
export type BodyGuideShape = (typeof BODY_GUIDE_SHAPES)[number]

/** The article card for a shape the plate card resolved (a generic `car` outline has none). */
export const bodyGuideShape = (shape: SizeShape | null | undefined): BodyGuideShape | null =>
  BODY_GUIDE_SHAPES.find(s => s === shape) ?? null

/** Element id of a body-shape card on /read/body-types (the `?shape=` target). */
export const shapeAnchor = (shape: SizeShape): string => `shape-${shape}`

type SizesLink = { shape?: SizeShape | null; cls?: SizeClass | null; brand?: string | null; model?: string | null }

/** Deep links into the articles; the plate card and the articles themselves build every URL here. */
export const readHref = {
  /** The body-types article, scrolled to (and highlighting) the card of one shape. */
  bodyTypes: (shape?: SizeShape | null): string => {
    const params = new URLSearchParams()
    if (shape) params.set('shape', shape)
    const query = params.toString()
    return query ? `${BODY_TYPES_PATH}?${query}` : BODY_TYPES_PATH
  },

  /** The size explorer, preset to a shape / segment and highlighting one model ("cars like this one"). */
  sizes: ({ shape, cls, brand, model }: SizesLink = {}): string => {
    const params = new URLSearchParams()
    if (shape) params.set('shape', shape)
    if (cls) params.set('class', cls)
    if (brand) params.set('brand', brand)
    if (model) params.set('model', model)
    const query = params.toString()
    return `${SIZES_PATH}${query ? `?${query}` : ''}#explorer`
  }
}
