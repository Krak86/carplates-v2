import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { buildLayoutShareUrl } from '@/hooks/useLayoutUrl'
import { cn } from '@/lib/cn'
import { isStreamMode } from '@/lib/live-background'
import { copyToClipboard } from '@/lib/share-section'
import { useLiveBackgroundStore } from '@/store/live-background-store'

type Props = {
  className?: string
}

/** Shares the active background as a `/relax?layout=…` link (native share sheet, else clipboard). Hidden on photos. */
export default function ShareLayoutButton({ className }: Props): ReactNode {
  const { t } = useTranslation()
  const mode = useLiveBackgroundStore(s => s.mode)
  const streams = useLiveBackgroundStore(s => s.streams)
  const [copied, setCopied] = useState(false)

  if (mode === 'images') return null

  const handleShare = async (): Promise<void> => {
    const url = buildLayoutShareUrl(mode, isStreamMode(mode) ? streams[mode] : undefined)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('nav.relax'), url })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    if (await copyToClipboard(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12M8 7l4-4 4 4" />
        <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      </svg>
      {copied ? t('layers.shareCopied') : t('layers.share')}
    </button>
  )
}
