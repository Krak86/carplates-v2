import { VEHICLE_COLOR_HEX } from '@carplates/shared'

import { backdropLayers } from './backdrop-assets'
import { type BackdropId, type CarBody, type SceneryId, type Theme } from './config'
import { BODY_MODEL, TRAFFIC_HEAVY, TRAFFIC_LIVERY, vehicleSprite } from './vehicle-assets'

/** Cars are Kenney renders (see ./vehicle-assets.ts); scenery and the motorbike are drawn here at load time. */
export type Sprite = { img: HTMLCanvasElement; w: number; h: number; heavy?: boolean }

export type Atlas = {
  player: { straight: Sprite; left: Sprite; right: Sprite }
  cars: Sprite[]
  plants: Sprite[]
  poplar: Sprite
  pine: Sprite
  oak: Sprite
  post: Sprite
  billboards: Sprite[]
}

export type Backdrop = { sky: HTMLCanvasElement; hills: HTMLCanvasElement; trees: HTMLCanvasElement }

export const BACKDROP_W = 1280
export const BACKDROP_H = 480

type Ctx = CanvasRenderingContext2D

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function makeSprite(w: number, h: number, k: number, draw: (ctx: Ctx) => void, heavy?: boolean): Sprite {
  const img = document.createElement('canvas')
  img.width = Math.ceil(w * k)
  img.height = Math.ceil(h * k)
  const ctx = img.getContext('2d') as Ctx
  ctx.scale(k, k)
  draw(ctx)
  return { img, w, h, heavy }
}

/** Mix `#rrggbb` toward white (amt > 0) or black (amt < 0), amt in -100..100. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const target = amt < 0 ? 0 : 255
  const p = Math.abs(amt) / 100
  const mix = (c: number): number => Math.round(c + (target - c) * p)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function poly(ctx: Ctx, pts: readonly (readonly [number, number])[], fill: string): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
  ctx.fill()
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

//=========================================================================
// vehicles (rear view)
//=========================================================================

type Spec = {
  w: number
  h: number
  wheel: number
  bodyTop: number
  cabinTop: number
  cabinInset: number
  cabinBase: number
  van?: boolean
  bed?: boolean
}

type ProceduralBody = 'sedan' | 'hatch' | 'suv' | 'sport' | 'pickup' | 'van'

/** What is drawn when a model has no rendered sprite: the closest of the hand-drawn bodies. */
function proceduralBody(body: CarBody): ProceduralBody | 'moto' {
  switch (body) {
    case 'taxi':
    case 'police':
      return 'sedan'
    case 'ambulance':
    case 'firetruck':
    case 'garbage':
    case 'bus':
      return 'van'
    default:
      return body
  }
}

const SPECS: Readonly<Record<ProceduralBody, Spec>> = {
  sedan: { w: 80, h: 50, wheel: 11, bodyTop: 20, cabinTop: 5, cabinInset: 16, cabinBase: 12 },
  hatch: { w: 80, h: 54, wheel: 11, bodyTop: 22, cabinTop: 3, cabinInset: 12, cabinBase: 8 },
  suv: { w: 84, h: 62, wheel: 14, bodyTop: 26, cabinTop: 3, cabinInset: 9, cabinBase: 6 },
  sport: { w: 84, h: 42, wheel: 10, bodyTop: 16, cabinTop: 5, cabinInset: 22, cabinBase: 14 },
  pickup: { w: 84, h: 60, wheel: 14, bodyTop: 26, cabinTop: 10, cabinInset: 18, cabinBase: 12, bed: true },
  van: { w: 84, h: 70, wheel: 12, bodyTop: 3, cabinTop: 3, cabinInset: 3, cabinBase: 3, van: true }
}

function paintPlate(ctx: Ctx, x: number, y: number, w: number, h: number, text: string | null): void {
  box(ctx, x - 1, y - 1, w + 2, h + 2, 2, '#222')
  box(ctx, x, y, w, h, 1.5, '#f6f6f2')
  if (!text) return
  ctx.fillStyle = '#111'
  ctx.font = `bold ${h * 0.82}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + h / 2 + 0.3, w - 2)
}

function paintCar(ctx: Ctx, spec: Spec, color: string, plate: string | null): void {
  const { w, h, wheel, bodyTop } = spec
  const bodyBottom = h - wheel * 0.4
  const bodyH = bodyBottom - bodyTop

  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h - 2, w * 0.5, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  box(ctx, w * 0.05, h - wheel - 1, w * 0.17, wheel, 3, '#101010')
  box(ctx, w * 0.78, h - wheel - 1, w * 0.17, wheel, 3, '#101010')

  if (!spec.van) {
    const base = bodyTop + 4
    poly(
      ctx,
      [
        [spec.cabinBase, base],
        [spec.cabinInset, spec.cabinTop],
        [w - spec.cabinInset, spec.cabinTop],
        [w - spec.cabinBase, base]
      ],
      shade(color, -12)
    )
    const win = ctx.createLinearGradient(0, spec.cabinTop, 0, base)
    win.addColorStop(0, '#41566b')
    win.addColorStop(1, '#16212c')
    poly(
      ctx,
      [
        [spec.cabinBase + 4, base - 1],
        [spec.cabinInset + 4, spec.cabinTop + 3],
        [w - spec.cabinInset - 4, spec.cabinTop + 3],
        [w - spec.cabinBase - 4, base - 1]
      ],
      '#16212c'
    )
    ctx.fillStyle = win
    ctx.fill()
  }

  const bodyGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyBottom)
  bodyGrad.addColorStop(0, shade(color, 14))
  bodyGrad.addColorStop(1, shade(color, -14))
  box(ctx, 2, bodyTop, w - 4, bodyH, 6, color)
  ctx.fillStyle = bodyGrad
  ctx.fill()

  if (spec.van) {
    box(ctx, 9, 9, w - 18, 20, 4, '#16212c')
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(9, 9, w - 18, 6)
  }
  if (spec.bed) box(ctx, 4, bodyTop, w - 8, 4, 2, shade(color, -42))

  const lw = w * 0.2
  const ly = bodyTop + bodyH * 0.16
  const lh = bodyH * 0.24
  ctx.save()
  ctx.shadowColor = '#ff2a2a'
  ctx.shadowBlur = 5
  box(ctx, 5, ly, lw, lh, 2, '#e5252a')
  box(ctx, w - 5 - lw, ly, lw, lh, 2, '#e5252a')
  ctx.restore()

  paintPlate(ctx, (w - 24) / 2, bodyTop + bodyH * 0.42, 24, 8, plate)
  box(ctx, 2, bodyBottom - 5, w - 4, 5, 2, shade(color, -42))
}

function paintMoto(ctx: Ctx, color: string, plate: string | null): void {
  const w = 44
  const h = 60
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h - 2, 18, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()
  box(ctx, w / 2 - 4.5, h - 26, 9, 25, 4, '#101010')
  box(ctx, w / 2 - 9, h - 36, 18, 12, 5, shade(color, -20))
  ctx.save()
  ctx.shadowColor = '#ff2a2a'
  ctx.shadowBlur = 4
  box(ctx, w / 2 - 6, h - 40, 12, 4, 2, '#e5252a')
  ctx.restore()
  paintPlate(ctx, w / 2 - 9, h - 22, 18, 7, plate)
  box(ctx, w / 2 - 13, 17, 26, 26, 9, color)
  box(ctx, w / 2 - 19, 20, 8, 20, 4, shade(color, -25))
  box(ctx, w / 2 + 11, 20, 8, 20, 4, shade(color, -25))
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.arc(w / 2, 11, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = shade(color, 10)
  ctx.beginPath()
  ctx.arc(w / 2, 10, 8, Math.PI, 0)
  ctx.fill()
}

function paintSemi(ctx: Ctx, accent: string): void {
  const w = 110
  const h = 140
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h - 2, 52, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  for (const x of [6, 18, 80, 92]) box(ctx, x, h - 22, 12, 21, 3, '#101010')
  box(ctx, 4, 2, w - 8, 112, 3, '#e9ebee')
  ctx.fillStyle = 'rgba(0,0,0,0.07)'
  for (let x = 14; x < w - 8; x += 14) ctx.fillRect(x, 4, 2, 108)
  ctx.fillStyle = accent
  ctx.fillRect(4, 44, w - 8, 14)
  box(ctx, 4, 112, w - 8, 12, 2, '#33363b')
  box(ctx, 8, 114, 14, 8, 2, '#e5252a')
  box(ctx, w - 22, 114, 14, 8, 2, '#e5252a')
  paintPlate(ctx, (w - 26) / 2, 112, 26, 9, null)
}

/** A player or traffic car; `steer` leans the sprite to fake turning. */
function carSprite(body: CarBody, color: string, plate: string | null, steer: -1 | 0 | 1 = 0): Sprite {
  const rendered = vehicleSprite(BODY_MODEL[body], color, plate, steer)
  if (rendered) return rendered
  const fallback = proceduralBody(body)
  const draw = (ctx: Ctx, paint: (c: Ctx) => void, w: number, h: number): void => {
    if (steer !== 0) {
      ctx.translate(w / 2, h)
      ctx.transform(1, 0, steer * 0.12, 1, 0, 0)
      ctx.scale(0.97, 1)
      ctx.translate(-w / 2, -h)
    }
    paint(ctx)
  }
  if (fallback === 'moto') return makeSprite(44, 60, 4, ctx => draw(ctx, c => paintMoto(c, color, plate), 44, 60))
  const spec = SPECS[fallback]
  return makeSprite(spec.w, spec.h, 4, ctx => draw(ctx, c => paintCar(c, spec, color, plate), spec.w, spec.h))
}

//=========================================================================
// roadside
//=========================================================================

function paintPine(ctx: Ctx, theme: Theme): void {
  ctx.fillStyle = theme.trunk
  ctx.fillRect(108, 300, 24, 80)
  for (let tier = 0; tier < 4; tier++) {
    const top = 10 + tier * 62
    const half = 54 + tier * 20
    const fill = tier % 2 ? theme.leaf[0] : theme.leaf[1]
    poly(
      ctx,
      [
        [120, top],
        [120 + half, top + 105],
        [120 - half, top + 105]
      ],
      fill
    )
    if (theme.snow)
      poly(
        ctx,
        [
          [120, top],
          [120 + half * 0.55, top + 58],
          [120 - half * 0.55, top + 58]
        ],
        '#f4f8fb'
      )
  }
}

function paintOak(ctx: Ctx, theme: Theme): void {
  ctx.fillStyle = theme.trunk
  ctx.fillRect(135, 190, 30, 140)
  const blobs: readonly (readonly [number, number, number])[] = [
    [150, 100, 90],
    [90, 150, 70],
    [210, 150, 70],
    [150, 175, 80]
  ]
  blobs.forEach(([x, y, r], i) => {
    ctx.fillStyle = i % 2 ? theme.leaf[0] : theme.leaf[1]
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (theme.snow) {
      ctx.fillStyle = '#f4f8fb'
      ctx.beginPath()
      ctx.arc(x, y - r * 0.35, r * 0.7, Math.PI * 1.1, Math.PI * 1.9)
      ctx.fill()
    }
  })
}

function paintPoplar(ctx: Ctx, theme: Theme): void {
  ctx.fillStyle = theme.trunk
  ctx.fillRect(50, 400, 10, 110)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? theme.leaf[0] : theme.leaf[1]
    ctx.beginPath()
    ctx.ellipse(55, 70 + i * 62, 34 - i * 2, 62, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintBush(ctx: Ctx, theme: Theme): void {
  const blobs: readonly (readonly [number, number, number])[] = [
    [70, 95, 55],
    [130, 85, 62],
    [180, 100, 48]
  ]
  blobs.forEach(([x, y, r], i) => {
    ctx.fillStyle = i % 2 ? theme.leaf[0] : theme.leaf[1]
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (theme.snow) {
      ctx.fillStyle = '#f4f8fb'
      ctx.beginPath()
      ctx.arc(x, y - r * 0.3, r * 0.65, Math.PI * 1.1, Math.PI * 1.9)
      ctx.fill()
    }
  })
}

function paintBoulder(ctx: Ctx, theme: Theme): void {
  poly(
    ctx,
    [
      [10, 140],
      [30, 70],
      [80, 20],
      [150, 24],
      [200, 80],
      [215, 140]
    ],
    '#8a8d94'
  )
  poly(
    ctx,
    [
      [80, 20],
      [150, 24],
      [200, 80],
      [140, 70]
    ],
    '#a9acb3'
  )
  if (theme.snow)
    poly(
      ctx,
      [
        [60, 40],
        [80, 20],
        [150, 24],
        [172, 50],
        [120, 40]
      ],
      '#f4f8fb'
    )
}

function paintSunflowers(ctx: Ctx): void {
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 30
    const top = 40 + (i % 3) * 18
    ctx.strokeStyle = '#2f7a2a'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(x, 150)
    ctx.lineTo(x, top)
    ctx.stroke()
    ctx.fillStyle = '#f2c230'
    ctx.beginPath()
    ctx.arc(x, top, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#4a2f12'
    ctx.beginPath()
    ctx.arc(x, top, 11, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintPost(ctx: Ctx): void {
  box(ctx, 8, 0, 24, 110, 4, '#f4f4f0')
  ctx.fillStyle = '#d23a2c'
  for (let y = 10; y < 100; y += 30) ctx.fillRect(8, y, 24, 14)
}

type BoardStyle = { bg: string; fg: string; text: string; plate?: boolean }

function paintBillboard(ctx: Ctx, style: BoardStyle): void {
  box(ctx, 40, 100, 14, 70, 2, '#4a3a2a')
  box(ctx, 246, 100, 14, 70, 2, '#4a3a2a')
  box(ctx, 0, 0, 300, 112, 8, '#222')
  box(ctx, 5, 5, 290, 102, 5, style.bg)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (style.plate) {
    box(ctx, 5, 5, 62, 102, 5, '#0057b8')
    ctx.fillStyle = '#ffd500'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText('UA', 36, 78)
    ctx.fillStyle = style.fg
    ctx.font = 'bold 46px monospace'
    ctx.fillText(style.text, 185, 58, 215)
  } else {
    ctx.fillStyle = style.fg
    ctx.font = 'bold 44px sans-serif'
    ctx.fillText(style.text, 150, 58, 270)
  }
}

//=========================================================================
// backdrop layers (each one tiles seamlessly across BACKDROP_W)
//=========================================================================

function makeLayer(draw: (ctx: Ctx) => void): HTMLCanvasElement {
  const img = document.createElement('canvas')
  img.width = BACKDROP_W
  img.height = BACKDROP_H
  draw(img.getContext('2d') as Ctx)
  return img
}

function cloud(ctx: Ctx, x: number, y: number, s: number): void {
  for (const ox of [0, -BACKDROP_W, BACKDROP_W]) {
    for (const [dx, dy, r] of [
      [0, 0, 30],
      [32, -12, 36],
      [70, 0, 30],
      [34, 8, 28]
    ] as const) {
      ctx.beginPath()
      ctx.arc(x + ox + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function makeBackdrop(theme: Theme, scenery: SceneryId, backdropId: BackdropId): Backdrop {
  const sky = makeLayer(ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, 260)
    theme.skyStops.forEach(([at, color]) => g.addColorStop(at, color))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, BACKDROP_W, BACKDROP_H)
    if (theme.stars) {
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 160; i++) {
        ctx.globalAlpha = 0.3 + Math.random() * 0.7
        ctx.fillRect(Math.random() * BACKDROP_W, Math.random() * 200, 2, 2)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#f3f1d6'
      ctx.beginPath()
      ctx.arc(920, 80, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1a2c55'
      ctx.beginPath()
      ctx.arc(934, 72, 28, 0, Math.PI * 2)
      ctx.fill()
    }
    if (theme.clouds) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (let i = 0; i < 7; i++) cloud(ctx, i * 190 + 40, 50 + ((i * 53) % 110), 0.8 + (i % 3) * 0.25)
    }
  })

  const hills = makeLayer(ctx => {
    ctx.fillStyle = theme.hills
    ctx.beginPath()
    ctx.moveTo(0, BACKDROP_H)
    for (let x = 0; x <= BACKDROP_W; x += 8) {
      const t = (x / BACKDROP_W) * Math.PI * 2
      ctx.lineTo(x, 190 + 28 * Math.sin(2 * t) + 18 * Math.sin(5 * t + 1) + 8 * Math.sin(11 * t))
    }
    ctx.lineTo(BACKDROP_W, BACKDROP_H)
    ctx.closePath()
    ctx.fill()
  })

  const trees = makeLayer(ctx => {
    ctx.fillStyle = theme.trees
    for (let i = -3; i < BACKDROP_W / 20 + 3; i++) {
      const x = i * 20 + ((i * 37) % 11)
      const h = 34 + ((i * 53) % 30)
      for (const ox of [0, BACKDROP_W]) {
        poly(
          ctx,
          [
            [x + ox, 252 - h],
            [x + ox + 16, 252],
            [x + ox - 16, 252]
          ],
          theme.trees
        )
      }
    }
    ctx.fillRect(0, 240, BACKDROP_W, BACKDROP_H - 240)
  })

  const photo = photoBackdrop(scenery, backdropId)
  return photo ? { sky: photo.sky ?? sky, hills: makeLayer(() => {}), trees: photo.trees } : { sky, hills, trees }
}

/** Per-scenery wash laid over the photo's opaque pixels (source-atop leaves the cut-out sky untouched). */
const PHOTO_WASH: Readonly<Record<SceneryId, { sky: boolean; ridge: string | null }>> = {
  day: { sky: true, ridge: null },
  sunset: { sky: false, ridge: 'rgba(150,60,45,0.5)' },
  night: { sky: false, ridge: 'rgba(6,14,38,0.82)' },
  winter: { sky: false, ridge: 'rgba(236,243,250,0.55)' }
}

/**
 * The author's own Carpathian photo as the backdrop: a cloud sky (day only — the other scenery keeps its generated
 * gradient, stars and moon) and a mountain + spruce line, washed with a colour for sunset / night / winter. Both
 * images are 1280 px wide and mirror-tiled, so they wrap like the generated layers. Returns null when the images are missing.
 */
function photoBackdrop(
  scenery: SceneryId,
  backdropId: BackdropId
): { sky: HTMLCanvasElement | null; trees: HTMLCanvasElement } | null {
  const layers = backdropLayers(backdropId)
  if (!layers) return null
  const ridge = layers.ridge
  const wash = PHOTO_WASH[scenery]
  const trees = makeLayer(ctx => {
    ctx.drawImage(ridge, 0, 0, BACKDROP_W, BACKDROP_H)
    if (wash.ridge) {
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = wash.ridge
      ctx.fillRect(0, 0, BACKDROP_W, BACKDROP_H)
    }
  })
  const skyImg = wash.sky ? layers.sky : undefined
  const sky = skyImg ? makeLayer(ctx => ctx.drawImage(skyImg, 0, 0, BACKDROP_W, BACKDROP_H)) : null
  return { sky, trees }
}

//=========================================================================
// atlas
//=========================================================================

const BOARD_COLORS: readonly (readonly [string, string])[] = [
  ['#1f4fa3', '#ffffff'],
  ['#ffd500', '#0057b8'],
  ['#111827', '#4cc9f0'],
  ['#c2410c', '#ffffff']
]

export function makePlayerSprites(body: CarBody, color: string, plate: string): Atlas['player'] {
  const text = plate || 'AA0000AA'
  return {
    straight: carSprite(body, color, text),
    left: carSprite(body, color, text, -1),
    right: carSprite(body, color, text, 1)
  }
}

export function makeAtlas(theme: Theme, body: CarBody, color: string, plate: string): Atlas {
  const text = plate || 'AA0000AA'
  const colors = Object.values(VEHICLE_COLOR_HEX)
  const trafficBodies: readonly CarBody[] = ['sedan', 'hatch', 'suv', 'sport', 'pickup', 'van']

  const cars: Sprite[] = []
  for (const b of trafficBodies) for (let i = 0; i < 2; i++) cars.push(carSprite(b, pick(colors), null))
  for (const model of TRAFFIC_LIVERY) {
    const livery = vehicleSprite(model, null, null)
    if (livery) cars.push(livery)
  }
  const heavies = TRAFFIC_HEAVY.map(model => vehicleSprite(model, null, null, 0, true)).filter(s => !!s)
  if (heavies.length > 0) cars.push(...heavies)
  else
    for (const accent of [pick(colors), pick(colors)])
      cars.push(makeSprite(110, 140, 3, ctx => paintSemi(ctx, accent), true))

  const pine = makeSprite(240, 380, 1.5, ctx => paintPine(ctx, theme))
  const oak = makeSprite(300, 330, 1.5, ctx => paintOak(ctx, theme))
  const poplar = makeSprite(110, 520, 1.2, ctx => paintPoplar(ctx, theme))
  const bush = makeSprite(250, 150, 1.5, ctx => paintBush(ctx, theme))
  const boulder = makeSprite(220, 150, 1.5, ctx => paintBoulder(ctx, theme))
  const plants = [pine, oak, poplar, bush, boulder]
  if (theme.flowers) plants.push(makeSprite(200, 150, 1.5, paintSunflowers))

  const styles: BoardStyle[] = [
    { bg: BOARD_COLORS[0]?.[0] ?? '#1f4fa3', fg: '#ffffff', text: 'carsua.app' },
    { bg: '#f6f6f2', fg: '#111111', text, plate: true },
    { bg: BOARD_COLORS[1]?.[0] ?? '#ffd500', fg: '#0057b8', text: '🇺🇦 UA' },
    { bg: BOARD_COLORS[2]?.[0] ?? '#111827', fg: '#4cc9f0', text: '🏁 RACE' },
    { bg: BOARD_COLORS[3]?.[0] ?? '#c2410c', fg: '#ffffff', text: 'carsua.app' }
  ]

  return {
    player: makePlayerSprites(body, color, plate),
    cars,
    plants,
    poplar,
    pine,
    oak,
    post: makeSprite(40, 110, 2, paintPost),
    billboards: styles.map(style => makeSprite(300, 170, 1.2, ctx => paintBillboard(ctx, style)))
  }
}
