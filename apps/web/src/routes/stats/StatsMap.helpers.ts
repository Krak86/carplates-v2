export type LogoChip = { key: string; cx: number; cy: number; size: number }

export type PlacedLogo = LogoChip & {
  /** Chip centre after spreading; equals `cx`/`cy` when nothing overlapped. */
  x: number
  y: number
  /** True when the chip moved far enough from its region centroid to need a leader line. */
  displaced: boolean
}

const PADDING = 2
const ITERATIONS = 60
const LEADER_MIN_DISTANCE = 6

/** Pushes overlapping square chips apart (the bigger one moves less) and clamps them into the map box. */
export function spreadLogos(chips: LogoChip[], width: number, height: number): PlacedLogo[] {
  const placed = chips.map(c => ({ ...c, x: c.cx, y: c.cy }))

  for (let step = 0; step < ITERATIONS; step++) {
    let moved = false
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]
        const b = placed[j]
        if (!a || !b) continue
        const minDistance = (a.size + b.size) / 2 + PADDING
        const dx = b.x - a.x
        const dy = b.y - a.y
        const overlapX = minDistance - Math.abs(dx)
        const overlapY = minDistance - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue
        moved = true
        const weightA = b.size / (a.size + b.size)
        // Separate along the axis with the smaller overlap; a tie-break direction keeps identical centres apart.
        if (overlapX < overlapY) {
          const dir = dx === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dx)
          a.x -= dir * overlapX * weightA
          b.x += dir * overlapX * (1 - weightA)
        } else {
          const dir = dy === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dy)
          a.y -= dir * overlapY * weightA
          b.y += dir * overlapY * (1 - weightA)
        }
      }
    }
    for (const p of placed) {
      p.x = Math.min(width - p.size / 2, Math.max(p.size / 2, p.x))
      p.y = Math.min(height - p.size / 2, Math.max(p.size / 2, p.y))
    }
    if (!moved) break
  }

  return placed.map(p => ({ ...p, displaced: Math.hypot(p.x - p.cx, p.y - p.cy) > LEADER_MIN_DISTANCE }))
}

export const MAP_MODES = ['brand', 'model', 'fuel', 'origin', 'ev'] as const
export type MapMode = (typeof MAP_MODES)[number]
export const DEFAULT_MAP_MODE: MapMode = 'brand'

export function parseMapMode(raw: string | null): MapMode {
  return MAP_MODES.find(m => m === raw) ?? DEFAULT_MAP_MODE
}

type Entry = { value: string; n: number }

/** The per-region numbers a marker is built from: `brands` from the region-brand rollup, the rest from the region-facet one. */
export type RegionMarkerData = {
  fleet: number
  brands: { brand: string; n: number }[]
  models: Entry[]
  fuels: Entry[]
  origins: Entry[]
}

export type MarkerLabels = {
  fuel: (fuelClass: string) => string
  country: (code: string) => string
}

export type RegionMarker = {
  /** Logo or flag image; null for a text-only marker. */
  src: string | null
  /** Text drawn in the chip when there is no image (a percentage, a fuel name or a country code). */
  text: string | null
  /** Chip fill when it is a coloured text chip; null = white. */
  color: string | null
  /** One line for the tooltip: the top few entries with their share of the region's fleet. */
  summary: string
}

/** The fuel classes drawn as a coloured chip, with a `--label-N` token each (sRGB fallback and HDR variants live in global.css). */
const FUEL_COLORS: Record<string, string> = {
  petrol: 'var(--label-1)',
  diesel: 'var(--label-7)',
  gas: 'var(--label-3)',
  electric: 'var(--label-5)',
  hybrid: 'var(--label-4)',
  hydrogen: 'var(--label-8)'
}
const TOOLTIP_ENTRIES = 3

/** The logo of a "BRAND MODEL" name: the longest leading words that name a brand ("LAND ROVER DEFENDER" -> "LAND ROVER"). */
function logoOfModel(value: string, logoOf: (brand: string) => string | null): string | null {
  const words = value.split(' ')
  for (let i = words.length - 1; i >= 1; i--) {
    const src = logoOf(words.slice(0, i).join(' '))
    if (src) return src
  }
  return null
}

export function percent(part: number, whole: number, locale: string): string {
  if (whole <= 0) return ''
  const share = part / whole
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: share < 0.1 ? 1 : 0 }).format(share)
}

/**
 * What to draw for one region in a map mode, or null when the region has no data for it. `logoOf` and `flagOf` map a brand name /
 * country code to an image path (null = none).
 */
export function regionMarker(
  mode: MapMode,
  data: RegionMarkerData,
  labels: MarkerLabels,
  logoOf: (brand: string) => string | null,
  flagOf: (code: string) => string | null,
  locale: string
): RegionMarker | null {
  const share = (n: number): string => percent(n, data.fleet, locale)
  const line = (items: { label: string; n: number }[]): string =>
    items
      .slice(0, TOOLTIP_ENTRIES)
      .map(i => `${i.label} ${share(i.n)}`.trim())
      .join(', ')

  if (mode === 'brand') {
    const top = data.brands[0]
    if (!top) return null
    return {
      src: logoOf(top.brand),
      text: null,
      color: null,
      summary: line(data.brands.map(b => ({ label: b.brand, n: b.n })))
    }
  }

  if (mode === 'model') {
    const top = data.models[0]
    if (!top) return null
    return {
      src: logoOfModel(top.value, logoOf),
      text: null,
      color: null,
      summary: line(data.models.map(m => ({ label: m.value, n: m.n })))
    }
  }

  if (mode === 'origin') {
    const top = data.origins[0]
    if (!top) return null
    const src = flagOf(top.value)
    return {
      src,
      text: src ? null : top.value,
      color: null,
      summary: line(data.origins.map(o => ({ label: labels.country(o.value), n: o.n })))
    }
  }

  if (mode === 'fuel') {
    const top = data.fuels[0]
    if (!top) return null
    return {
      src: null,
      text: labels.fuel(top.value),
      color: FUEL_COLORS[top.value] ?? null,
      summary: line(data.fuels.map(f => ({ label: labels.fuel(f.value), n: f.n })))
    }
  }

  // ev: the electric-only share; hybrids are listed in the tooltip, not counted
  const electric = data.fuels.find(f => f.value === 'electric')?.n ?? 0
  const hybrid = data.fuels.find(f => f.value === 'hybrid')?.n ?? 0
  if (data.fleet <= 0) return null
  return {
    src: null,
    text: share(electric),
    color: FUEL_COLORS.electric ?? null,
    summary: `${labels.fuel('electric')} ${share(electric)}, ${labels.fuel('hybrid')} ${share(hybrid)}`
  }
}
