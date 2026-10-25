import { regionFlagUrl } from '@/lib/region-flags'

const FLAGS = new Map<string, HTMLImageElement | null>()

/** Fetches the region's flag once (a missing or broken one is remembered as `null`) so the billboards can show it. */
export async function preloadRegionFlag(region: string): Promise<void> {
  const url = regionFlagUrl(region)
  if (!url || FLAGS.has(url)) return
  FLAGS.set(
    url,
    await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    })
  )
}

export function regionFlagImage(region: string): HTMLImageElement | null {
  const url = regionFlagUrl(region)
  return (url && FLAGS.get(url)) || null
}
