import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { shareTokenSchema } from '@carplates/shared'
import type { ShareMetaResponse } from '@carplates/shared'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ApiError } from '@/lib/api'
import { sharedPhotoQuery } from '@/lib/queries'

type UseSharedPhoto = {
  /** The link's metadata once loaded; null when there is no `?p=` or it is dead. */
  meta: ShareMetaResponse | null
  /** 410: expired, deleted or never existed (the API does not say which). */
  expired: boolean
}

/**
 * `/<plate>?p=<token>`: loads the share's metadata and hands it to `onLoaded` once per token, which fills the photo
 * state without recognizing anything. A malformed token is treated as a dead link without asking the API.
 */
export function useSharedPhoto(
  rawToken: string | null,
  onLoaded: (token: string, meta: ShareMetaResponse) => void
): UseSharedPhoto {
  const online = useOnlineStatus()
  const parsed = shareTokenSchema.safeParse(rawToken)
  const token = parsed.success ? parsed.data : null
  const query = useQuery({ ...sharedPhotoQuery(token ?? ''), enabled: !!token && online })
  const openedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!token || !query.data || openedRef.current === token) return
    openedRef.current = token
    onLoaded(token, query.data)
  }, [token, query.data, onLoaded])

  const dead = (rawToken !== null && !parsed.success) || (query.error instanceof ApiError && query.error.status === 410)
  return { meta: token ? (query.data ?? null) : null, expired: dead }
}
