import type { PlateCandidate } from '@carplates/shared'
import sharp from 'sharp'

/** Same amber as the unselected outline on the web (`PhotoPlateBoxes`). */
const OUTLINE_COLOR = '#fbbf24'

/** One outline per distinct box: alternative readings of a plate share it. */
export function distinctBoxes(candidates: PlateCandidate[]): NonNullable<PlateCandidate['box']>[] {
  const seen = new Set<string>()
  const boxes: NonNullable<PlateCandidate['box']>[] = []
  for (const { box } of candidates) {
    if (!box) continue
    const key = [box.x, box.y, box.w, box.h].map(v => v.toFixed(3)).join(',')
    if (seen.has(key)) continue
    seen.add(key)
    boxes.push(box)
  }
  return boxes
}

export function outlinesSvg(width: number, height: number, candidates: PlateCandidate[]): Buffer | null {
  const boxes = distinctBoxes(candidates)
  if (boxes.length === 0) return null
  const stroke = Math.max(3, Math.round(Math.max(width, height) / 220))
  const rects = boxes.map(b => {
    const x = Math.max(0, b.x * width)
    const y = Math.max(0, b.y * height)
    const w = Math.min(b.w * width, width - x)
    const h = Math.min(b.h * height, height - y)
    // A dark halo under the colored line keeps it visible on light and busy backgrounds.
    return (
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${stroke}" ` +
      `fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="${stroke + 2}"/>` +
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${stroke}" ` +
      `fill="none" stroke="${OUTLINE_COLOR}" stroke-width="${stroke}"/>`
    )
  })
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects.join('')}</svg>`
  )
}

/**
 * The stored photo with the plates outlined, for the link preview (`og:image`) only: the viewer and the plain
 * `/image` keep the clean copy. Returns the input unchanged when no candidate has a box. Always a JPEG.
 */
export async function drawPlateOutlines(image: Buffer, candidates: PlateCandidate[]): Promise<Buffer> {
  const { width, height } = await sharp(image).metadata()
  const svg = width && height ? outlinesSvg(width, height, candidates) : null
  if (!svg) return image
  return sharp(image)
    .composite([{ input: svg }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
}
