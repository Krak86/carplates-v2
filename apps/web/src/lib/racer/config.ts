import { type VehicleKind } from '@carplates/shared'

export const CAR_BODIES = ['sedan', 'hatch', 'suv', 'sport', 'pickup', 'van', 'moto'] as const
export type CarBody = (typeof CAR_BODIES)[number]

export const SCENERIES = ['day', 'sunset', 'night', 'winter'] as const
export type SceneryId = (typeof SCENERIES)[number]

export const LANE_OPTIONS = [2, 3, 4] as const
export type Lanes = (typeof LANE_OPTIONS)[number]

export const TRAFFIC_LEVELS = ['few', 'normal', 'many'] as const
export type TrafficLevel = (typeof TRAFFIC_LEVELS)[number]

export const QUALITIES = ['low', 'medium', 'high'] as const
export type Quality = (typeof QUALITIES)[number]

export const DEFAULT_BODY: CarBody = 'sedan'
export const DEFAULT_LANES: Lanes = 3
export const DEFAULT_TRAFFIC: TrafficLevel = 'normal'
export const DEFAULT_QUALITY: Quality = 'medium'

export const TRAFFIC_COUNT: Readonly<Record<TrafficLevel, number>> = { few: 80, normal: 200, many: 350 }
export const QUALITY_SIZE: Readonly<Record<Quality, readonly [number, number]>> = {
  low: [640, 480],
  medium: [1024, 768],
  high: [1280, 960]
}

/** Approximate gzipped size of the lazy game chunk, shown before the download is confirmed. */
export const RACER_SIZE_KB = 10

export type RacerConfig = {
  /** `#rrggbb` body colour of the player's car. */
  color: string
  body: CarBody
  scenery: SceneryId
  lanes: Lanes
  traffic: TrafficLevel
  quality: Quality
  /** Printed on the player's number plate and on one of the roadside billboards. */
  plate: string
}

export type RacerHud = {
  /** km/h */
  speed: number
  lap: string
  last: string | null
  best: string | null
  /** True while `last` is a new personal best. */
  record: boolean
}

export type RoadColor = { road: string; grass: string; rumble: string; lane?: string }

export type Theme = {
  skyStops: readonly (readonly [number, string])[]
  hills: string
  trees: string
  fog: string
  light: RoadColor
  dark: RoadColor
  leaf: readonly [string, string]
  trunk: string
  stars: boolean
  clouds: boolean
  snow: boolean
  flowers: boolean
}

export const THEMES: Readonly<Record<SceneryId, Theme>> = {
  day: {
    skyStops: [
      [0, '#3f9bea'],
      [1, '#c4ecf8']
    ],
    hills: '#5f8fb8',
    trees: '#1d6b2b',
    fog: '#7fc58a',
    light: { road: '#6b6b6b', grass: '#10aa10', rumble: '#555555', lane: '#cccccc' },
    dark: { road: '#696969', grass: '#009a00', rumble: '#bbbbbb' },
    leaf: ['#1f7a2e', '#3fae4d'],
    trunk: '#6b4a2b',
    stars: false,
    clouds: true,
    snow: false,
    flowers: true
  },
  sunset: {
    skyStops: [
      [0, '#2b1b5a'],
      [0.55, '#e0566b'],
      [1, '#ffd27a']
    ],
    hills: '#4a2a5e',
    trees: '#1f2a35',
    fog: '#5a3a5a',
    light: { road: '#5f5a66', grass: '#2f8a2a', rumble: '#4a4650', lane: '#e8d9c8' },
    dark: { road: '#5d5864', grass: '#287a24', rumble: '#d8c8c0' },
    leaf: ['#25652c', '#3e8a43'],
    trunk: '#4d3426',
    stars: false,
    clouds: true,
    snow: false,
    flowers: true
  },
  night: {
    skyStops: [
      [0, '#040816'],
      [1, '#1a2c55']
    ],
    hills: '#0e1a33',
    trees: '#07140f',
    fog: '#050a1f',
    light: { road: '#3a3a40', grass: '#0c4a1c', rumble: '#2e2e33', lane: '#b8b8c0' },
    dark: { road: '#38383d', grass: '#0a3f18', rumble: '#777780' },
    leaf: ['#0f3a1c', '#1a5a2c'],
    trunk: '#2a1d14',
    stars: true,
    clouds: false,
    snow: false,
    flowers: false
  },
  winter: {
    skyStops: [
      [0, '#8fb0cc'],
      [1, '#eaf2f8']
    ],
    hills: '#c5d3e2',
    trees: '#3c5c4a',
    fog: '#dbe6ef',
    light: { road: '#5c5f66', grass: '#f3f6f9', rumble: '#444444', lane: '#dddddd' },
    dark: { road: '#5a5d64', grass: '#e4eaf0', rumble: '#cccccc' },
    leaf: ['#2f5a45', '#4a7a60'],
    trunk: '#5a4636',
    stars: false,
    clouds: true,
    snow: true,
    flowers: false
  }
}

/** The body type that matches the looked-up vehicle, as the starting choice. */
export function bodyForKind(kind: VehicleKind | null): CarBody {
  switch (kind) {
    case 'truck':
      return 'pickup'
    case 'bus':
      return 'van'
    case 'motorcycle':
    case 'moped':
    case 'motoTricycle':
    case 'tricycle':
    case 'quad':
      return 'moto'
    default:
      return DEFAULT_BODY
  }
}

/**
 * Starting scenery from the viewer's local clock (their browser's time zone). Winter is never picked automatically —
 * it is a look, not a time of day — but stays selectable in the settings.
 */
export function sceneryForHour(hour: number): SceneryId {
  if (hour >= 7 && hour < 18) return 'day'
  if (hour >= 18 && hour < 21) return 'sunset'
  return 'night'
}

/** Settings (everything but the plate, which comes from the page) as one compact share-link token. */
export function encodeRaceConfig(c: RacerConfig): string {
  return [c.body, c.scenery, c.lanes, c.traffic, c.quality, c.color.slice(1)].join('-')
}

/** Reads a share-link token back; every part is validated, anything unknown is dropped (it is external input). */
export function decodeRaceConfig(token: string | null): Partial<Omit<RacerConfig, 'plate'>> {
  const [body, scenery, lanes, traffic, quality, color] = (token ?? '').split('-')
  const out: Partial<Omit<RacerConfig, 'plate'>> = {}
  const body_ = CAR_BODIES.find(v => v === body)
  if (body_) out.body = body_
  const scenery_ = SCENERIES.find(v => v === scenery)
  if (scenery_) out.scenery = scenery_
  const lanes_ = LANE_OPTIONS.find(v => String(v) === lanes)
  if (lanes_) out.lanes = lanes_
  const traffic_ = TRAFFIC_LEVELS.find(v => v === traffic)
  if (traffic_) out.traffic = traffic_
  const quality_ = QUALITIES.find(v => v === quality)
  if (quality_) out.quality = quality_
  if (color && /^[0-9a-f]{6}$/i.test(color)) out.color = `#${color.toLowerCase()}`
  return out
}
