export const MAX_DIMENSION = 4608
const TARGET_BYTES = 2_500_000
const MIN_QUALITY = 0.4
const QUALITY_STEP = 0.15

type Surface = OffscreenCanvas | HTMLCanvasElement

function toBlob(canvas: Surface, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type: 'image/jpeg', quality })
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('canvas encode failed'))), 'image/jpeg', quality)
  })
}

/** Downscales the bitmap (closing it) to `MAX_DIMENSION` and re-encodes to a JPEG of at most ~2.5 MB. Works in a worker and on the main thread. */
export async function encodeJpeg(bitmap: ImageBitmap): Promise<Blob> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas: Surface =
    typeof OffscreenCanvas === 'undefined'
      ? Object.assign(document.createElement('canvas'), { width, height })
      : new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('no 2d context')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = 0.85
  let blob = await toBlob(canvas, quality)
  while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP
    blob = await toBlob(canvas, quality)
  }
  return blob
}
