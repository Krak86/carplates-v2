import { useState } from 'react'
import type { ReactNode, Ref } from 'react'

import SectionHeader from '@/components/SectionHeader'
import { cn } from '@/lib/cn'

type Props = {
  title: ReactNode
  /** ❓ explainer beside the title. */
  info?: ReactNode
  /** Emoji at the start of the header row. */
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
  /** Small left inset so a sub-section reads as belonging to the opened parent section. */
  nested?: boolean
  ref?: Ref<HTMLDivElement>
  children: ReactNode
}

/** Collapsible block with the same header + pill toggle + animated height the plate view uses. */
export default function VinToggleSection({
  title,
  info,
  icon,
  showLabel,
  hideLabel,
  defaultOpen = false,
  onOpenChange,
  actions,
  bordered = true,
  nested = false,
  ref,
  children
}: Props): ReactNode {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div ref={ref} className={cn(bordered && 'mt-3 border-t border-[var(--color-border)] pt-3', nested && 'pl-3')}>
      <SectionHeader
        icon={icon}
        title={title}
        info={info}
        actions={actions}
        open={open}
        onToggle={() => {
          setOpen(!open)
          onOpenChange?.(!open)
        }}
        showLabel={showLabel}
        hideLabel={hideLabel}
      />

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        {/* Side padding + matching negative margin: keeps rings/shadows near the edge (VIN chips) from being clipped. */}
        <div className="-mx-1.5 overflow-hidden px-1.5">
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </div>
  )
}
