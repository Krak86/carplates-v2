import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LinkableProvider } from '@carplates/shared'

import {
  linkProvider,
  reauthWithGoogle,
  reauthWithTelegram,
  revokeOtherSessions,
  revokeSession,
  startReauthEmail,
  startSetEmail,
  unlinkProvider,
  verifyReauthEmail,
  verifySetEmail
} from '@/lib/api'
import { sessionQuery, sessionsListQuery, signInMethodsQuery } from '@/lib/queries'

type LinkInput = { provider: LinkableProvider; body: unknown }

/** Mutations behind /profile. Each refreshes the queries it changes; none is persisted offline. */
export function useProfileActions() {
  const queryClient = useQueryClient()

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: signInMethodsQuery().queryKey })
    void queryClient.invalidateQueries({ queryKey: sessionsListQuery().queryKey })
  }

  return {
    setEmailStart: useMutation({ mutationFn: startSetEmail }),
    setEmailVerify: useMutation({
      mutationFn: verifySetEmail,
      onSuccess: data => {
        queryClient.setQueryData(sessionQuery().queryKey, data)
        refresh()
      }
    }),
    link: useMutation({
      mutationFn: ({ provider, body }: LinkInput) => linkProvider(provider, body),
      onSuccess: refresh
    }),
    unlink: useMutation({ mutationFn: unlinkProvider, onSuccess: refresh }),
    revoke: useMutation({ mutationFn: revokeSession, onSuccess: refresh }),
    revokeOthers: useMutation({ mutationFn: revokeOtherSessions, onSuccess: refresh }),
    reauthEmailStart: useMutation({ mutationFn: startReauthEmail }),
    reauthEmailVerify: useMutation({ mutationFn: verifyReauthEmail }),
    reauthGoogle: useMutation({ mutationFn: reauthWithGoogle }),
    reauthTelegram: useMutation({ mutationFn: reauthWithTelegram })
  }
}
