import { createContext, useContext } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'

/**
 * Runs a sensitive mutation (change email, link / unlink, delete). When the API answers 403 `REAUTH_REQUIRED` the
 * session's last sign-in is too old: the re-authentication dialog opens and, once passed, the same call is retried.
 */
export type RunSudo = <V, R>(mutation: UseMutationResult<R, Error, V>, variables: V) => void

export const ReauthContext = createContext<RunSudo | null>(null)

export function useRunSudo(): RunSudo {
  const runSudo = useContext(ReauthContext)
  if (!runSudo) throw new Error('useRunSudo must be used inside <ReauthGate>')
  return runSudo
}
