import { useState } from 'react'

import i18n from '@/i18n'
import { copyToClipboard } from '@/lib/share-section'
import { setFontParam } from '@/store/ui-store'

/** Personal / admin pages: a shared link would only show the recipient their own (or a login) view. */
export const NO_SHARE_PATHS = new Set(['/history', '/favorites', '/settings', '/profile', '/admin'])

type UsePageShareActions = {
  copied: boolean
  share: () => Promise<void>
}

/** Shares the current page's link (native share sheet, else clipboard). The link carries the sharer's language. */
export function usePageShareActions(title?: string): UsePageShareActions {
  const [copied, setCopied] = useState(false)

  const share = async (): Promise<void> => {
    const params = new URLSearchParams({ lang: i18n.language })
    setFontParam(params)
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: title ?? document.title, url })
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

  return { copied, share }
}
