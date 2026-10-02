export type EmbeddedImage = { data: Uint8Array; width: number; height: number }

/**
 * Fetches `url` and re-encodes it as PNG through a canvas — one format for both docx and jsPDF no
 * matter what Commons served (webp/jpg/png). Best-effort: any failure (offline, CORS, decode)
 * returns null and the caller just leaves the picture out.
 */
export async function fetchImageAsPng(url: string, maxWidth: number): Promise<EmbeddedImage | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const bitmap = await createImageBitmap(await response.blob())
    const scale = Math.min(1, maxWidth / bitmap.width)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, width, height)

    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!png) return null
    return { data: new Uint8Array(await png.arrayBuffer()), width, height }
  } catch {
    return null
  }
}
