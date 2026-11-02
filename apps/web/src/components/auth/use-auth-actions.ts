import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  EmailLinkVerifyRequest,
  EmailStartRequest,
  EmailStartResponse,
  EmailVerifyRequest,
  SessionResponse,
  TelegramSignInRequest
} from '@carplates/shared'

import {
  deleteAccount,
  signInWithGoogle,
  signInWithTelegram,
  signOut,
  startEmailSignIn,
  verifyEmailCode,
  verifyEmailLink
} from '@/lib/api'
import { disableGoogleAutoSelect } from '@/lib/google-identity'
import { adminUsersQuery, featuresQuery, myPhotoSharesQuery, sessionQuery } from '@/lib/queries'
import { clearPendingShare } from '@/lib/pending-share'
import { clearShareTokens } from '@/lib/share-links'

type UseAuthActions = {
  signIn: ReturnType<typeof useMutation<SessionResponse, Error, string>>
  signInTelegram: ReturnType<typeof useMutation<SessionResponse, Error, TelegramSignInRequest>>
  emailStart: ReturnType<typeof useMutation<EmailStartResponse, Error, EmailStartRequest>>
  emailVerify: ReturnType<typeof useMutation<SessionResponse, Error, EmailVerifyRequest>>
  emailVerifyLink: ReturnType<typeof useMutation<SessionResponse, Error, EmailLinkVerifyRequest>>
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
    queryClient.removeQueries({ queryKey: myPhotoSharesQuery().queryKey })
  }

  const signIn = useMutation({ mutationFn: signInWithGoogle, onSuccess: setSession })

  const signInTelegram = useMutation({ mutationFn: signInWithTelegram, onSuccess: setSession })

  const emailStart = useMutation({ mutationFn: startEmailSignIn })
  const emailVerify = useMutation({ mutationFn: verifyEmailCode, onSuccess: setSession })
  const emailVerifyLink = useMutation({ mutationFn: verifyEmailLink, onSuccess: setSession })

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: data => {
      // A parked photo and this device's share links belong to the account that is leaving.
      void clearPendingShare()
      clearShareTokens()
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

  return {
    signIn,
    signInTelegram,
    emailStart,
    emailVerify,
    emailVerifyLink,
    signOut: signOutMutation,
    deleteAccount: deleteAccountMutation
  }
}
