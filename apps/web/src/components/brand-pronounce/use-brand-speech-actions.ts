import { useEffect, useState } from 'react'

/** Browser speech synthesis on demand: `toggle` speaks / stops, cancelled on unmount. `supported` is false without `speechSynthesis`. */
export function useBrandSpeechActions(speech: { text: string; lang: string } | null): {
  supported: boolean
  speaking: boolean
  toggle: () => void
} {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)

  useEffect(
    () => (): void => {
      if (supported) window.speechSynthesis.cancel()
    },
    [supported]
  )

  function toggle(): void {
    if (!supported || !speech) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(speech.text)
    utterance.lang = speech.lang
    utterance.rate = 0.85
    utterance.onend = (): void => setSpeaking(false)
    utterance.onerror = (): void => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return { supported, speaking, toggle }
}
