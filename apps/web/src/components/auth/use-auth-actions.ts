import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SessionResponse } from '@carplates/shared'

import { deleteAccount, signInWithGoogle, signOut } from '@/lib/api'
import { disableGoogleAutoSelect } from '@/lib/google-identity'
import { adminUsersQuery, featuresQuery, sessionQuery } from '@/lib/queries'

type UseAuthActions = {
  signIn: ReturnType<typeof useMutation<SessionResponse, Error, string>>
  signOut: ReturnType<typeof useMutation<SessionResponse, Error, void>>
  deleteAccount: ReturnType<typeof useMutation<SessionResponse, Error, void>>
}

export function useAuthActions(): UseAuthActions {
  const queryClient = useQueryClient()

  const setSession = (data: SessionResponse): void => {
    queryClient.setQueryData(sessionQuery().queryKey, data)
    // Anything keyed to the previous identity (feature toggles, admin lists) must not leak across accounts.
    queryClient.removeQueries({ queryKey: featuresQuery().queryKey })
    queryClient.removeQueries({ queryKey: adminUsersQuery().queryKey })
  }

  const signIn = useMutation({ mutationFn: signInWithGoogle, onSuccess: setSession })

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: data => {
      disableGoogleAutoSelect()
      setSession(data)
    }
  })

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: data => {
      disableGoogleAutoSelect()
      setSession(data)
    }
  })

  return { signIn, signOut: signOutMutation, deleteAccount: deleteAccountMutation }
}
