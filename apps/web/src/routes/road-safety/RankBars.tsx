import type { ReactNode } from 'react'

import ExpandableList from '@/components/ExpandableList'
import { barPercent } from '@/routes/road-safety/helpers'

export type RankRow = {
  key: string
  label: string
  value: number
  /** Formatted value shown at the right. */
  valueText: string
  /** Muted text after the value. */
  detail?: string
}

type Props = {
  rows: RankRow[]
  ariaLabel: string
  /** Collapse to the first few rows with a "show more" button. */
  collapsible?: boolean
  /** Show a long detail on its own wrapping line under the bar instead of after the value. */
  wrapDetail?: boolean
}

/** Ranked horizontal bars: label, bar scaled to the largest value, value and a muted detail. */
export default function RankBars({ rows, ariaLabel, collapsible = false, wrapDetail = false }: Props): ReactNode {
  const max = Math.max(0, ...rows.map(r => r.value))

  const items = rows.map((row, i) => (
    <li
      key={row.key}
      className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-x-2 gap-y-0.5 py-1 text-sm sm:grid-cols-[1.5rem_11rem_1fr_auto] sm:py-0.5"
    >
      <span className="text-xs text-[var(--color-muted)] tabular-nums">{i + 1}</span>

      <span className="min-w-0 break-words sm:truncate" title={row.label}>
        {row.label}
      </span>

      <span className="col-span-2 col-start-2 row-start-2 h-3 overflow-hidden rounded-full bg-[var(--color-border)]/40 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
        <span
          className="block h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${barPercent(row.value, max)}%` }}
        />
      </span>

      <span className="text-right whitespace-nowrap tabular-nums">
        {row.valueText}
        {row.detail && !wrapDetail && <span className="ml-1 text-xs text-[var(--color-muted)]">{row.detail}</span>}
      </span>

      {row.detail && wrapDetail && (
        <span className="col-start-2 col-end-4 text-xs wrap-break-word text-[var(--color-muted)] sm:col-end-5">
          {row.detail}
        </span>
      )}
    </li>
  ))

  if (collapsible) return <ExpandableList items={items} className="space-y-0.5" />
  return (
    <ul className="space-y-0.5" aria-label={ariaLabel}>
      {items}
    </ul>
  )
}
