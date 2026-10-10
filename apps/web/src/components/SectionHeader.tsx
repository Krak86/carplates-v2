import type { MouseEvent, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Props = {
  /** Emoji (or small icon node) at the start of the row. */
  icon: ReactNode
  title: ReactNode
  /** ❓ explainer next to the title — clicks on it don't toggle the section. */
  info?: ReactNode
  /** Extra controls (e.g. a share button), shown only while expanded — clicks on them don't toggle. */
  actions?: ReactNode
  open: boolean
  onToggle: () => void
  /** Pill text while collapsed / expanded. */
  showLabel: string
  hideLabel: string
  disabled?: boolean
}

const handleStop = (e: MouseEvent): void => e.stopPropagation()

/**
 * Header row shared by every collapsible section: icon + title (+ ❓) on the left, a pill label + chevron on the
 * right. The whole row toggles; the pill stays a real `<button>` for keyboard / screen-reader access (its click
 * bubbles to the row), and the nested ❓ / actions stop propagation so they keep working.
 */
export default function SectionHeader({
  icon,
  title,
  info,
  actions,
  open,
  onToggle,
  showLabel,
  hideLabel,
  disabled = false
}: Props): ReactNode {
  const handleRowClick = (): void => {
    if (!disabled) onToggle()
  }

  return (
    <div
      data-section-header
      data-open={open || undefined}
      onClick={handleRowClick}
      className={cn(
        'group -mx-3 -my-1 flex min-h-10 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg px-3 py-1 text-base transition-colors select-none',
        disabled ? 'cursor-wait' : 'cursor-pointer hover:bg-primary/10',
        open && 'bg-primary/10'
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 font-semibold">
        <span aria-hidden className="shrink-0">
          {icon}
        </span>
        {title}
        {info && (
          <span onClick={handleStop} className="flex cursor-default items-center">
            {info}
          </span>
        )}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {open && actions && (
          <span onClick={handleStop} className="flex cursor-default items-center">
            {actions}
          </span>
        )}
        <button
          type="button"
          aria-expanded={open}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-2.5 py-1 text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-50 max-sm:size-8 max-sm:justify-center max-sm:px-0"
        >
          <span className="underline group-hover:no-underline max-sm:sr-only">{open ? hideLabel : showLabel}</span>
          <span
            aria-hidden
            className={cn('inline-block no-underline transition-transform duration-200', open && 'rotate-180')}
          >
            ▾
          </span>
        </button>
      </div>
    </div>
  )
}
