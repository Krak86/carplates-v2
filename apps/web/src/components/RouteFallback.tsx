import { useEffect } from 'react'
import type { ReactNode } from 'react'

import Spinner from '@/components/ui/Spinner'
import { beginRoutePending } from '@/lib/route-pending'

/** The route `Suspense` fallback: viewport-tall (see App) and it tells the header progress bar a chunk is loading. */
export default function RouteFallback(): ReactNode {
  useEffect(() => beginRoutePending(), [])
  return (
    <div className="min-h-svh">
      <Spinner />
    </div>
  )
}
