import type { CSSProperties } from 'react'

/**
 * Brand logos whose name is a wordmark under the emblem: slug -> where the wordmark starts (fraction of the image height).
 * The logo quiz blurs everything below that line until the round is answered. Detected from the shipped WebP/SVG files
 * (a clear blank band above a flat, wide bottom strip).
 */
export const LOGO_TEXT_TOP: Readonly<Record<string, number>> = {
  acura: 0.66,
  'aston-martin': 0.73,
  bentley: 0.69,
  bogdan: 0.76,
  brilliance: 0.69,
  cadillac: 0.65,
  'can-am': 0.78,
  chery: 0.67,
  chevrolet: 0.7,
  citroen: 0.72,
  cupra: 0.84,
  daewoo: 0.64,
  daf: 0.72,
  denza: 0.7,
  dnipro: 0.7,
  ds: 0.84,
  feldbinder: 0.59,
  gac: 0.62,
  gaz: 0.76,
  geely: 0.69,
  genesis: 0.77,
  'great-wall': 0.81,
  hafei: 0.87,
  higer: 0.73,
  hino: 0.75,
  honda: 0.76,
  hyosung: 0.73,
  hyundai: 0.72,
  ikarus: 0.6,
  ikco: 0.76,
  infiniti: 0.72,
  jaguar: 0.69,
  jmc: 0.79,
  kamaz: 0.78,
  kassbohrer: 0.61,
  kavz: 0.64,
  kawasaki: 0.6,
  krone: 0.79,
  kymco: 0.81,
  landwind: 0.77,
  lev: 0.78,
  lexus: 0.62,
  loncin: 0.65,
  luaz: 0.67,
  mack: 0.74,
  maserati: 0.64,
  maxus: 0.75,
  mazda: 0.78,
  'mercedes-benz': 0.73,
  mercury: 0.83,
  oldsmobile: 0.6,
  paz: 0.84,
  peterbilt: 0.75,
  peugeot: 0.79,
  piaggio: 0.78,
  pontiac: 0.74,
  porsche: 0.74,
  proton: 0.82,
  qingqi: 0.81,
  ram: 0.74,
  rivian: 0.8,
  saipa: 0.75,
  samand: 0.69,
  saturn: 0.72,
  seat: 0.75,
  segway: 0.65,
  shineray: 0.71,
  skoda: 0.73,
  soueast: 0.73,
  ssangyong: 0.66,
  subaru: 0.72,
  suzuki: 0.6,
  tata: 0.62,
  temsa: 0.84,
  tesla: 0.83,
  uaz: 0.57,
  ural: 0.69,
  vauxhall: 0.76,
  'western-star': 0.66,
  wuling: 0.76,
  yamaha: 0.79,
  yutong: 0.68,
  zaz: 0.64
}

/** Logos with the name elsewhere (inside the emblem, beside it): slug -> [left, top, right, bottom] as fractions of the image. */
export const LOGO_TEXT_BOX: Readonly<Record<string, readonly [number, number, number, number]>> = {
  bmw: [0.25, 0.08, 0.8, 0.4],
  dacia: [0.28, 0.15, 0.72, 0.34],
  dodge: [0.03, 0.38, 0.8, 0.6],
  fiat: [0.34, 0.3, 0.7, 0.62],
  ford: [0.2, 0.33, 0.8, 0.72],
  kia: [0.24, 0.28, 0.74, 0.6],
  'land-rover': [0.22, 0.28, 0.78, 0.7],
  lifan: [0.36, 0.22, 0.93, 0.78],
  man: [0.1, 0.58, 0.9, 0.88],
  mitsubishi: [0, 0.7, 1, 1],
  musstang: [0, 0.5, 1, 0.72],
  nissan: [0.06, 0.38, 0.94, 0.62],
  spark: [0.28, 0.38, 0.9, 0.64],
  volvo: [0.26, 0.38, 0.72, 0.6]
}

/** Logos whose name runs round the rim of a round badge (the inner disc stays sharp). */
const LOGO_TEXT_RING: ReadonlySet<string> = new Set(['schmitz'])

const RING_INNER = '64%'
const RING_OUTER = '66%'

export type LogoTextMask = {
  /** Style for the sharp logo: everything except the hidden part. */
  sharp: CSSProperties
  /** Style for the blurred copy laid over it: only the hidden part. */
  blurred: CSSProperties
}

/** Clip styles that blur the name of a logo (undefined when the emblem carries no readable name). */
export function logoTextMask(slug: string): LogoTextMask | undefined {
  if (LOGO_TEXT_RING.has(slug)) {
    const sharp = `radial-gradient(circle closest-side, #000 ${RING_INNER}, transparent ${RING_OUTER})`
    const blurred = `radial-gradient(circle closest-side, transparent ${RING_INNER}, #000 ${RING_OUTER})`
    return {
      sharp: { maskImage: sharp, WebkitMaskImage: sharp },
      blurred: { maskImage: blurred, WebkitMaskImage: blurred }
    }
  }
  const top = LOGO_TEXT_TOP[slug]
  const box = LOGO_TEXT_BOX[slug] ?? (top === undefined ? undefined : ([0, top, 1, 1] as const))
  if (!box) return undefined
  const [l, t, r, b] = box.map(v => `${v * 100}%`) as [string, string, string, string]
  return {
    sharp: {
      clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l} ${t}, ${l} ${b}, ${r} ${b}, ${r} ${t}, ${l} ${t})`
    },
    blurred: { clipPath: `inset(${t} calc(100% - ${r}) calc(100% - ${b}) ${l})` }
  }
}
