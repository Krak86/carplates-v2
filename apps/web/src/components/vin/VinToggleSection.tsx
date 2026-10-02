import { useState } from 'react'
import type { ReactNode, Ref } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  title: ReactNode
  /** Emoji in the toggle pill. */
  icon: string
  /** Pill text while collapsed / expanded. */
  showLabel: string
  hideLabel: string
  defaultOpen?: boolean
  /** Fires with the new state on every toggle — for callers that fetch lazily on first open. */
  onOpenChange?: (open: boolean) => void
  /** Extra header controls (e.g. a share button), rendered only while expanded. */
  actions?: ReactNode
  /** Draws the divider + padding of a top-level section; off for nested groups. */
  bordered?: boolean
  ref?: Ref<HTMLDivElement>
  children: ReactNode
}

/** Collapsible block with the same header + pill toggle + animated height the plate view uses. */
export default function VinToggleSection({
  title,
  icon,
  showLabel,
  hideLabel,
  defaultOpen = false,
  onOpenChange,
  actions,
  bordered = true,
  ref,
  children
}: Props): ReactNode {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div ref={ref} className={cn(bordered && 'border-t border-[var(--color-border)] py-2')}>
      <div className="flex items-center justify-between gap-2 text-base">
        <span className="min-w-0 font-semibold">{title}</span>

        <div className="flex shrink-0 items-center gap-1.5">
          {open && actions}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open)
              onOpenChange?.(!open)
            }}
            className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-[var(--color-primary)]"
          >
            <span aria-hidden className="no-underline">
              {icon}
            </span>
            <span className="underline group-hover:no-underline">{open ? hideLabel : showLabel}</span>
            <span
              aria-hidden
              className={cn('inline-block no-underline transition-transform duration-200', open && 'rotate-180')}
            >
              ▾
            </span>
          </button>
        </div>
      </div>

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </div>
  )
}
