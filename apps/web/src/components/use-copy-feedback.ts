import { useEffect, useRef, useState } from 'react'

import { copyToClipboard } from '@/lib/share-section'

type UseCopyFeedback = {
  copied: boolean
  copy: (text: string) => void
}

const COPIED_FEEDBACK_MS = 1600

/** Copies text to the clipboard and flips `copied` on for COPIED_FEEDBACK_MS — drives the
 *  icon-swap + "Copied!" pattern shared by ShareButton and CopyButton. */
export function useCopyFeedback(): UseCopyFeedback {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => (): void => clearTimeout(timeoutRef.current), [])

  const copy = (text: string): void => {
    void copyToClipboard(text).then(ok => {
      if (!ok) return
      setCopied(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    })
  }

  return { copied, copy }
}
