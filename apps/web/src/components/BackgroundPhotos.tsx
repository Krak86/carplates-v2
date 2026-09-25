import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useBackgroundParallax } from '@/hooks/useBackgroundParallax'
import { getBackgroundImages } from '@/lib/background-images'
import { useBackgroundStore } from '@/store/background-store'

const IMAGES = getBackgroundImages()
const SWAP_DELAY_MS = 700

export default function BackgroundPhotos(): ReactNode {
  const layerRef = useRef<HTMLDivElement>(null)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const photosEnabled = useBackgroundStore(s => s.photosEnabled)
  const blurEnabled = useBackgroundStore(s => s.blurEnabled)
  const blurPx = useBackgroundStore(s => s.blurPx)
  const grayscaleEnabled = useBackgroundStore(s => s.grayscaleEnabled)
  const grayscalePercent = useBackgroundStore(s => s.grayscalePercent)
  const brightnessEnabled = useBackgroundStore(s => s.brightnessEnabled)
  const brightnessPercent = useBackgroundStore(s => s.brightnessPercent)
  const overlayEnabled = useBackgroundStore(s => s.overlayEnabled)
  const overlayOpacity = useBackgroundStore(s => s.overlayOpacity)
  const mouseParallaxEnabled = useBackgroundStore(s => s.mouseParallaxEnabled)
  const mouseParallaxStrength = useBackgroundStore(s => s.mouseParallaxStrength)
  const scrollParallaxEnabled = useBackgroundStore(s => s.scrollParallaxEnabled)
  const scrollParallaxStrength = useBackgroundStore(s => s.scrollParallaxStrength)
  const cycleEnabled = useBackgroundStore(s => s.cycleEnabled)
  const cycleIntervalSec = useBackgroundStore(s => s.cycleIntervalSec)

  useBackgroundParallax(layerRef, {
    mouseEnabled: mouseParallaxEnabled,
    mouseStrength: mouseParallaxStrength,
    scrollEnabled: scrollParallaxEnabled,
    scrollStrength: scrollParallaxStrength
  })

  // Fade out, swap the image while invisible, fade back in — avoids animating
  // background-image directly (browsers don't interpolate it, so it would just snap).
  useEffect(() => {
    if (!cycleEnabled || IMAGES.length < 2) return
    let swapTimeout: ReturnType<typeof setTimeout>
    const intervalId = setInterval(() => {
      setVisible(false)
      swapTimeout = setTimeout(() => {
        setDisplayIndex(i => (i + 1) % IMAGES.length)
        setVisible(true)
      }, SWAP_DELAY_MS)
    }, cycleIntervalSec * 1000)
    return (): void => {
      clearInterval(intervalId)
      clearTimeout(swapTimeout)
    }
  }, [cycleEnabled, cycleIntervalSec])

  if (!photosEnabled || IMAGES.length === 0) return null

  const filter =
    [
      blurEnabled && blurPx > 0 ? `blur(${blurPx}px)` : null,
      grayscaleEnabled && grayscalePercent > 0 ? `grayscale(${grayscalePercent}%)` : null,
      brightnessEnabled ? `brightness(${brightnessPercent}%)` : null
    ]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        ref={layerRef}
        className="absolute inset-[-10%] bg-cover bg-center transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
        style={{
          backgroundImage: IMAGES[displayIndex]?.css,
          filter,
          opacity: visible ? 1 : 0,
          transform:
            'translate3d(var(--bg-parallax-x, 0px), calc(var(--bg-parallax-y, 0px) + var(--bg-parallax-scroll, 0px)), 0)'
        }}
      />
      {overlayEnabled && (
        // Mixes toward the theme's own page background (not a fixed black) so foreground
        // text — sized for --color-fg on --color-bg — keeps its intended contrast no
        // matter how dark/bright the underlying photo is.
        <div
          className="absolute inset-0"
          style={{ background: `color-mix(in srgb, var(--color-bg) ${overlayOpacity}%, transparent)` }}
        />
      )}
    </div>
  )
}
