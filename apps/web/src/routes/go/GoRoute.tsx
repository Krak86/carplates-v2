import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { isShareAlias } from '@carplates/shared'

import { capture } from '@/lib/telemetry'

/**
 * `/go/<alias>`: the API serves this URL with its own link preview; the app then sends the visitor to the home page
 * (query kept, so `lang` and campaign params survive) and the matching search entry pulses (`useSearchFocus`).
 */
export default function GoRoute(): ReactNode {
  const { alias } = useParams()
  const { search } = useLocation()
  const valid = isShareAlias(alias)

  useEffect(() => {
    if (valid) capture('share_link_opened', { alias, src: new URLSearchParams(search).get('src') })
  }, [valid, alias, search])

  return <Navigate to={{ pathname: '/', search }} replace state={valid ? { searchFocus: alias } : null} />
}
