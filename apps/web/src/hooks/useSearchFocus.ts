import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { isShareAlias, type ShareAlias } from '@carplates/shared'

/** How long the pulse runs (3 × 1.1 s), plus a margin, before the router state is dropped. */
const FOCUS_MS = 3600

/**
 * The search entry a `/go/<alias>` link points at, from the router state `GoRoute` sets. `armed` is false until the
 * buttons are on screen; then the state is cleared after the pulse, so a reload does not replay it.
 */
export function useSearchFocus(armed: boolean): ShareAlias | null {
  const { state, pathname, search } = useLocation()
  const navigate = useNavigate()
  const raw = (state as { searchFocus?: unknown } | null)?.searchFocus
  const focus = isShareAlias(raw) ? raw : null

  useEffect(() => {
    if (!focus || !armed) return
    const timer = setTimeout(() => navigate({ pathname, search }, { replace: true, state: null }), FOCUS_MS)
    return (): void => clearTimeout(timer)
  }, [focus, armed, navigate, pathname, search])

  return focus
}
