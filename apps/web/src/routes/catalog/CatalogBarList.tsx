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
    <table className="w-full text-base">
      <caption className="mb-1 text-left font-semibold">{title}</caption>
      <tbody>
        {rows.map(([label, n]) => {
          const pct = sharePercent(n, total)
          return (
            <tr key={label} className="align-middle">
              <th scope="row" className="w-1/2 py-0.5 pr-2 text-left font-normal">
                {formatLabel ? formatLabel(label) : label}
              </th>
              <td className="py-0.5 pr-2 text-right tabular-nums">{formatCount(n)}</td>
              <td className="w-1/4 py-0.5">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 rounded bg-[var(--color-primary)]"
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                  <span className="text-[var(--color-muted)] tabular-nums">{pct}%</span>
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
