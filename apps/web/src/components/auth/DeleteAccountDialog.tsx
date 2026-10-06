import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type Props = {
  /** The account's email, repeated back so it is unmistakable which account goes. */
  email: string
  pending: boolean
  failed: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Permanent-deletion confirmation. Cancel is focused by default; Escape / backdrop cancel (never while deleting). */
export default function DeleteAccountDialog({ email, pending, failed, onConfirm, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
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
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-body"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
      >
        <h2 id="delete-account-title" className="mb-1 text-lg font-semibold text-red-600">
          <span aria-hidden>⚠️</span> {t('account.delete.title')}
        </h2>
        <p className="mb-3 truncate text-sm text-[var(--color-muted)]">{email}</p>

        <div id="delete-account-body" className="space-y-2 text-sm">
          <p className="font-medium">{t('account.delete.permanent')}</p>
          <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
            <li>{t('account.delete.itemProfile')}</li>
            <li>{t('account.delete.itemFeatures')}</li>
            <li>{t('account.delete.itemSessions')}</li>
          </ul>
          <p className="text-[var(--color-muted)]">{t('account.delete.localKept')}</p>
        </div>

        {failed && <p className="mt-3 text-sm text-red-600">{t('account.delete.error')}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            {t('account.delete.cancel')}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? t('account.delete.deleting') : t('account.delete.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
