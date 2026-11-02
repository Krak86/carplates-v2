import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import SharePhotoDialog from '@/components/SharePhotoDialog'
import { takePendingShare } from '@/lib/pending-share'

type Props = {
  onDone: () => void
}

/** After a sign-in that reloaded the page: reopens the share dialog with the parked photo, or asks to pick it again. */
export default function PendingShareResume({ onDone }: Props): ReactNode {
  const [taken, setTaken] = useState<{ file: File | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    void takePendingShare().then(result => {
      if (!cancelled) setTaken(result)
    })
    return (): void => {
      cancelled = true
    }
  }, [])

  if (!taken) return null
  return <SharePhotoDialog file={taken.file} onClose={onDone} />
}
