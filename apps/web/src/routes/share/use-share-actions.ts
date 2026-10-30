import { useState } from 'react'
import type { ShareAlias } from '@carplates/shared'

import i18n, { type Lang } from '@/i18n'
import { copyToClipboard } from '@/lib/share-section'
import { buildAliasUrl } from '@/routes/share/share-links'

type UseShareActions = {
  lang: Lang
  setLang: (lang: Lang) => void
  src: string
  setSrc: (src: string) => void
  copiedAlias: ShareAlias | null
  urlOf: (alias: ShareAlias) => string
  copy: (alias: ShareAlias) => Promise<void>
}

/** State of the `/share` page: the chosen link language and campaign tag, and which row was just copied. */
export function useShareActions(): UseShareActions {
  const [lang, setLang] = useState<Lang>(i18n.language as Lang)
  const [src, setSrc] = useState('')
  const [copiedAlias, setCopiedAlias] = useState<ShareAlias | null>(null)

  const urlOf = (alias: ShareAlias): string => buildAliasUrl(window.location.origin, alias, lang, src)

  const copy = async (alias: ShareAlias): Promise<void> => {
    if (!(await copyToClipboard(urlOf(alias)))) return
    setCopiedAlias(alias)
    setTimeout(() => setCopiedAlias(current => (current === alias ? null : current)), 1800)
  }

  return { lang, setLang, src, setSrc, copiedAlias, urlOf, copy }
}
