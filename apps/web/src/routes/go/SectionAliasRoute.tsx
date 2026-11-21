import { ALARM_SECTIONS } from '@carplates/shared'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'

import { SHARE_SECTIONS } from '@/lib/share-section'
import { capture } from '@/lib/telemetry'

/**
 * `/s/<plate|vin>/<section>` or `/s/<losses|map>` (`/alarms`): the API serves this URL with the section's own link preview (some unfurlers merge
 * `?section=` links); the app then opens `/<target>?section=<section>`, keeping the rest of the query (`tab`, `lang`, `font`).
 */
export default function SectionAliasRoute(): ReactNode {
  const { target: given, section = '' } = useParams()
  const target = given ?? (ALARM_SECTIONS.some(id => id === section) ? 'alarms' : '')
  const { search } = useLocation()
  const known = (SHARE_SECTIONS as readonly string[]).includes(section)

  useEffect(() => {
    capture('share_link_opened', {
      alias: `section:${known ? section : 'unknown'}`,
      src: new URLSearchParams(search).get('src')
    })
  }, [known, section, search])

  const params = new URLSearchParams(search)
  if (known) params.set('section', section)
  const query = params.toString()

  return (
    <Navigate
      to={{ pathname: target ? `/${encodeURIComponent(target)}` : '/', search: query ? `?${query}` : '' }}
      replace
    />
  )
}
