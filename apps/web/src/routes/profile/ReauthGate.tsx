import { useState } from 'react'
import type { ReactNode } from 'react'

import { isReauthRequired } from '@/lib/api'
import ReauthDialog from '@/routes/profile/ReauthDialog'
import { ReauthContext } from '@/routes/profile/reauth-context'
import type { RunSudo } from '@/routes/profile/reauth-context'

type Props = { children: ReactNode }

/** Provides `useRunSudo()` to the profile sections and renders the re-authentication dialog when one is needed. */
export default function ReauthGate({ children }: Props): ReactNode {
  const [retry, setRetry] = useState<(() => void) | null>(null)

  const runSudo: RunSudo = (mutation, variables) => {
    const attempt = (): void =>
      mutation.mutate(variables, {
        onError: error => {
          if (isReauthRequired(error)) setRetry(() => attempt)
        }
      })
    attempt()
  }

  const handleDone = (): void => {
    const again = retry
    setRetry(null)
    again?.()
  }

  const handleCancel = (): void => setRetry(null)

  return (
    <ReauthContext.Provider value={runSudo}>
      {children}
      {retry && <ReauthDialog onDone={handleDone} onCancel={handleCancel} />}
    </ReauthContext.Provider>
  )
}
