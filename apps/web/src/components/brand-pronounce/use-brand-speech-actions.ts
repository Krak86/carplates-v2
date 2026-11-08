import { useEffect, useRef, useState } from 'react'

import type { Speech } from './helpers'

/** Without an `onstart` in this time the engine swallowed the request (Android PWA, no voice installed): reset the button. */
const START_TIMEOUT_MS = 2000

/** A voice for `lang` (`uk-UA`): exact tag first, then the same primary language; undefined while the voice list is empty. */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices?.() ?? []
  const primary = lang.split('-')[0]?.toLowerCase()
  const norm = (v: SpeechSynthesisVoice): string => v.lang.replace('_', '-').toLowerCase()
  return voices.find(v => norm(v) === lang.toLowerCase()) ?? voices.find(v => norm(v).split('-')[0] === primary)
}

/** Browser speech synthesis on demand: `toggle` speaks / stops, cancelled on unmount. `supported` is false without `speechSynthesis`. */
export function useBrandSpeechActions(speech: Speech | null): {
  supported: boolean
  speaking: boolean
  toggle: () => void
} {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  // Chrome / Android garbage-collect an utterance nobody references, which silently drops `onend` and sometimes the audio.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => (): void => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (supported) window.speechSynthesis.cancel()
    },
    [supported]
  )

  function clearTimer(): void {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function toggle(): void {
    if (!supported || !speech) return
    const synth = window.speechSynthesis
    if (speaking) {
      clearTimer()
      synth.cancel()
      setSpeaking(false)
      return
    }
    // A cancel() straight before speak() makes Android Chrome drop the new utterance: cancel only when something is queued.
    if (synth.speaking || synth.pending) synth.cancel()
    // No voice installed for the language (common for Ukrainian on desktop): the engine fails at once, so read the English row.
    const voices = window.speechSynthesis.getVoices?.() ?? []
    const own = pickVoice(speech.lang)
    const useFallback = !own && voices.length > 0 && !!speech.fallback
    const target = useFallback && speech.fallback ? speech.fallback : speech
    const voice = useFallback ? pickVoice(target.lang) : own
    const utterance = new SpeechSynthesisUtterance(target.text)
    utterance.lang = target.lang
    if (voice) utterance.voice = voice
    utterance.rate = 0.85
    utterance.onstart = clearTimer
    utterance.onend = (): void => {
      clearTimer()
      setSpeaking(false)
    }
    utterance.onerror = (): void => {
      clearTimer()
      setSpeaking(false)
    }
    utteranceRef.current = utterance
    setSpeaking(true)
    // An engine stuck in the paused state (seen in installed PWAs) never starts a new utterance.
    if (synth.paused) synth.resume()
    synth.speak(utterance)
    timerRef.current = setTimeout(() => {
      if (!synth.speaking) setSpeaking(false)
    }, START_TIMEOUT_MS)
  }

  return { supported, speaking, toggle }
}
