import { scrollElementIntoView } from '@/lib/share-section'
import type { ShareSection } from '@/lib/share-section'

/** `LazySection` listens for this on `window` and mounts the sections it names (or every one for `'all'`). */
export const MOUNT_SECTIONS_EVENT = 'carplates:mount-sections'

const HEADER = '[data-section-header]'
const POLL_MS = 120
const POLL_TRIES = 40

/** Sections are lazy chunks: ask them to mount, then wait for the header row to exist. */
function requestMount(detail: readonly ShareSection[] | 'all'): void {
  window.dispatchEvent(new CustomEvent(MOUNT_SECTIONS_EVENT, { detail }))
}

function sectionHeader(id: ShareSection): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-section-ids~="${id}"] ${HEADER}`)
}

/** Mount a lazy section, open it if collapsed and scroll to it. Gives up quietly if it never appears (no data for the car). */
export function openCardSection(id: ShareSection): void {
  requestMount([id])
  let tries = 0
  const timer = window.setInterval(() => {
    const header = sectionHeader(id)
    if (!header && ++tries < POLL_TRIES) return
    window.clearInterval(timer)
    if (!header) return
    if (!header.hasAttribute('data-open')) header.click()
    scrollElementIntoView(header)
  }, POLL_MS)
}

// An open header carries `data-open`; clicking the row toggles it. A collapsed parent unmounts its nested sections,
// so skip any node that is gone by then.
export function collapseAllCardSections(): void {
  document.querySelectorAll<HTMLElement>(`${HEADER}[data-open]`).forEach(header => {
    if (header.isConnected) header.click()
  })
}
