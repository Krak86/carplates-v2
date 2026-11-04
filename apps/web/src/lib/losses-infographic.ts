import type { LossCategory } from '@carplates/shared'

/** One infographic line: all text is already translated / formatted by the caller. */
export type InfographicRow = { category: LossCategory; name: string; total: string; change: string | null }

export type InfographicInput = {
  title: string
  /** e.g. "As of 4 November 2026 - day 1715". */
  subtitle: string
  rows: readonly InfographicRow[]
  /** The "approximate figures" disclaimer; wrapped to the card width. */
  footer: string
  /** Short source line, e.g. "carsua.app / General Staff via russianwarship.rip". */
  credit: string
}

/** Canvas has no emoji font control: the system emoji font draws these. */
export const LOSS_ICONS: Record<LossCategory, string> = {
  personnel_units: '🪖',
  tanks: '🛡️',
  armoured_fighting_vehicles: '🚙',
  artillery_systems: '💣',
  mlrs: '🚀',
  aa_warfare_systems: '📡',
  planes: '✈️',
  helicopters: '🚁',
  vehicles_fuel_tanks: '🚚',
  warships_cutters: '🚢',
  cruise_missiles: '🎯',
  uav_systems: '🛸',
  special_military_equip: '🔧',
  atgm_srbm_systems: '🧨',
  submarines: '⚓'
}

export const INFOGRAPHIC_WIDTH = 1080
const HEADER = 210
const ROW = 74
const FOOTER = 150

export const infographicHeight = (rowCount: number): number => HEADER + rowCount * ROW + FOOTER

export const infographicFileName = (isoDate: string): string => `russian-losses-${isoDate}.png`

// Canvas has no CSS variables, so the palette is fixed (dark card, red accent) and the same in light and dark mode.
const BG = '#0f131a'
const ROW_BG = '#171c26'
const TEXT = '#f2f4f8'
const MUTED = '#8d97a8'
const ACCENT = '#ff4d4f'

/** Splits text into lines no wider than `maxWidth` (measured with the context's current font). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Draws the single-shot infographic (one line per category) and returns it as a PNG. Null when the canvas is unavailable. */
export async function renderLossesInfographic(input: InfographicInput): Promise<Blob | null> {
  try {
    await document.fonts?.ready
  } catch {
    // fonts API missing: system fonts are fine
  }
  const width = INFOGRAPHIC_WIDTH
  const height = infographicHeight(input.rows.length)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const sans = 'system-ui, "Segoe UI", Roboto, sans-serif'
  const pad = 44

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)
  // accent bar on top
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, 0, width, 8)

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = TEXT
  ctx.font = `700 46px ${sans}`
  ctx.fillText(input.title, pad, 96)
  ctx.fillStyle = MUTED
  ctx.font = `400 26px ${sans}`
  ctx.fillText(input.subtitle, pad, 142)
  ctx.fillStyle = ACCENT
  ctx.fillRect(pad, 168, 96, 4)

  input.rows.forEach((row, i) => {
    const y = HEADER + i * ROW
    ctx.fillStyle = ROW_BG
    ctx.beginPath()
    ctx.roundRect(pad, y, width - pad * 2, ROW - 10, 14)
    ctx.fill()
    const mid = y + (ROW - 10) / 2

    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.font = `32px ${sans}`
    ctx.fillStyle = TEXT
    ctx.fillText(LOSS_ICONS[row.category], pad + 20, mid + 2)
    ctx.font = `500 28px ${sans}`
    ctx.fillText(row.name, pad + 82, mid + 1)

    ctx.textAlign = 'right'
    const right = width - pad - 22
    let numberRight = right
    if (row.change !== null) {
      ctx.font = `500 22px ${sans}`
      ctx.fillStyle = row.change === '0' ? MUTED : ACCENT
      ctx.fillText(row.change, right, mid + 2)
      numberRight = right - ctx.measureText(row.change).width - 16
    }
    ctx.font = `700 34px ${sans}`
    ctx.fillStyle = TEXT
    ctx.fillText(row.total, numberRight, mid + 1)
  })

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font = `400 20px ${sans}`
  let y = HEADER + input.rows.length * ROW + 34
  for (const line of wrap(ctx, input.footer, width - pad * 2)) {
    ctx.fillText(line, pad, y)
    y += 28
  }
  ctx.fillStyle = TEXT
  ctx.font = `600 20px ${sans}`
  ctx.fillText(input.credit, pad, height - 26)

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}
