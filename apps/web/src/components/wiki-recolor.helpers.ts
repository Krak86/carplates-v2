import { isClosePaint, paintTargetLinear, paintTone, resolveVehicleColor } from '@carplates/shared'
import type { VehicleColor, WikiRecolor } from '@carplates/shared'

/**
 * The colour the hero photo gets repainted to, or null = show the original: no scan for this photo, a scan of another
 * photo than the one shown (the hero can differ from the stored row: `yearOnly`, live fallback), no usable registry
 * colour, or the registry colour is already (close to) the photographed paint.
 */
export function wikiRecolorTarget(
  recolor: WikiRecolor | null | undefined,
  rawColor: string | null | undefined,
  imageUrl: string | null | undefined
): VehicleColor | null {
  if (!recolor || !imageUrl || recolor.imageUrl !== imageUrl) return null
  const target = resolveVehicleColor(rawColor)
  if (!target || isClosePaint(recolor.lab, target)) return null
  return target
}

/** The source rect of an image of `srcW` x `srcH` that `object-fit: cover` shows in a `boxW` x `boxH` box (centred crop). */
export function coverRect(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number
): { sx: number; sy: number; sw: number; sh: number } {
  if (srcW <= 0 || srcH <= 0 || boxW <= 0 || boxH <= 0) return { sx: 0, sy: 0, sw: srcW, sh: srcH }
  const scale = Math.max(boxW / srcW, boxH / srcH)
  const sw = boxW / scale
  const sh = boxH / scale
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh }
}

/** shade byte -> painted sRGB channel, for all 256 shades x 3 channels (the per-pixel maths of `paintTone`, done once per colour). */
function toneTable(color: VehicleColor): Uint8ClampedArray {
  const target = paintTargetLinear(color)
  const table = new Uint8ClampedArray(256 * 3)
  for (let b = 0; b < 256; b++) {
    for (const k of [0, 1, 2] as const) table[b * 3 + k] = Math.round(paintTone(b, target, k))
  }
  return table
}

/** The recolour layer of a mask: rgb = painted tone of the shading, alpha = the mask's paint weight (composited by the canvas over the photo). */
export function paintLayer(mask: Uint8ClampedArray, color: VehicleColor): Uint8ClampedArray<ArrayBuffer> {
  const table = toneTable(color)
  const out = new Uint8ClampedArray(mask.length)
  for (let i = 0; i < mask.length; i += 4) {
    const alpha = mask[i + 3]!
    if (alpha < 3) continue
    const t = mask[i]! * 3
    out[i] = table[t]!
    out[i + 1] = table[t + 1]!
    out[i + 2] = table[t + 2]!
    out[i + 3] = alpha
  }
  return out
}
