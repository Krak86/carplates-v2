import { useEffect, useRef, useState } from 'react'

import { buildShareUrl, copyToClipboard } from '@/lib/share-section'
import type { ShareSection } from '@/lib/share-section'

type UseShareActions = {
  copied: boolean
  share: () => void
}

const COPIED_FEEDBACK_MS = 1600

export function useShareActions(section: ShareSection, tab?: string): UseShareActions {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const share = (): void => {
    void copyToClipboard(buildShareUrl(section, tab)).then(ok => {
      if (!ok) return
      setCopied(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    })
  }

  return { copied, share }
}
