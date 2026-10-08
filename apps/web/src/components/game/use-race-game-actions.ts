import { useEffect, useRef, useState } from 'react'

import type { RacerConfig, RacerHud } from '@/lib/racer/config'
import type { Racer } from '@/lib/racer/engine'

const LOADED_KEY = 'carplates.racer.loaded'

function readLoaded(): boolean {
  try {
    return localStorage.getItem(LOADED_KEY) === '1'
  } catch {
    return false
  }
}

type Phase = 'intro' | 'loading' | 'playing' | 'error'
type Engine = typeof import('@/lib/racer/engine')

/**
 * The game engine is its own lazy chunk: nothing is fetched until the viewer confirms on the intro screen. The canvas
 * only exists while playing; the racer is created when both the chunk and the canvas are there, applies setting
 * changes live, and is destroyed (RAF + key listeners) when the modal closes.
 */
export function useRaceGameActions(config: RacerConfig, sound: boolean) {
  // Once the chunk has been fetched on this device it is in the HTTP cache — the size warning would be noise.
  const [wasLoaded] = useState(readLoaded)
  const [phase, setPhase] = useState<Phase>('intro')
  const [engine, setEngine] = useState<Engine | null>(null)
  const [hud, setHud] = useState<RacerHud | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const racerRef = useRef<Racer | null>(null)
  const configRef = useRef(config)
  const soundRef = useRef(sound)

  useEffect(() => {
    configRef.current = config
    racerRef.current?.setConfig(config)
  }, [config])

  useEffect(() => {
    soundRef.current = sound
    racerRef.current?.setSound(sound)
  }, [sound])

  useEffect(() => {
    if (!engine || !canvas) return
    const racer = engine.createRacer(canvas, configRef.current, setHud)
    racer.setSound(soundRef.current)
    racerRef.current = racer
    return () => {
      racer.destroy()
      racerRef.current = null
    }
  }, [engine, canvas])

  const handleStart = (): void => {
    setPhase('loading')
    import('@/lib/racer/engine').then(
      async mod => {
        // the first frame already has the chosen photo backdrop (a failed fetch just keeps the generated one)
        await mod.preloadBackdrop(configRef.current.backdrop)
        setEngine(mod)
        try {
          localStorage.setItem(LOADED_KEY, '1')
        } catch {
          // blocked storage: the intro just shows the size note again next time
        }
        setPhase('playing')
      },
      () => setPhase('error')
    )
  }

  const handleRestart = (): void => racerRef.current?.restart()

  return { phase, hud, wasLoaded, handleStart, handleRestart, setCanvas }
}
