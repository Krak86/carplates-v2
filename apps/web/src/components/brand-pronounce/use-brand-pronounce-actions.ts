import { useEffect, useRef, useState } from 'react'

/**
 * Plays one audio clip on demand (`new Audio(url)`, nothing is fetched before the first press) and toggles it off on a second
 * press. The clip stops when the component unmounts (the popover closes).
 */
export function useBrandPronounceActions(url: string | undefined): {
  playing: boolean
  failed: boolean
  toggle: () => void
} {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(
    () => (): void => {
      audio.current?.pause()
      audio.current = null
    },
    []
  )

  function toggle(): void {
    if (!url) return
    if (audio.current && !audio.current.paused) {
      audio.current.pause()
      audio.current.currentTime = 0
      setPlaying(false)
      return
    }
    if (!audio.current) {
      const el = new Audio(url)
      el.preload = 'none'
      el.onended = (): void => setPlaying(false)
      el.onerror = (): void => {
        setPlaying(false)
        setFailed(true)
      }
      audio.current = el
    }
    setFailed(false)
    audio.current.play().then(
      (): void => setPlaying(true),
      (): void => {
        setPlaying(false)
        setFailed(true)
      }
    )
  }

  return { playing, failed, toggle }
}
