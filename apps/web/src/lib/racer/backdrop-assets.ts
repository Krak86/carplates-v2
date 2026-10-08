import { type BackdropId } from './config'

/**
 * Photo backdrops (`./backdrops/bg-<id>-sky|ridge.webp`, 1280x480, mirror-tiled — see scripts/racer-render/backdrop.html).
 * Unlike the car sprites they are fetched lazily, one set per scenery the player actually picks (~50-120 KB each).
 */
const LOADERS = import.meta.glob<string>('./backdrops/*.webp', { query: '?url', import: 'default' })

type Layers = { sky: HTMLImageElement; ridge: HTMLImageElement }

const LOADED = new Map<BackdropId, Layers>()

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(url))
    img.src = url
  })
}

async function loadLayer(id: BackdropId, layer: 'sky' | 'ridge'): Promise<HTMLImageElement> {
  const load = LOADERS[`./backdrops/bg-${id}-${layer}.webp`]
  if (!load) throw new Error(`missing backdrop ${id}/${layer}`)
  return loadImage(await load())
}

/** Resolves true once the backdrop is ready to use; false (never rejects) when it could not be loaded. */
export async function preloadBackdrop(id: BackdropId): Promise<boolean> {
  if (LOADED.has(id)) return true
  try {
    const [sky, ridge] = await Promise.all([loadLayer(id, 'sky'), loadLayer(id, 'ridge')])
    LOADED.set(id, { sky, ridge })
    return true
  } catch {
    return false
  }
}

export function backdropLayers(id: BackdropId): Layers | undefined {
  return LOADED.get(id)
}
