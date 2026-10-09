import { useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export const SEGMENT_COLORS = {
  sky: 'bg-sky-500/20 text-sky-700 ring-sky-500/50 dark:text-sky-300',
  violet: 'bg-violet-500/20 text-violet-700 ring-violet-500/50 dark:text-violet-300',
  emerald: 'bg-emerald-500/20 text-emerald-700 ring-emerald-500/50 dark:text-emerald-300',
  amber: 'bg-amber-500/20 text-amber-700 ring-amber-500/50 dark:text-amber-300',
  rose: 'bg-rose-500/20 text-rose-700 ring-rose-500/50 dark:text-rose-300',
  slate: 'bg-slate-500/20 text-slate-700 ring-slate-500/50 dark:text-slate-300'
} as const

export type SegmentColor = keyof typeof SEGMENT_COLORS

export type ExplainedSegment = {
  id: string
  text: string
  color: SegmentColor
  title: string
  positions: string
  desc: string
}

type Props = {
  segments: ExplainedSegment[]
  hint: string
  label: string
  /** Put the hint on the chips' row, right-aligned, instead of above them. */
  hintInline?: boolean
}

/**
 * Colour-coded chips with a "what does this part mean" panel underneath — shared by the VIN and plate views.
 * Hover, focus or tap a chip to read about it; the first segment is selected initially.
 */
export default function SegmentExplainer({ segments, hint, label, hintInline }: Props): ReactNode {
  const [selected, setSelected] = useState(segments[0]?.id)
  const current = segments.find(s => s.id === selected) ?? segments[0]
  if (!current) return null

  return (
    <div className="mb-4">
      {!hintInline && <div className="mb-1 text-sm text-[var(--color-muted)]">{hint}</div>}

      <div className={cn(hintInline && 'flex flex-col gap-y-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6')}>
        <div role="group" aria-label={label} className="flex flex-wrap gap-1 font-mono text-lg sm:text-xl">
          {segments.map(s => (
            <button
              key={s.id}
              type="button"
              aria-pressed={current.id === s.id}
              onMouseEnter={() => setSelected(s.id)}
              onFocus={() => setSelected(s.id)}
              onClick={() => setSelected(s.id)}
              className={cn(
                'rounded-md px-1.5 py-0.5 font-semibold tracking-wider ring-0 transition-[box-shadow,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
                SEGMENT_COLORS[s.color],
                current.id === s.id
                  ? '-translate-y-0.5 scale-105 ring-2'
                  : 'opacity-70 hover:opacity-100 active:scale-95'
              )}
            >
              {s.text}
            </button>
          ))}
        </div>

        {hintInline && (
          <div className="order-first text-left text-sm text-[var(--color-muted)] sm:order-none">{hint}</div>
        )}
      </div>

      <div aria-live="polite" className="mt-2 rounded-md bg-[var(--color-border)]/30 px-3 py-2 text-sm">
        <div key={current.id} className="animate-fade-in">
          <span className="font-semibold">{current.title}</span>
          <span className="text-[var(--color-muted)]"> · {current.positions}</span>
          <p className="mt-0.5">{current.desc}</p>
        </div>
      </div>
    </div>
  )
}
