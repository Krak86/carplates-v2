import type { ReactNode } from 'react'

type Props = {
  label: string
  onClick: () => void
  /** Warm the target's chunk on hover / focus. */
  onWarm?: () => void
}

/** The round "open the section below" chevron beside a header chip (size class, imported, …). */
export default function ChipChevronButton({ label, onClick, onWarm }: Props): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerEnter={onWarm}
      onFocus={onWarm}
      className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--color-surface)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
    >
      <svg viewBox="0 0 12 12" aria-hidden className="size-3">
        <path
          d="M2 4.5 6 8.5 10 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
