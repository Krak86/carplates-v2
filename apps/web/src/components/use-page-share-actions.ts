import { useState } from 'react'

import i18n from '@/i18n'
import { copyToClipboard, shareBaseUrl } from '@/lib/share-section'
import { setFontParam } from '@/store/ui-store'

/** Personal / admin pages: a shared link would only show the recipient their own (or a login) view. */
export const NO_SHARE_PATHS = new Set([
  '/history',
  '/favorites',
  '/settings',
  '/profile',
  '/login',
  '/logout',
  '/admin'
])

/** The catalog: `/cars`, `/cars/:make`, `/cars/:make/:model` (with or without a trailing slash). */
export const isCatalogPath = (pathname: string): boolean => /^\/cars(\/|$)/.test(pathname)

type UsePageShareActions = {
  copied: boolean
  share: () => Promise<void>
}

/** The current page's link with the sharer's language and font. */
export function buildPageShareUrl(): string {
  const params = new URLSearchParams({ lang: i18n.language })
  setFontParam(params)
  return `${shareBaseUrl()}?${params.toString()}`
}

/** Shares the current page's link (native share sheet, else clipboard). The link carries the sharer's language. */
export function usePageShareActions(title?: string): UsePageShareActions {
  const [copied, setCopied] = useState(false)

  const share = async (): Promise<void> => {
    const url = buildPageShareUrl()
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
