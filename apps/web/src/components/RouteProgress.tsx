import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { useLocation } from 'react-router'

import { useRoutePending } from '@/lib/route-pending'

const TICK_MS = 150
/** Quiet ticks in a row (nothing loading) before the bar finishes: skips flicker between a chunk and its first query. */
const QUIET_TICKS = 2
const START_PERCENT = 12
const TRICKLE_CAP = 90
const HIDE_MS = 350

/**
 * A thin progress line on the bottom edge of the header while a route change loads (its code chunk and the queries it
 * starts). Absolutely positioned over the header border, so it never shifts the layout; idle it is invisible.
 * Not a real percentage: it creeps towards 90% and jumps to 100% when nothing is loading any more.
 */
export default function RouteProgress(): ReactNode {
  const { pathname } = useLocation()
  const routePending = useRoutePending()
  const fetching = useIsFetching() > 0
  const busy = routePending || fetching
  const busyRef = useRef(busy)
  const [seenPath, setSeenPath] = useState(pathname)
  const [percent, setPercent] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  // A new path starts the bar (state adjusted while rendering, not in an effect).
  if (pathname !== seenPath) {
    setSeenPath(pathname)
    setPercent(START_PERCENT)
    setVisible(true)
  }

  useEffect(() => {
    if (!visible) return
    let quiet = 0
    let hide: ReturnType<typeof setTimeout> | undefined
    const timer = setInterval(() => {
      if (busyRef.current) {
        quiet = 0
        setPercent(p => Math.min(TRICKLE_CAP, p + (TRICKLE_CAP - p) * 0.15))
        return
      }
      quiet += 1
      if (quiet < QUIET_TICKS) return
      clearInterval(timer)
      setPercent(100)
      hide = setTimeout(() => {
        setVisible(false)
        setPercent(0)
      }, HIDE_MS)
    }, TICK_MS)
    return () => {
      clearInterval(timer)
      clearTimeout(hide)
    }
  }, [visible, seenPath])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-0.5 overflow-hidden">
      <div
        className="route-progress h-full w-full origin-left transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${percent / 100})`, opacity: visible ? 1 : 0 }}
      />
    </div>
  )
}
