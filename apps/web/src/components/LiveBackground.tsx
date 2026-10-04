import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { useBackgroundMode, useLiveMapView } from '@/hooks/useBackgroundMode'
import { EARTH_PLAYER_SIZE, earthEmbedUrl, mapUrl } from '@/lib/live-background'
import { useLiveBackgroundStore } from '@/store/live-background-store'

function useCoverScale(): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const update = (): void =>
      setScale(Math.max(window.innerWidth / EARTH_PLAYER_SIZE.width, window.innerHeight / EARTH_PLAYER_SIZE.height))
    update()
    window.addEventListener('resize', update)
    return (): void => window.removeEventListener('resize', update)
  }, [])
  return scale
}

// Lazy-loaded (see Layout.tsx): nothing here ships until a live layer is picked.
export default function LiveBackground(): ReactNode {
  const mode = useBackgroundMode()
  const view = useLiveMapView()
  const earthStream = useLiveBackgroundStore(s => s.earthStream)
  const scale = useCoverScale()

  const src = mode === 'earth' ? earthEmbedUrl(earthStream) : mode === 'map' ? mapUrl(view) : undefined
  if (!src) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      {mode === 'earth' ? (
        <iframe
          key={src}
          src={src}
          title="Earth live"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          className="absolute top-1/2 left-1/2 max-w-none border-0"
          style={{
            width: EARTH_PLAYER_SIZE.width,
            height: EARTH_PLAYER_SIZE.height,
            transform: `translate(-50%, -50%) scale(${scale})`
          }}
        />
      ) : (
        <iframe key={src} src={src} title="Map" tabIndex={-1} className="absolute inset-0 h-full w-full border-0" />
      )}
      {/* Same readability veil as the photo layer, so foreground text keeps its contrast. */}
      <div
        className="absolute inset-0"
        style={{ background: 'color-mix(in srgb, var(--color-bg) 55%, transparent)' }}
      />
    </div>
  )
}
