import type { ReactNode } from 'react'

export type BarListItem = {
  key: string
  label: string
  /** Bar length, relative to the biggest value in the list. */
  value: number
  /** The text at the end of the row. */
  display: ReactNode
  /** Bar colour; defaults to `--age-0`. */
  color?: string
}

type Props = {
  items: readonly BarListItem[]
  /** Width class of the label column. */
  labelClassName?: string
  /** Width class of the value column. */
  valueClassName?: string
  /** Height class of the bar row. */
  barClassName?: string
}

/** Horizontal bars, one row per item, scaled to the biggest value. Shared by the /stats age chart and the /fuel adoption rows. */
export default function BarList({
  items,
  labelClassName = 'w-24 sm:w-28',
  valueClassName = 'w-20',
  barClassName = 'h-7'
}: Props): ReactNode {
  const biggest = items.reduce((m, i) => Math.max(m, i.value), 0)

  return (
    <ol className="space-y-2 text-sm">
      {items.map(item => (
        <li key={item.key} className="flex items-center gap-3">
          <span className={`${labelClassName} shrink-0 tabular-nums`}>{item.label}</span>

          <div className={`${barClassName} min-w-0 flex-1`} aria-hidden>
            <div
              className="h-full rounded-md transition-[width] duration-500"
              style={{
                width: `${biggest > 0 ? (item.value / biggest) * 100 : 0}%`,
                backgroundColor: item.color ?? 'var(--age-0)'
              }}
            />
          </div>

          <span className={`${valueClassName} shrink-0 text-right font-medium tabular-nums`}>{item.display}</span>
        </li>
      ))}
    </ol>
  )
}
