/*
 * Pseudo-3D road engine ported from Jake Gordon's javascript-racer (MIT, Copyright (c) 2012-2016 Jake Gordon and
 * contributors) — https://github.com/jakesgordon/javascript-racer. Physics, projection and road building follow the
 * original v4 ("final"); sprites, backdrop and music are NOT taken from it (those are OutRun-derived / licensed to that
 * project only) — scenery is drawn in ./sprites.ts, cars come from ./vehicle-assets.ts (Kenney renders).
 */
import {
  QUALITY_SIZE,
  THEMES,
  TOP_SPEED_KMH,
  TRAFFIC_COUNT,
  type RacerConfig,
  type RacerHud,
  type RoadColor,
  type Theme
} from './config'
import { preloadBackdrop } from './backdrop-assets'
import { createSound } from './sound'
import {
  BACKDROP_H,
  BACKDROP_W,
  makeAtlas,
  makeBackdrop,
  makePlayerSprites,
  type Atlas,
  type Backdrop,
  type Sprite
} from './sprites'

export { preloadBackdrop }

export type Racer = {
  /** Applies new settings live (car, scenery, lanes, traffic, resolution) without resetting the lap. */
  setConfig: (next: RacerConfig) => void
  /** Back to the start line, lap timer cleared. */
  restart: () => void
  /** Sound is off until the viewer turns it on. */
  setSound: (on: boolean) => void
  destroy: () => void
}

const BEST_KEY = 'carplates.racer.best'

const STEP = 1 / 60
const SEGMENT_LENGTH = 200
const RUMBLE_LENGTH = 3
const ROAD_WIDTH = 2000
const CAMERA_HEIGHT = 1000
const DRAW_DISTANCE = 300
const FOG_DENSITY = 5
const CENTRIFUGAL = 0.3
const CAMERA_DEPTH = 1 / Math.tan((100 / 2) * (Math.PI / 180))
const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH
const MAX_SPEED = SEGMENT_LENGTH / STEP
const ACCEL = MAX_SPEED / 5
const BREAKING = -MAX_SPEED
const DECEL = -MAX_SPEED / 5
const OFF_ROAD_DECEL = -MAX_SPEED / 2
const OFF_ROAD_LIMIT = MAX_SPEED / 4
const SKY_SPEED = 0.001
const HILL_SPEED = 0.002
const TREE_SPEED = 0.003
/** A sprite 80 logical units wide is a third of the half-road; everything scales from that. */
const SPRITE_SCALE = 0.3 / 80

const START: RoadColor = { road: 'white', grass: 'white', rumble: 'white' }
const FINISH: RoadColor = { road: 'black', grass: 'black', rumble: 'black' }

const LENGTH = { SHORT: 25, MEDIUM: 50, LONG: 100 } as const
const HILL = { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 } as const
const CURVE = { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 } as const

type Point = {
  world: { y: number; z: number }
  camera: { x: number; y: number; z: number }
  screen: { x: number; y: number; w: number; scale: number }
}
type Segment = {
  index: number
  p1: Point
  p2: Point
  curve: number
  sprites: { source: Sprite; offset: number }[]
  cars: Car[]
  color: RoadColor
  looped: boolean
  fog: number
  clip: number
}
type Car = { offset: number; z: number; sprite: Sprite; speed: number; percent: number }

const limit = (v: number, min: number, max: number): number => Math.max(min, Math.min(v, max))
const interpolate = (a: number, b: number, p: number): number => a + (b - a) * p
const easeIn = (a: number, b: number, p: number): number => a + (b - a) * Math.pow(p, 2)
const easeInOut = (a: number, b: number, p: number): number => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5)
const percentRemaining = (n: number, total: number): number => (n % total) / total
const randomInt = (min: number, max: number): number => Math.round(interpolate(min, max, Math.random()))
const randomChoice = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)] as T
const exponentialFog = (distance: number, density: number): number =>
  1 / Math.pow(Math.E, distance * distance * density)

function increase(start: number, inc: number, max: number): number {
  let result = start + inc
  while (result >= max) result -= max
  while (result < 0) result += max
  return result
}

function overlap(x1: number, w1: number, x2: number, w2: number, percent = 1): boolean {
  const half = percent / 2
  return !(x1 + w1 * half < x2 - w2 * half || x1 - w1 * half > x2 + w2 * half)
}

function formatTime(dt: number): string {
  const minutes = Math.floor(dt / 60)
  const seconds = Math.floor(dt - minutes * 60)
  const tenths = Math.floor(10 * (dt - Math.floor(dt)))
  return minutes > 0 ? `${minutes}.${seconds < 10 ? '0' : ''}${seconds}.${tenths}` : `${seconds}.${tenths}`
}

function readBest(): number | null {
  try {
    const v = parseFloat(localStorage.getItem(BEST_KEY) ?? '')
    return Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

function writeBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v))
  } catch {
    // private mode / blocked storage: the record just isn't remembered
  }
}

function sameConfig(a: RacerConfig, b: RacerConfig): boolean {
  return (
    a.color === b.color &&
    a.body === b.body &&
    a.scenery === b.scenery &&
    a.backdrop === b.backdrop &&
    a.lanes === b.lanes &&
    a.traffic === b.traffic &&
    a.quality === b.quality &&
    a.plate === b.plate
  )
}

function newPoint(y: number, z: number): Point {
  return { world: { y, z }, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0, scale: 0 } }
}

export function createRacer(canvas: HTMLCanvasElement, initial: RacerConfig, onHud: (hud: RacerHud) => void): Racer {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const sound = createSound()

  let cfg = initial
  let theme: Theme = THEMES[cfg.scenery]
  let atlas: Atlas = makeAtlas(theme, cfg.body, cfg.color, cfg.plate)
  let backdrop: Backdrop = makeBackdrop(theme, cfg.scenery, cfg.backdrop)
  let width = 1024
  let height = 768
  let resolution = 1.6

  let segments: Segment[] = []
  let cars: Car[] = []
  let trackLength = 0
  let skyOffset = 0
  let hillOffset = 0
  let treeOffset = 0
  let playerX = 0
  let position = 0
  let speed = 0
  let currentLapTime = 0
  let lastLapTime: number | null = null
  let bestLap: number | null = readBest()
  let record = false
  let lastEmit = 0

  let keyLeft = false
  let keyRight = false
  let keyFaster = false
  let keySlower = false

  let raf = 0
  let destroyed = false

  const seg = (i: number): Segment => segments[i] as Segment
  const findSegment = (z: number): Segment => seg(Math.floor(z / SEGMENT_LENGTH) % segments.length)

  //=========================================================================
  // HUD
  //=========================================================================

  function emitHud(force = false): void {
    const now = performance.now()
    if (!force && now - lastEmit < 100) return
    lastEmit = now
    onHud({
      speed: 5 * Math.round(speed / 500),
      lap: formatTime(currentLapTime),
      last: lastLapTime == null ? null : formatTime(lastLapTime),
      best: bestLap == null ? null : formatTime(bestLap),
      record
    })
  }

  //=========================================================================
  // UPDATE
  //=========================================================================

  function updateCarOffset(car: Car, carSegment: Segment, playerSegment: Segment, playerW: number): number {
    const lookahead = 20
    const carW = car.sprite.w * SPRITE_SCALE

    // dont bother steering around other cars when out of sight of the player
    if (carSegment.index - playerSegment.index > DRAW_DISTANCE) return 0

    for (let i = 1; i < lookahead; i++) {
      const segment = seg((carSegment.index + i) % segments.length)

      if (segment === playerSegment && car.speed > speed && overlap(playerX, playerW, car.offset, carW, 1.2)) {
        const dir = playerX > 0.5 ? -1 : playerX < -0.5 ? 1 : car.offset > playerX ? 1 : -1
        return ((dir * 1) / i) * ((car.speed - speed) / MAX_SPEED)
      }

      for (const other of segment.cars) {
        const otherW = other.sprite.w * SPRITE_SCALE
        if (car.speed > other.speed && overlap(car.offset, carW, other.offset, otherW, 1.2)) {
          const dir = other.offset > 0.5 ? -1 : other.offset < -0.5 ? 1 : car.offset > other.offset ? 1 : -1
          return ((dir * 1) / i) * ((car.speed - other.speed) / MAX_SPEED)
        }
      }
    }

    // no cars ahead but ended up off road: steer back on
    if (car.offset < -0.9) return 0.1
    if (car.offset > 0.9) return -0.1
    return 0
  }

  function updateCars(dt: number, playerSegment: Segment, playerW: number): void {
    for (const car of cars) {
      const oldSegment = findSegment(car.z)
      car.offset += updateCarOffset(car, oldSegment, playerSegment, playerW)
      car.z = increase(car.z, dt * car.speed, trackLength)
      car.percent = percentRemaining(car.z, SEGMENT_LENGTH)
      const newSegment = findSegment(car.z)
      if (oldSegment !== newSegment) {
        oldSegment.cars.splice(oldSegment.cars.indexOf(car), 1)
        newSegment.cars.push(car)
      }
    }
  }

  function update(dt: number): void {
    const playerSegment = findSegment(position + PLAYER_Z)
    const playerW = atlas.player.straight.w * SPRITE_SCALE
    const speedPercent = speed / MAX_SPEED
    const dx = dt * 2 * speedPercent // at top speed, cross the road in 1 second
    const startPosition = position

    updateCars(dt, playerSegment, playerW)

    position = increase(position, dt * speed, trackLength)

    if (keyLeft) playerX -= dx
    else if (keyRight) playerX += dx

    playerX -= dx * speedPercent * playerSegment.curve * CENTRIFUGAL

    if (keyFaster) speed += ACCEL * (0.5 + 0.5 * (topSpeed() / MAX_SPEED)) * dt
    else if (keySlower) speed += BREAKING * dt
    else speed += DECEL * dt

    if (playerX < -1 || playerX > 1) {
      if (speed > OFF_ROAD_LIMIT) speed += OFF_ROAD_DECEL * dt

      for (const sprite of playerSegment.sprites) {
        const spriteW = sprite.source.w * SPRITE_SCALE
        if (overlap(playerX, playerW, sprite.offset + (spriteW / 2) * (sprite.offset > 0 ? 1 : -1), spriteW)) {
          speed = MAX_SPEED / 5
          sound.crash()
          position = increase(playerSegment.p1.world.z, -PLAYER_Z, trackLength) // stop in front of the sprite
          break
        }
      }
    }

    for (const car of playerSegment.cars) {
      const carW = car.sprite.w * SPRITE_SCALE
      if (speed > car.speed && overlap(playerX, playerW, car.offset, carW, 0.8)) {
        speed = car.speed * (car.speed / speed)
        sound.crash()
        position = increase(car.z, -PLAYER_Z, trackLength)
        break
      }
    }

    playerX = limit(playerX, -3, 3)
    speed = limit(speed, 0, topSpeed())

    const travelled = (position - startPosition) / SEGMENT_LENGTH
    skyOffset = increase(skyOffset, SKY_SPEED * playerSegment.curve * travelled, 1)
    hillOffset = increase(hillOffset, HILL_SPEED * playerSegment.curve * travelled, 1)
    treeOffset = increase(treeOffset, TREE_SPEED * playerSegment.curve * travelled, 1)

    if (position > PLAYER_Z) {
      if (currentLapTime && startPosition < PLAYER_Z) {
        lastLapTime = currentLapTime
        currentLapTime = 0
        record = bestLap == null || lastLapTime <= bestLap
        if (record) {
          bestLap = lastLapTime
          writeBest(lastLapTime)
        }
        sound.lap()
        emitHud(true)
      } else {
        currentLapTime += dt
      }
    }

    sound.update(speed / MAX_SPEED, playerX < -1 || playerX > 1)
    emitHud()
  }

  //=========================================================================
  // RENDER
  //=========================================================================

  function polygon(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    color: string
  ): void {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y3)
    ctx.lineTo(x4, y4)
    ctx.closePath()
    ctx.fill()
  }

  function drawSegment(
    x1: number,
    y1: number,
    w1: number,
    x2: number,
    y2: number,
    w2: number,
    fog: number,
    color: RoadColor
  ): void {
    const lanes = cfg.lanes
    const r1 = w1 / Math.max(6, 2 * lanes)
    const r2 = w2 / Math.max(6, 2 * lanes)
    const l1 = w1 / Math.max(32, 8 * lanes)
    const l2 = w2 / Math.max(32, 8 * lanes)

    ctx.fillStyle = color.grass
    ctx.fillRect(0, y2, width, y1 - y2)

    polygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble)
    polygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble)
    polygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road)

    if (color.lane) {
      const lanew1 = (w1 * 2) / lanes
      const lanew2 = (w2 * 2) / lanes
      let lanex1 = x1 - w1 + lanew1
      let lanex2 = x2 - w2 + lanew2
      for (let lane = 1; lane < lanes; lanex1 += lanew1, lanex2 += lanew2, lane++)
        polygon(lanex1 - l1 / 2, y1, lanex1 + l1 / 2, y1, lanex2 + l2 / 2, y2, lanex2 - l2 / 2, y2, color.lane)
    }

    if (fog < 1) {
      ctx.globalAlpha = 1 - fog
      ctx.fillStyle = theme.fog
      ctx.fillRect(0, y1, width, y2 - y1)
      ctx.globalAlpha = 1
    }
  }

  function drawBackground(img: HTMLCanvasElement, rotation: number, offset: number): void {
    const imageW = BACKDROP_W / 2
    const sourceX = Math.floor(BACKDROP_W * rotation)
    const sourceW = Math.min(imageW, BACKDROP_W - sourceX)
    const destW = Math.floor(width * (sourceW / imageW))

    ctx.drawImage(img, sourceX, 0, sourceW, BACKDROP_H, 0, offset, destW, height)
    if (sourceW < imageW)
      ctx.drawImage(img, 0, 0, imageW - sourceW, BACKDROP_H, destW - 1, offset, width - destW, height)
  }

  function drawSprite(
    sprite: Sprite,
    scale: number,
    destX: number,
    destY: number,
    offsetX: number,
    offsetY: number,
    clipY?: number
  ): void {
    const destW = sprite.w * scale * (width / 2) * (SPRITE_SCALE * ROAD_WIDTH)
    const destH = sprite.h * scale * (width / 2) * (SPRITE_SCALE * ROAD_WIDTH)
    const x = destX + destW * offsetX
    const y = destY + destH * offsetY
    const clipH = clipY ? Math.max(0, y + destH - clipY) : 0
    if (clipH < destH)
      ctx.drawImage(
        sprite.img,
        0,
        0,
        sprite.img.width,
        sprite.img.height - (sprite.img.height * clipH) / destH,
        x,
        y,
        destW,
        destH - clipH
      )
  }

  function drawPlayer(scale: number, destX: number, destY: number, steer: number): void {
    const bounce = 1.5 * Math.random() * (speed / MAX_SPEED) * resolution * randomChoice([-1, 1])
    const sprite = steer < 0 ? atlas.player.left : steer > 0 ? atlas.player.right : atlas.player.straight
    drawSprite(sprite, scale, destX, destY + bounce, -0.5, -1)
  }

  function render(): void {
    const baseSegment = findSegment(position)
    const basePercent = percentRemaining(position, SEGMENT_LENGTH)
    const playerSegment = findSegment(position + PLAYER_Z)
    const playerPercent = percentRemaining(position + PLAYER_Z, SEGMENT_LENGTH)
    const playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent)
    let maxy = height

    let x = 0
    let dx = -(baseSegment.curve * basePercent)

    ctx.clearRect(0, 0, width, height)

    drawBackground(backdrop.sky, skyOffset, resolution * SKY_SPEED * playerY)
    drawBackground(backdrop.hills, hillOffset, resolution * HILL_SPEED * playerY)
    drawBackground(backdrop.trees, treeOffset, resolution * TREE_SPEED * playerY)

    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segment = seg((baseSegment.index + n) % segments.length)
      segment.looped = segment.index < baseSegment.index
      segment.fog = exponentialFog(n / DRAW_DISTANCE, FOG_DENSITY)
      segment.clip = maxy

      const camZ = position - (segment.looped ? trackLength : 0)
      project(segment.p1, playerX * ROAD_WIDTH - x, playerY + CAMERA_HEIGHT, camZ)
      project(segment.p2, playerX * ROAD_WIDTH - x - dx, playerY + CAMERA_HEIGHT, camZ)

      x += dx
      dx += segment.curve

      if (
        segment.p1.camera.z <= CAMERA_DEPTH || // behind us
        segment.p2.screen.y >= segment.p1.screen.y || // back face cull
        segment.p2.screen.y >= maxy // clipped by an already rendered hill
      )
        continue

      drawSegment(
        segment.p1.screen.x,
        segment.p1.screen.y,
        segment.p1.screen.w,
        segment.p2.screen.x,
        segment.p2.screen.y,
        segment.p2.screen.w,
        segment.fog,
        segment.color
      )
      maxy = segment.p1.screen.y
    }

    for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
      const segment = seg((baseSegment.index + n) % segments.length)

      for (const car of segment.cars) {
        const scale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent)
        const sx =
          interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) +
          scale * car.offset * ROAD_WIDTH * (width / 2)
        const sy = interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent)
        drawSprite(car.sprite, scale, sx, sy, -0.5, -1, segment.clip)
      }

      for (const sprite of segment.sprites) {
        const scale = segment.p1.screen.scale
        const sx = segment.p1.screen.x + scale * sprite.offset * ROAD_WIDTH * (width / 2)
        drawSprite(sprite.source, scale, sx, segment.p1.screen.y, sprite.offset < 0 ? -1 : 0, -1, segment.clip)
      }

      if (segment === playerSegment) {
        drawPlayer(
          CAMERA_DEPTH / PLAYER_Z,
          width / 2,
          height / 2 -
            ((CAMERA_DEPTH / PLAYER_Z) *
              interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) *
              height) /
              2,
          speed * (keyLeft ? -1 : keyRight ? 1 : 0)
        )
      }
    }
  }

  function project(p: Point, cameraX: number, cameraY: number, cameraZ: number): void {
    p.camera.x = 0 - cameraX
    p.camera.y = p.world.y - cameraY
    p.camera.z = p.world.z - cameraZ
    p.screen.scale = CAMERA_DEPTH / p.camera.z
    p.screen.x = Math.round(width / 2 + p.screen.scale * p.camera.x * (width / 2))
    p.screen.y = Math.round(height / 2 - p.screen.scale * p.camera.y * (height / 2))
    p.screen.w = Math.round(p.screen.scale * ROAD_WIDTH * (width / 2))
  }

  //=========================================================================
  // ROAD
  //=========================================================================

  const lastY = (): number => (segments.length === 0 ? 0 : seg(segments.length - 1).p2.world.y)

  function addSegment(curve: number, y: number): void {
    const n = segments.length
    segments.push({
      index: n,
      p1: newPoint(lastY(), n * SEGMENT_LENGTH),
      p2: newPoint(y, (n + 1) * SEGMENT_LENGTH),
      curve,
      sprites: [],
      cars: [],
      color: Math.floor(n / RUMBLE_LENGTH) % 2 ? theme.dark : theme.light,
      looped: false,
      fog: 1,
      clip: 0
    })
  }

  function addSprite(n: number, source: Sprite, offset: number): void {
    seg(n).sprites.push({ source, offset })
  }

  function addRoad(enter: number, hold: number, leave: number, curve: number, y: number): void {
    const startY = lastY()
    const endY = startY + y * SEGMENT_LENGTH
    const total = enter + hold + leave
    for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total))
    for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total))
    for (let n = 0; n < leave; n++)
      addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total))
  }

  const addStraight = (num: number = LENGTH.MEDIUM): void => addRoad(num, num, num, 0, 0)
  const addHill = (num: number = LENGTH.MEDIUM, h: number = HILL.MEDIUM): void => addRoad(num, num, num, 0, h)
  const addCurve = (num: number = LENGTH.MEDIUM, curve: number = CURVE.MEDIUM, h: number = HILL.NONE): void =>
    addRoad(num, num, num, curve, h)

  function addLowRollingHills(num: number = LENGTH.SHORT, h: number = HILL.LOW): void {
    addRoad(num, num, num, 0, h / 2)
    addRoad(num, num, num, 0, -h)
    addRoad(num, num, num, CURVE.EASY, h)
    addRoad(num, num, num, 0, 0)
    addRoad(num, num, num, -CURVE.EASY, h / 2)
    addRoad(num, num, num, 0, 0)
  }

  function addSCurves(): void {
    const m = LENGTH.MEDIUM
    addRoad(m, m, m, -CURVE.EASY, HILL.NONE)
    addRoad(m, m, m, CURVE.MEDIUM, HILL.MEDIUM)
    addRoad(m, m, m, CURVE.EASY, -HILL.LOW)
    addRoad(m, m, m, -CURVE.EASY, HILL.MEDIUM)
    addRoad(m, m, m, -CURVE.MEDIUM, -HILL.MEDIUM)
  }

  function addBumps(): void {
    for (const y of [5, -2, -5, 8, 5, -7, 5, -2]) addRoad(10, 10, 10, 0, y)
  }

  function addDownhillToEnd(num = 200): void {
    addRoad(num, num, num, -CURVE.EASY, -lastY() / SEGMENT_LENGTH)
  }

  function resetSprites(): void {
    const { billboards, plants, poplar, pine, oak, post } = atlas

    // the first stretch: our own billboards, one per side of the start straight
    billboards.slice(0, 5).forEach((b, i) => addSprite(20 + i * 20, b, -1))
    addSprite(240, billboards[0] as Sprite, -1.2)
    addSprite(240, billboards[1] as Sprite, 1.2)
    addSprite(segments.length - 25, billboards[3] as Sprite, -1.2)
    addSprite(segments.length - 25, billboards[2] as Sprite, 1.2)

    for (let n = 10; n < 200; n += 4 + Math.floor(n / 100)) {
      addSprite(n, poplar, 1.15 + Math.random() * 0.5)
      addSprite(n, poplar, 1.7 + Math.random() * 2)
    }

    for (let n = 250; n < 1000; n += 5) {
      addSprite(n, post, 1.1)
      addSprite(n + randomInt(0, 5), oak, -1 - Math.random() * 2)
      addSprite(n + randomInt(0, 5), pine, -1 - Math.random() * 2)
    }

    for (let n = 200; n < segments.length; n += 3)
      addSprite(n, randomChoice(plants), randomChoice([1, -1]) * (2 + Math.random() * 5))

    for (let n = 1000; n < segments.length - 50; n += 100) {
      const side = randomChoice([1, -1])
      addSprite(n + randomInt(0, 50), randomChoice(billboards), -side)
      for (let i = 0; i < 20; i++) addSprite(n + randomInt(0, 50), randomChoice(plants), side * (1.5 + Math.random()))
    }
  }

  function resetCars(): void {
    cars = []
    for (let n = 0; n < TRAFFIC_COUNT[cfg.traffic]; n++) {
      const sprite = randomChoice(atlas.cars)
      const car: Car = {
        offset: Math.random() * randomChoice([-0.8, 0.8]),
        z: Math.floor(Math.random() * segments.length) * SEGMENT_LENGTH,
        sprite,
        speed: MAX_SPEED / 4 + (Math.random() * MAX_SPEED) / (sprite.heavy ? 4 : 2),
        percent: 0
      }
      findSegment(car.z).cars.push(car)
      cars.push(car)
    }
  }

  function resetRoad(): void {
    segments = []

    addStraight(LENGTH.SHORT)
    addLowRollingHills()
    addSCurves()
    addCurve(LENGTH.MEDIUM, CURVE.MEDIUM, HILL.LOW)
    addBumps()
    addLowRollingHills()
    addCurve(LENGTH.LONG * 2, CURVE.MEDIUM, HILL.MEDIUM)
    addStraight()
    addHill(LENGTH.MEDIUM, HILL.HIGH)
    addSCurves()
    addCurve(LENGTH.LONG, -CURVE.MEDIUM, HILL.NONE)
    addHill(LENGTH.LONG, HILL.HIGH)
    addCurve(LENGTH.LONG, CURVE.MEDIUM, -HILL.LOW)
    addBumps()
    addHill(LENGTH.LONG, -HILL.MEDIUM)
    addStraight()
    addSCurves()
    addDownhillToEnd()

    trackLength = segments.length * SEGMENT_LENGTH

    resetSprites()
    resetCars()

    seg(findSegment(PLAYER_Z).index + 2).color = START
    seg(findSegment(PLAYER_Z).index + 3).color = START
    for (let n = 0; n < RUMBLE_LENGTH; n++) seg(segments.length - 1 - n).color = FINISH
  }

  //=========================================================================
  // LIFECYCLE
  //=========================================================================

  function applyCanvasSize(): void {
    const [w, h] = QUALITY_SIZE[cfg.quality]
    canvas.width = width = w
    canvas.height = height = h
    resolution = h / 480
  }

  /** Speed ceiling of the chosen vehicle category (HUD km/h x 100), never above the engine's own MAX_SPEED. */
  function topSpeed(): number {
    return Math.min(MAX_SPEED, TOP_SPEED_KMH[cfg.body] * 100)
  }

  function rebuildLook(): void {
    theme = THEMES[cfg.scenery]
    atlas = makeAtlas(theme, cfg.body, cfg.color, cfg.plate)
    backdrop = makeBackdrop(theme, cfg.scenery, cfg.backdrop)
  }

  function frame(): void {
    // real elapsed time, fixed-step updates; a long gap (hidden tab) is capped so the car doesn't teleport
    const now = performance.now()
    const dt = Math.min(1, (now - last) / 1000)
    last = now
    acc += dt
    while (acc > STEP) {
      acc -= STEP
      update(STEP)
    }
    render()
    if (!destroyed) raf = requestAnimationFrame(frame)
  }

  const KEY_ACTIONS: Readonly<Record<string, (down: boolean) => void>> = {
    ArrowLeft: d => (keyLeft = d),
    KeyA: d => (keyLeft = d),
    ArrowRight: d => (keyRight = d),
    KeyD: d => (keyRight = d),
    ArrowUp: d => (keyFaster = d),
    KeyW: d => (keyFaster = d),
    ArrowDown: d => (keySlower = d),
    KeyS: d => (keySlower = d)
  }

  function handleKey(e: KeyboardEvent): void {
    const action = KEY_ACTIONS[e.code]
    if (!action || e.ctrlKey || e.metaKey || e.altKey) return
    action(e.type === 'keydown')
    e.preventDefault() // arrows must not scroll the page behind the dialog
  }

  function handleBlur(): void {
    keyLeft = keyRight = keyFaster = keySlower = false
  }

  function restart(): void {
    position = 0
    speed = 0
    playerX = 0
    currentLapTime = 0
    lastLapTime = null
    record = false
    resetRoad()
    emitHud(true)
  }

  let last = performance.now()
  let acc = 0

  applyCanvasSize()
  restart()
  window.addEventListener('keydown', handleKey)
  window.addEventListener('keyup', handleKey)
  window.addEventListener('blur', handleBlur)
  raf = requestAnimationFrame(frame)

  return {
    setConfig(next): void {
      if (sameConfig(cfg, next)) return
      const resized = next.quality !== cfg.quality
      const backdropChanged = next.backdrop !== cfg.backdrop
      const sameWorld =
        !resized && next.scenery === cfg.scenery && next.lanes === cfg.lanes && next.traffic === cfg.traffic
      cfg = next
      if (backdropChanged) {
        // photo layers are fetched on demand; the generated ones show until they arrive
        const wanted = next.backdrop
        void preloadBackdrop(wanted).then(() => {
          if (!destroyed && cfg.backdrop === wanted) backdrop = makeBackdrop(theme, cfg.scenery, wanted)
        })
      }
      if (sameWorld) {
        // only the car changed (colour, body, plate): swap its sprites, the road, scenery and traffic stay as they are
        atlas.player = makePlayerSprites(cfg.body, cfg.color, cfg.plate)
        speed = Math.min(speed, topSpeed())
        return
      }
      if (resized) applyCanvasSize()
      rebuildLook()
      // same geometry, new colours/sprites/traffic: the lap carries on from where the car is
      resetRoad()
    },
    restart,
    setSound: sound.setEnabled,
    destroy(): void {
      destroyed = true
      sound.destroy()
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKey)
      window.removeEventListener('blur', handleBlur)
    }
  }
}
