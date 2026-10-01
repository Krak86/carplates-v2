import { readFileSync } from 'node:fs'

import { Resvg } from '@resvg/resvg-js'
import { VEHICLE_COLOR_HEX, type VehicleColor } from '@carplates/shared'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

const BRAND_BLUE = '#1d4ed8'
const FONT_FAMILY = 'Noto Sans'

export type CardInput = {
  /** Big text on the plate: a plate number or a VIN. `null` → the generic site card. */
  plate: string | null
  /** Headline under the plate, e.g. "Toyota Camry · 2015". */
  title: string
  /** Secondary line, e.g. "Київ · Бензин · Сірий". */
  subtitle: string
  color: VehicleColor
  /** Brand logo PNG, drawn bottom-right when present. */
  logoPng?: Buffer | null
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

/** Dark translucent backing, so light text stays readable on any car-color gradient. */
const panel = (x: number, y: number, w: number, h: number): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="#0a0f1e" fill-opacity="0.78"/>`

const FAVICON_GLYPH = `<g fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"><path d="M110 168V290a64 64 0 0 0 128 0V168"/><path d="M282 354L342 168L402 354M301 296H383"/></g>`

const header = (): string => `
${panel(50, 40, 330, 100)}
<g transform="translate(70 55) scale(0.145)"><rect width="512" height="512" rx="96" fill="${BRAND_BLUE}"/>${FAVICON_GLYPH}</g>
<text x="165" y="107" font-family="${FONT_FAMILY}" font-size="42" font-weight="700" fill="#fff">Cars UA</text>`

function background(color: VehicleColor): string {
  const hex = VEHICLE_COLOR_HEX[color]
  return `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${hex}"/><stop offset="0.55" stop-color="${hex}" stop-opacity="0.85"/><stop offset="1" stop-color="${BRAND_BLUE}"/>
</linearGradient></defs><rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#g)"/>`
}

/** The SVG for a plate/VIN card, or — when `plate` is null — the generic site card. */
export function buildCardSvg(input: CardInput): string {
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">`
  if (input.plate === null) {
    return `${open}${background('blue')}${header()}
${panel(50, 250, 1100, 300)}
<text x="90" y="360" font-family="${FONT_FAMILY}" font-size="72" font-weight="700" fill="#fff">${esc(clip(input.title, 34))}</text>
<text x="90" y="440" font-family="${FONT_FAMILY}" font-size="72" font-weight="700" fill="#fff">${esc(clip(input.subtitle, 34))}</text>
</svg>`
  }

  // A VIN (17 chars) needs a smaller face than an 8-char plate to fit inside the plate box.
  const plateSize = Math.min(120, Math.floor(800 / (input.plate.length * 0.72)))
  const logo = input.logoPng
    ? `<image x="930" y="415" width="100" height="100" href="data:image/png;base64,${input.logoPng.toString('base64')}"/>`
    : ''
  return `${open}${background(input.color)}${header()}
<rect x="150" y="190" width="900" height="170" rx="22" fill="#fff" stroke="#111" stroke-width="8"/>
<rect x="150" y="190" width="90" height="170" rx="22" fill="${BRAND_BLUE}"/>
<text x="645" y="${190 + 85 + Math.round(plateSize * 0.36)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${plateSize}" font-weight="700" fill="#111" letter-spacing="4">${esc(input.plate)}</text>
${panel(150, 400, 900, 150)}
<text x="185" y="468" font-family="${FONT_FAMILY}" font-size="52" font-weight="700" fill="#fff">${esc(clip(input.title, 28))}</text>
<text x="185" y="520" font-family="${FONT_FAMILY}" font-size="34" fill="#cbd5e1">${esc(clip(input.subtitle, 44))}</text>
${logo}
</svg>`
}

export type FontFiles = string[]

/** SVG → 1200×630 PNG. Fonts are loaded from files, so rendering never depends on system fonts. */
export function renderPng(svg: string, fontFiles: FontFiles): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_WIDTH },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT_FAMILY }
  })
  return resvg.render().asPng()
}

export const readLogo = (path: string): Buffer | null => {
  try {
    return readFileSync(path)
  } catch {
    return null
  }
}
