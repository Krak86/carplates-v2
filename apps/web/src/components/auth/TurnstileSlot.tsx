import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { mountTurnstile } from '@/lib/turnstile'
import type { TurnstileHandle } from '@/lib/turnstile'
import { useUiStore } from '@/store/ui-store'

type Props = {
  siteKey: string
  /** Changing it throws the widget away and renders a fresh one (a Turnstile token is single-use). */
  resetKey: number
  onToken: (token: string | null) => void
}

export default function TurnstileSlot({ siteKey, resetKey, onToken }: Props): ReactNode {
  const lang = useUiStore(s => s.lang)
  const theme = useUiStore(s => s.theme)
  const slotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    let cancelled = false
    let handle: TurnstileHandle | null = null
    mountTurnstile(slot, siteKey, theme === 'dark' ? 'dark' : 'light', lang, onToken).then(
      h => {
        if (cancelled) h.destroy()
        else handle = h
      },
      () => onToken(null)
    )
    return (): void => {
      cancelled = true
      handle?.destroy()
    }
  }, [siteKey, resetKey, lang, theme, onToken])

  return <div ref={slotRef} className="mt-2 min-h-[65px]" />
}
