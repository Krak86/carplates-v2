import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/components/auth/use-session'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

// Google's script is only fetched once this popover opens (see lib/google-identity.ts).
const GoogleSignInButton = lazy(() => import('@/components/auth/GoogleSignInButton'))
const AccountMenu = lazy(() => import('@/components/auth/AccountMenu'))

/** Header trigger right of the layers button: a person icon when anonymous, the avatar / initial once signed in. Hidden offline. */
export default function LoginButton(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // The delete-account dialog is portaled to <body>: its clicks / Escape are "outside" the menu but must not close it.
    const inDialog = (target: EventTarget | null): boolean =>
      target instanceof Element && !!target.closest('[role="alertdialog"]')
    const handlePointerDown = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node) && !inDialog(e.target)) setOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.querySelector('[role="alertdialog"]')) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!online) return null

  const label = user ? t('auth.menu') : t('auth.signIn')

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        title={user?.email ?? label}
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow hover:bg-[var(--color-surface)]"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : user ? (
          <span className="font-semibold">{(user.name ?? user.email).charAt(0).toUpperCase()}</span>
        ) : (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 pt-2">
          <Suspense fallback={null}>
            {user ? (
              <AccountMenu user={user} onNavigate={() => setOpen(false)} />
            ) : (
              <div className="w-max max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg">
                <GoogleSignInButton />
              </div>
            )}
          </Suspense>
        </div>
      )}
    </div>
  )
}
