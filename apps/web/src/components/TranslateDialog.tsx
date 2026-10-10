import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import GoogleTranslateAnchor from '@/components/GoogleTranslateAnchor'
import { useTranslateDialogActions } from '@/components/use-translate-dialog-actions'
import type { LocalOption } from '@/lib/local-translate'

type Props = {
  text: string
  /** Language of `text` (`nl`, `en`). */
  from: string
  onClose: () => void
}

/** Language name in the UI language ("Dutch", "нідерландська"). */
const languageName = (code: string, uiLang: string): string =>
  new Intl.DisplayNames([uiLang === 'ua' ? 'uk' : uiLang], { type: 'language' }).of(code === 'ua' ? 'uk' : code) ?? code

/**
 * Translate dialog, laid out like Google Translate: source language on the left, target on the right, the result in the
 * right pane. Below: what this browser can translate on-device (the size of any download is shown, and it only starts when
 * the reader chooses it), and always the external Google Translate link.
 */
export default function TranslateDialog({ text, from, onClose }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)
  const { options, running, result, failed, handleTranslate } = useTranslateDialogActions(text, from, i18n.language)
  const fromName = languageName(from, i18n.language)
  const toName = languageName(i18n.language, i18n.language)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const describe = (o: LocalOption): string => {
    if (o.status === 'ready') return t('translate.ready')
    if (o.id === 'chrome') return t('translate.chromeDownload')
    const steps = o.steps?.filter(s => !s.cached).map(s => `${s.pair} ${s.sizeMb}`) ?? []
    return t('translate.opusDownload', { size: o.sizeMb, steps: steps.join(' + ') })
  }

  const buttonLabel = (o: LocalOption): string => {
    if (running?.id === o.id) {
      return running.percent === null
        ? t('translate.working')
        : t('translate.downloading', { percent: running.percent })
    }
    return o.status === 'ready' ? t('translate.run') : t('translate.download')
  }

  const paneClass = 'min-h-28 rounded-2xl border border-[var(--color-border)] p-3 text-base'

  // Portaled: ancestors with transforms / view-transition names would trap a fixed overlay (see PhotoZoomDialog).
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={t('translate.title')}
        onClick={e => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-3xl space-y-3 overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="border-b-2 border-[var(--color-primary)] pb-0.5 text-[var(--color-primary)]">
              {fromName}
            </span>
            <span aria-hidden className="text-[var(--color-muted)]">
              →
            </span>
            <span className="pb-0.5">{toName}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('translate.close')}
            className="rounded-full px-2 text-lg leading-none hover:bg-[var(--color-border)]/40"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className={`${paneClass} bg-[var(--color-surface)]`}>
            <p lang={from} className="whitespace-pre-line">
              {text}
            </p>
            <p className="mt-2 text-right text-xs text-[var(--color-muted)]">{text.length}</p>
          </section>

          <section className={`${paneClass} bg-[var(--color-border)]/30`} aria-live="polite">
            {result && (
              <>
                <p className="whitespace-pre-line">{result.text}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {t('recalls.aiTranslation')} · {t(`translate.engine.${result.id}`)}
                </p>
              </>
            )}
            {!result && running && (
              <p className="text-[var(--color-muted)]">
                {running.percent === null
                  ? t('translate.working')
                  : t('translate.downloading', { percent: running.percent })}
              </p>
            )}
            {!result && !running && !failed && (
              <p className="text-[var(--color-muted)]">
                {options === null
                  ? t('translate.detecting')
                  : options.length === 0
                    ? t('translate.none')
                    : t('translate.pick')}
              </p>
            )}
            {failed && <p className="text-[var(--color-mot-fail)]">{t('translate.failed')}</p>}
          </section>
        </div>

        <section className="space-y-2">
          <h3 className="text-xs text-[var(--color-muted)]">{t('translate.onDevice')}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {options?.map(o => (
              <li key={o.id} className="flex flex-col rounded-xl border border-[var(--color-border)] p-3">
                <p className="font-medium">{t(`translate.engine.${o.id}`)}</p>
                <p className="text-xs text-[var(--color-muted)]">{t(`translate.engineHint.${o.id}`)}</p>
                <p className="mt-1 text-xs">{describe(o)}</p>
                <button
                  type="button"
                  disabled={!!running}
                  onClick={() => void handleTranslate(o.id)}
                  className="mt-2 self-start rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-[var(--color-primary-fg)] hover:opacity-90 disabled:opacity-50"
                >
                  {buttonLabel(o)}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted)]">
          <GoogleTranslateAnchor text={text} from={from} />
          <button type="button" onClick={onClose} className="underline hover:no-underline">
            {t('translate.skip')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
