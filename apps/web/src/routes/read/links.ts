import type { SizeClass, SizeShape } from '@/components/size/VehicleSize.helpers'

export const READ_PATH = '/read'
export const BODY_TYPES_PATH = '/read/body-types'
export const SIZES_PATH = '/read/sizes'
export const FLEET_PATH = '/read/fleet'
export const PLATES_PATH = '/read/plates'
export const GENERATIONS_PATH = '/read/generations'
export const ELECTRIC_PATH = '/read/electric'
export const IMPORTS_PATH = '/read/imports'
export const SAFETY_PATH = '/read/safety'
export const FUEL_PATH = '/read/fuel'
export const VIN_PATH = '/read/vin'
export const EXTREMES_PATH = '/read/extremes'
export const RECALLS_PATH = '/read/recalls'
export const AUCTIONS_GUIDE_PATH = '/read/auctions'

export const GUIDE_PATHS = [
  BODY_TYPES_PATH,
  SIZES_PATH,
  FLEET_PATH,
  PLATES_PATH,
  VIN_PATH,
  GENERATIONS_PATH,
  ELECTRIC_PATH,
  IMPORTS_PATH,
  SAFETY_PATH,
  FUEL_PATH,
  EXTREMES_PATH,
  RECALLS_PATH,
  AUCTIONS_GUIDE_PATH
] as const
export type GuidePath = (typeof GUIDE_PATHS)[number]

/** Icon, `nav.*` title key and banner hue of each guide: light enough for the card chunks (the long leads stay in articles.ts). */
export const GUIDE_META: Record<GuidePath, { icon: string; titleKey: string; hue: number }> = {
  [BODY_TYPES_PATH]: { icon: '🚙', titleKey: 'nav.readBodyTypes', hue: 250 },
  [SIZES_PATH]: { icon: '📏', titleKey: 'nav.readSizes', hue: 200 },
  [FLEET_PATH]: { icon: '🎨', titleKey: 'nav.readFleet', hue: 330 },
  [PLATES_PATH]: { icon: '🔢', titleKey: 'nav.readPlates', hue: 60 },
  [VIN_PATH]: { icon: '🪪', titleKey: 'nav.readVin', hue: 285 },
  [GENERATIONS_PATH]: { icon: '🧬', titleKey: 'nav.readGenerations', hue: 150 },
  [ELECTRIC_PATH]: { icon: '🔌', titleKey: 'nav.readElectric', hue: 175 },
  [IMPORTS_PATH]: { icon: '🚢', titleKey: 'nav.readImports', hue: 230 },
  [SAFETY_PATH]: { icon: '🛡️', titleKey: 'nav.readSafety', hue: 25 },
  [FUEL_PATH]: { icon: '⛽', titleKey: 'nav.readFuel', hue: 100 },
  [EXTREMES_PATH]: { icon: '🏆', titleKey: 'nav.readExtremes', hue: 80 },
  [RECALLS_PATH]: { icon: '🔧', titleKey: 'nav.readRecalls', hue: 45 },
  [AUCTIONS_GUIDE_PATH]: { icon: '🔨', titleKey: 'nav.readAuctions', hue: 15 }
}

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
