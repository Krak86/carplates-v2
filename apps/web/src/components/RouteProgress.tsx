import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { useLocation } from 'react-router'

import { useRoutePending } from '@/lib/route-pending'

const TICK_MS = 150
/** Quiet ticks in a row (nothing loading) before the bar finishes: skips flicker between a chunk and its first query. */
const QUIET_TICKS = 2
/** A click that never navigates (prevented, blocked) must not keep the bar busy forever. */
const MAX_WAIT_TICKS = 100
const START_PERCENT = 12
const TRICKLE_CAP = 90
const HIDE_MS = 350

/** Same-origin path of a plain left click on an in-app link that leads to another path, else null. */
function clickTargetPath(e: MouseEvent, currentPath: string): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const link = e.target instanceof Element ? e.target.closest('a[href]') : null
  if (!(link instanceof HTMLAnchorElement)) return null
  if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return null
  const url = new URL(link.href, window.location.href)
  if (url.origin !== window.location.origin || url.pathname === currentPath) return null
  return url.pathname
}

/**
 * A thin progress line on the bottom edge of the header while a route change loads. It starts on the click (the router
 * only commits the new path once the route chunk is in), and runs until the path has changed and the chunk and the
 * queries it starts are done. Absolutely positioned over the header border, so it never shifts the layout; idle it is
 * invisible. Not a real percentage: it creeps towards 90% and jumps to 100% when nothing is loading any more.
 */
export default function RouteProgress(): ReactNode {
  const { pathname } = useLocation()
  const routePending = useRoutePending()
  const fetching = useIsFetching() > 0
  const [target, setTarget] = useState<string | null>(null)
  const [seenPath, setSeenPath] = useState(pathname)
  const [run, setRun] = useState(0)
  const [percent, setPercent] = useState(0)
  const [visible, setVisible] = useState(false)
  const busy = routePending || fetching || (target !== null && target !== pathname)
  const busyRef = useRef(busy)
  const pathRef = useRef(pathname)

  useEffect(() => {
    busyRef.current = busy
    pathRef.current = pathname
  }, [busy, pathname])

  const start = (to: string | null): void => {
    setTarget(to)
    setPercent(START_PERCENT)
    setVisible(true)
    setRun(n => n + 1)
  }

  // Navigations that did not come from a link click (back / forward, `navigate()`) start on the path change.
  if (pathname !== seenPath) {
    setSeenPath(pathname)
    if (!visible) start(null)
  }

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      const to = clickTargetPath(e, pathRef.current)
      if (to) start(to)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
    // `start` only calls state setters
  }, [])

  useEffect(() => {
    if (!visible) return
    let quiet = 0
    let ticks = 0
    let hide: ReturnType<typeof setTimeout> | undefined
    const timer = setInterval(() => {
      ticks += 1
      if (busyRef.current && ticks < MAX_WAIT_TICKS) {
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
  }, [visible, run])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-0.5 overflow-hidden">
      <div
        className="route-progress h-full w-full origin-left transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${percent / 100})`, opacity: visible ? 1 : 0 }}
      />
    </div>
  )
}
