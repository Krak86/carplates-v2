/**
 * `registry.current_registration.color` is free text but, like `kind`, only ever takes one
 * of these 14 exact values across the full real ingest — two of them (`ПОМАРАНЧЕВИЙ
 * (ОРАНЖЕВИЙ)`, `ЖОВТОГАРЯЧИЙ`) are alternate registry spellings of "orange" and collapse
 * onto the same canonical color.
 */
export const VEHICLE_COLORS = [
  'gray',
  'white',
  'black',
  'blue',
  'red',
  'green',
  'beige',
  'brown',
  'yellow',
  'orange',
  'purple'
] as const

export type VehicleColor = (typeof VEHICLE_COLORS)[number]

const COLOR_BY_SOURCE_VALUE: Readonly<Record<string, VehicleColor>> = {
  СІРИЙ: 'gray',
  БІЛИЙ: 'white',
  ЧОРНИЙ: 'black',
  СИНІЙ: 'blue',
  ЧЕРВОНИЙ: 'red',
  ЗЕЛЕНИЙ: 'green',
  БЕЖЕВИЙ: 'beige',
  КОРИЧНЕВИЙ: 'brown',
  ЖОВТИЙ: 'yellow',
  ОРАНЖЕВИЙ: 'orange',
  'ПОМАРАНЧЕВИЙ (ОРАНЖЕВИЙ)': 'orange',
  ЖОВТОГАРЯЧИЙ: 'orange',
  ФІОЛЕТОВИЙ: 'purple'
}

/** Canonical color for a raw registry `color` value, or `null` if unrecognized/absent. */
export function resolveVehicleColor(color: string | null | undefined): VehicleColor | null {
  if (!color) return null
  return COLOR_BY_SOURCE_VALUE[color.trim().toUpperCase()] ?? null
}

/** Mid-tone swatch per canonical color — tuned to stay legible as an icon fill in both themes. */
export const VEHICLE_COLOR_HEX: Readonly<Record<VehicleColor, string>> = {
  gray: '#8b8f98',
  white: '#e8e9ec',
  black: '#2b2d31',
  blue: '#3b6fd1',
  red: '#d1443b',
  green: '#3f9d5c',
  beige: '#cbb896',
  brown: '#7a5233',
  yellow: '#e0bf3a',
  orange: '#dd8a34',
  purple: '#8955c4'
}

/** A hand-picked darker shade of each color, for the two-tone (lit top / shaded underside) vehicle icons. */
export const VEHICLE_COLOR_SHADOW_HEX: Readonly<Record<VehicleColor, string>> = {
  gray: '#6b6f77',
  white: '#c3c5c9',
  black: '#151619',
  blue: '#2a54a8',
  red: '#a8332c',
  green: '#2d7943',
  beige: '#a89873',
  brown: '#583c25',
  yellow: '#b3922a',
  orange: '#ab6a27',
  purple: '#6a4098'
}
