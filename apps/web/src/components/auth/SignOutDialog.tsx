import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type Props = {
  pending: boolean
  failed: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Sign-out confirmation (a mis-click guard). "Stay signed in" is focused by default; Escape / backdrop cancel (never while pending). */
export default function SignOutDialog({ pending, failed, onConfirm, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const stayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    stayRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [pending, onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!pending) onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="sign-out-title"
        aria-describedby="sign-out-body"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
      >
        <h2 id="sign-out-title" className="mb-3 text-lg font-semibold">
          <span aria-hidden>🚪</span> {t('auth.logout.title')}
        </h2>

        <div id="sign-out-body" className="space-y-3 text-sm">
          <div>
            <p className="mb-1 font-medium">{t('auth.logout.stayTitle')}</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
              <li>{t('auth.logout.stayFavorites')}</li>
              <li>{t('auth.logout.staySync')}</li>
              <li>{t('auth.logout.stayNoLogin')}</li>
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium">{t('auth.logout.leaveTitle')}</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
              <li>{t('auth.logout.leaveSync')}</li>
              <li>{t('auth.logout.leaveSafe')}</li>
            </ul>
          </div>
        </div>

        {failed && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t('auth.logout.error')}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            {t('auth.signOut')}
          </button>
          <button
            ref={stayRef}
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t('auth.logout.cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
