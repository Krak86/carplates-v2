import type { ReactNode } from 'react'

import { sharePercent } from './helpers'

type Props = {
  title: string
  rows: readonly (readonly [string, number])[]
  total: number
  formatLabel?: (label: string) => string
  formatCount: (n: number) => string
}

/** One ranked list of the "In Ukraine" section: label, count, share, and a bar. A table, so crawlers read it as data. */
export default function CatalogBarList({ title, rows, total, formatLabel, formatCount }: Props): ReactNode {
  if (rows.length === 0) return null

  return (
    <table className="h-fit w-full self-start rounded-lg border border-[var(--color-border)] text-base">
      <caption className="px-3 pt-2 pb-1 text-left text-sm font-semibold tracking-wide text-[var(--color-muted)] uppercase">
        {title}
      </caption>
      <tbody>
        {rows.map(([label, n]) => {
          const pct = sharePercent(n, total)
          return (
            <tr key={label} className="align-middle odd:bg-[var(--color-primary)]/5">
              <th scope="row" className="py-1 pr-2 pl-3 text-left font-normal">
                {formatLabel ? formatLabel(label) : label}
              </th>
              <td className="py-1 pr-2 text-right tabular-nums">{formatCount(n)}</td>
              <td className="w-2/5 py-1 pr-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 min-w-0 flex-1 rounded bg-[var(--color-border)]/50">
                    <span
                      aria-hidden
                      className="block h-2 rounded bg-[var(--color-primary)]"
                      style={{ width: `${Math.min(Math.max(pct, 1), 100)}%` }}
                    />
                  </span>
                  <span className="w-9 text-right text-[var(--color-muted)] tabular-nums">{pct}%</span>
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
