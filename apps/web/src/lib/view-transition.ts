import { ROUTE_TITLE_KEYS } from '@/hooks/useDocumentTitle'

/** Home → section pages → plate/VIN results. Drives the slide direction of a route transition. */
export function routeDepth(pathname: string): number {
  if (pathname === '/') return 0
  return pathname in ROUTE_TITLE_KEYS ? 1 : 2
}

/** Sets `<html data-vt-dir>`; global.css flips the slide shift for `back`. Call inside the DOM update,
 *  i.e. a layout effect — the transition's animations only start after it. */
export function setTransitionDirection(from: string, to: string): void {
  document.documentElement.dataset.vtDir = routeDepth(to) < routeDepth(from) ? 'back' : 'forward'
}

/** Runs a synchronous DOM-affecting `update` (flush React inside it) as a view transition, so text that
 *  changes length morphs the layout instead of jumping. `<html data-vt-dir="lang">` swaps the route
 *  slide for a plain cross-fade (see global.css). Runs `update` directly without the API / with reduced motion. */
export function runLangTransition(update: () => void): void {
  const root = document.documentElement
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }
  const previousDir = root.dataset.vtDir
  root.dataset.vtDir = 'lang'
  const restore = (): void => {
    if (previousDir) root.dataset.vtDir = previousDir
    else delete root.dataset.vtDir
  }
  document.startViewTransition(update).finished.then(restore, restore)
}

let marked: HTMLElement | null = null

/** Names `el` as the old side of a shared-element transition for the click that is about to navigate.
 *  View-transition names must be unique per page, so only one source is ever marked, and the mark
 *  is dropped if the navigation never happens (modified click, new tab). */
export function markTransitionSource(el: HTMLElement | null, name: string): void {
  marked?.style.removeProperty('view-transition-name')
  marked = el
  if (!el) return
  el.style.setProperty('view-transition-name', name)
  setTimeout(() => {
    if (marked !== el) return
    el.style.removeProperty('view-transition-name')
    marked = null
  }, 1000)
}
