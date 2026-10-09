import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import Skeleton from '@/components/ui/Skeleton'
import type { ShareSection } from '@/lib/share-section'

type Props = {
  /** Share targets (`?section=…`) this section answers to — a link to one mounts it immediately, wherever it is. */
  sections?: readonly ShareSection[]
  /** Pass `<LazyThing />` (a `React.lazy` component): its chunk and its queries start only when this mounts. */
  children: ReactNode
  /** Replaces the default collapsed-header placeholder (before mount and while the chunk loads) — size it like the real section. */
  fallback?: ReactNode
}

// Pre-load a screenful early so the section is ready by the time it scrolls in.
const ROOT_MARGIN = '600px 0px'

// A collapsed section header (`mt-3 border-t pt-3` + `min-h-10` row): reserving it keeps the page from jumping on mount.
function SectionPlaceholder(): ReactNode {
  return (
    <div aria-hidden className="mt-3 border-t border-[var(--color-border)] pt-3">
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

/**
 * Mounts its children only once they're near the viewport (or a shared link targets them), behind a fixed-height
 * placeholder. Latched: once mounted it stays mounted. Sections in the shared-link path need no extra scroll logic —
 * each already scrolls itself into view when it mounts.
 */
export default function LazySection({ sections = [], children, fallback }: Props): ReactNode {
  const placeholder = fallback ?? <SectionPlaceholder />
  const [searchParams] = useSearchParams()
  const target = searchParams.get('section')
  const isShared = sections.some(s => s === target)
  const [visible, setVisible] = useState(false)
  const [node, setNode] = useState<HTMLDivElement | null>(null)

  if (isShared && !visible) setVisible(true)

  useEffect(() => {
    if (visible || !node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setVisible(true)
      },
      { rootMargin: ROOT_MARGIN }
    )
    observer.observe(node)
    return (): void => observer.disconnect()
  }, [visible, node])

  if (visible) return <Suspense fallback={placeholder}>{children}</Suspense>

  return <div ref={setNode}>{placeholder}</div>
}
