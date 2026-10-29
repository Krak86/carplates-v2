import { brandLogoUrl } from '@carplates/shared'

import { regionFlagUrl } from '@/lib/region-flags'

export type PlateCardInput = {
  plate: string
  brand: string | null
  model: string | null
  year: number | null
  /** Region name as in the registry; its flag is drawn when it has one. */
  region: string | null
  /** Translated region name. */
  regionLabel: string | null
  /** One short line, e.g. "#3 most common make in Ukraine". */
  fact: string | null
}

export const PLATE_CARD = { width: 1200, height: 630 }

const PLATE_RE = /^([^\d]{2})(\d{4})([^\d]{2})$/
// Canvas has no CSS variables: read the --label-1 token once (oklch where the browser draws it) and fall back to sRGB.
const ACCENT_FALLBACK = '#f97316'

function accentColor(): string {
  try {
    const token = getComputedStyle(document.documentElement).getPropertyValue('--label-1').trim()
    if (token && CSS.supports('color', token)) return token
  } catch {
    // no DOM styles (tests, private contexts): the fallback is fine
  }
  return ACCENT_FALLBACK
}

/** Best-effort bitmap: any failure (offline, decode) returns null and the card just leaves that piece out. */
async function loadBitmap(url: string | null | undefined): Promise<ImageBitmap | null> {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await createImageBitmap(await response.blob())
  } catch {
    return null
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Draws the Ukrainian plate (blue EU strip + UA, white face) centred on `cx`. */
function drawPlate(ctx: CanvasRenderingContext2D, plate: string, cx: number, y: number): void {
  const m = PLATE_RE.exec(plate)
  const text = m ? `${m[1]} ${m[2]} ${m[3]}` : plate
  const h = 150
  const stripW = 90
  ctx.font = '600 92px ui-monospace, Consolas, monospace'
  const textW = ctx.measureText(text).width
  const w = stripW + textW + 70
  const x = cx - w / 2

  ctx.save()
  roundRect(ctx, x, y, w, h, 18)
  ctx.clip()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#003399'
  ctx.fillRect(x, y, stripW, h)
  ctx.fillStyle = '#0057b7'
  ctx.fillRect(x + 22, y + 22, 46, 18)
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(x + 22, y + 40, 46, 18)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 34px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('UA', x + stripW / 2, y + h - 24)
  ctx.restore()

  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 6
  roundRect(ctx, x, y, w, h, 18)
  ctx.stroke()

  ctx.fillStyle = '#0f172a'
  ctx.font = '600 92px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + stripW + (w - stripW) / 2, y + h / 2 + 4)
}

/** The shareable plate card (plate, brand logo, region flag, year, one fact) as a PNG blob; null when no canvas is available. */
export async function renderPlateCardPng(input: PlateCardInput): Promise<Blob | null> {
  const { width, height } = PLATE_CARD
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' }) ?? canvas.getContext('2d')
  if (!ctx) return null

  const [logo, flag] = await Promise.all([
    loadBitmap(brandLogoUrl(input.brand)),
    loadBitmap(regionFlagUrl(input.region))
  ])
  const accent = accentColor()

  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#0f172a')
  bg.addColorStop(1, '#1e293b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, width, 12)

  // Logo on a white chip (the source PNGs have a flat white background).
  let titleX = 80
  if (logo) {
    const chip = 120
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 80, 70, chip, chip, 20)
    ctx.fill()
    const scale = Math.min((chip - 24) / logo.width, (chip - 24) / logo.height)
    const lw = logo.width * scale
    const lh = logo.height * scale
    ctx.drawImage(logo, 80 + (chip - lw) / 2, 70 + (chip - lh) / 2, lw, lh)
    titleX = 80 + chip + 36
  }

  const car = [input.brand, input.model].filter(Boolean).join(' ')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 56px sans-serif'
  ctx.fillText(car, titleX, 125, width - titleX - 80)
  if (input.year) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 40px sans-serif'
    ctx.fillText(String(input.year), titleX, 180)
  }

  drawPlate(ctx, input.plate, width / 2, 250)

  if (input.regionLabel) {
    ctx.font = '500 38px sans-serif'
    const labelW = ctx.measureText(input.regionLabel).width
    const flagW = flag ? 57 + 18 : 0
    let x = (width - labelW - flagW) / 2
    if (flag) {
      ctx.drawImage(flag, x, 448, 57, 38)
      x += flagW
    }
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(input.regionLabel, x, 480)
  }

  if (input.fact) {
    ctx.fillStyle = accent
    ctx.font = '600 34px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(input.fact, width / 2, 548, width - 160)
  }

  ctx.fillStyle = '#64748b'
  ctx.font = '500 26px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('carsua.app', width - 60, height - 30)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
