import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { SessionUser } from '@carplates/shared'

import DeleteAccountDialog from '@/components/auth/DeleteAccountDialog'
import { useAuthActions } from '@/components/auth/use-auth-actions'

type Props = {
  user: SessionUser
  onNavigate: () => void
}

const linkClass = 'block rounded-lg px-3 py-2 text-sm hover:bg-[var(--color-surface)]'

export default function AccountMenu({ user, onNavigate }: Props): ReactNode {
  const { t } = useTranslation()
  const { signOut, deleteAccount } = useAuthActions()

  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div className="w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-lg">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{user.name ?? user.email}</span>
          {user.role === 'admin' && (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-[var(--color-primary)]">
              {t('auth.admin')}
            </span>
          )}
        </div>
        {user.name && <div className="truncate text-xs text-[var(--color-muted)]">{user.email}</div>}
      </div>

      <div className="my-1 border-t border-[var(--color-border)]" />

      <Link viewTransition to="/features" onClick={onNavigate} className={linkClass}>
        <span aria-hidden>💎</span> {t('auth.myFeatures')}
      </Link>
      <Link viewTransition to="/settings" onClick={onNavigate} className={linkClass}>
        <span aria-hidden>⚙️</span> {t('auth.mySettings')}
      </Link>
      {user.role === 'admin' && (
        <Link viewTransition to="/admin" onClick={onNavigate} className={linkClass}>
          <span aria-hidden>🛠️</span> {t('auth.adminPage')}
        </Link>
      )}

      <div className="my-1 border-t border-[var(--color-border)]" />

      <button
        type="button"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate(undefined, { onSuccess: onNavigate })}
        className={`${linkClass} w-full text-left`}
      >
        <span aria-hidden>🚪</span> {t('auth.signOut')}
      </button>
      <button
        type="button"
        disabled={deleteAccount.isPending}
        onClick={() => setConfirmingDelete(true)}
        className={`${linkClass} w-full text-left text-red-600`}
      >
        <span aria-hidden>🗑️</span> {t('auth.deleteAccount')}
      </button>

      {confirmingDelete && (
        <DeleteAccountDialog
          email={user.email}
          pending={deleteAccount.isPending}
          failed={deleteAccount.isError}
          onConfirm={() => deleteAccount.mutate(undefined, { onSuccess: onNavigate })}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
