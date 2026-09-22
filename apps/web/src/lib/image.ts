const MAX_DIMENSION = 1600
const TARGET_BYTES = 900_000
const MIN_QUALITY = 0.4
const QUALITY_STEP = 0.15

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('canvas encode failed'))), 'image/jpeg', quality)
  })
}

/**
 * Downscales + re-encodes to ~900 KB JPEG before upload. Falls back to the
 * original file if the browser can't decode it (e.g. an exotic format) — the
 * server's mimetype allowlist then gives a clear error instead.
 */
export async function shrinkImage(file: File): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let quality = 0.85
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP
    blob = await canvasToBlob(canvas, quality)
  }
  return new File([blob], 'plate.jpg', { type: 'image/jpeg' })
}
