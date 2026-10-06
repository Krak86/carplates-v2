import { useQuery } from '@tanstack/react-query'
import type { SessionUser } from '@carplates/shared'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { sessionQuery } from '@/lib/queries'

type Session = {
  /** The signed-in user; null while anonymous, still loading, or offline. */
  user: SessionUser | null
  isAdmin: boolean
  isPending: boolean
}

/**
 * Auth is server state (TanStack Query), not Zustand, and online-only: offline the probe is skipped and the user
 * counts as anonymous — even if a session was already cached — so every account surface (login button, sidebar
 * links, /features, /admin, paid sections) disappears instead of calling an API that can't answer.
 */
export function useSession(): Session {
  const online = useOnlineStatus()
  const session = useQuery({ ...sessionQuery(), enabled: online })
  const user = online ? (session.data?.user ?? null) : null
  return { user, isAdmin: user?.role === 'admin', isPending: online && session.isPending }
}
