import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import ThirdPartyNote from '@/components/ThirdPartyNote'
import { LAYOUT_PARAM, STREAM_PARAM, parseMode } from '@/hooks/useLayoutUrl'
import { isStreamMode, isThirdPartyMode } from '@/lib/live-background'
import { useLiveBackgroundStore } from '@/store/live-background-store'

/**
 * A shared `?layout=map|earth|traffic|city` link loads a Google / YouTube iframe, which sends the visitor's IP to a
 * third party. The link only asks (see `useApplyLayoutFromUrl`); the layer starts on this click.
 */
export default function SharedLayoutPrompt(): ReactNode {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const mode = useLiveBackgroundStore(s => s.mode)
  const setMode = useLiveBackgroundStore(s => s.setMode)
  const [dismissed, setDismissed] = useState<string | null>(null)

  const shared = parseMode(params.get(LAYOUT_PARAM))
  const key = `${shared}:${params.get(STREAM_PARAM)}`
  if (!shared || !isThirdPartyMode(shared) || shared === mode || dismissed === key) return null

  return (
    <div
      role="status"
      className="sticky top-14 z-20 flex flex-wrap items-center justify-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-1.5 text-center text-sm backdrop-blur-md"
    >
      <span>{t(isStreamMode(shared) ? 'sharedLayout.stream' : 'sharedLayout.map')}</span>
      <ThirdPartyNote provider={isStreamMode(shared) ? 'YouTube' : 'Google'} />
      <button
        type="button"
        onClick={() => setMode(shared)}
        className="rounded-lg bg-[var(--color-primary)]/10 px-3 py-0.5 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
      >
        {t('sharedLayout.show')}
      </button>
      <button type="button" onClick={() => setDismissed(key)} className="text-[var(--color-muted)] underline">
        {t('sharedLayout.dismiss')}
      </button>
    </div>
  )
}
