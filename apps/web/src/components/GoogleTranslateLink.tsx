import { lazy, Suspense, useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import GoogleTranslateAnchor from '@/components/GoogleTranslateAnchor'
import { needsTranslation } from '@/lib/google-translate'
import { isChromeReady, translateLocally } from '@/lib/local-translate'

// The dialog (and, behind it, the on-device translation engines) loads only when a reader opens it.
const TranslateDialog = lazy(() => import('@/components/TranslateDialog'))

type Props = {
  /** The untranslated text. */
  text: string
  /** Language of `text` (`nl`, `en`). */
  from: string
}

/**
 * Next to untranslated text: a button opening the translate dialog (on-device translation) and, always, the external
 * Google Translate link. Once the browser's built-in translator is installed, a "Translate here" button translates in
 * place and shows the result in a tinted block underneath. Renders nothing when the text is already in the UI language.
 */
export default function GoogleTranslateLink({ text, from }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [inPlace, setInPlace] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const lang = i18n.language

  // Re-asked when the dialog closes: the reader may just have installed the language pack there.
  useEffect(() => {
    if (open) return
    let cancelled = false
    void isChromeReady(from, lang).then(ok => {
      if (!cancelled) setReady(ok)
    })
    return (): void => {
      cancelled = true
    }
  }, [from, lang, open])

  if (!needsTranslation(from, lang)) return null

  const handleOpen = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault() // inside a <summary>: do not toggle the <details>
    setOpen(true)
  }

  const handleInPlace = async (e: MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault()
    if (inPlace) {
      setInPlace(null)
      return
    }
    setBusy(true)
    setFailed(false)
    try {
      setInPlace(await translateLocally('chrome', text, from, lang, () => undefined))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
        {ready && (
          <button
            type="button"
            disabled={busy}
            onClick={e => void handleInPlace(e)}
            className="underline hover:no-underline disabled:opacity-50"
          >
            {busy ? t('translate.working') : inPlace ? t('translate.hideHere') : t('translate.here')}
          </button>
        )}
        <button type="button" onClick={handleOpen} className="underline hover:no-underline">
          {t('translate.open')}
        </button>
        <GoogleTranslateAnchor text={text} from={from} />
        {failed && <span className="text-[var(--color-mot-fail)]">{t('translate.failed')}</span>}
      </span>
      {inPlace && (
        <span
          onClick={e => e.preventDefault()}
          className="mt-1 block cursor-text rounded-lg bg-[var(--color-border)]/30 p-2 text-sm font-normal whitespace-pre-line text-[var(--color-fg)]"
        >
          {inPlace}
          <span className="mt-1 block text-xs text-[var(--color-muted)]">{t('recalls.aiTranslation')}</span>
        </span>
      )}
      {open && (
        <Suspense fallback={null}>
          <TranslateDialog text={text} from={from} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
