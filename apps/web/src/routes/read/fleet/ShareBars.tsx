import type { ReactNode } from 'react'

import { formatCount } from '@/routes/read/helpers'

type Bar = { id: string; label: ReactNode; n: number; color?: string }

type Props = {
  bars: readonly Bar[]
  total: number
  language: string
}

/** Horizontal share bars (label, bar, percent · count), the same look as the body-types share list. */
export default function ShareBars({ bars, total, language }: Props): ReactNode {
  const biggest = bars[0]?.n ?? 1

  return (
    <ul className="space-y-1.5">
      {bars.map(bar => (
        <li key={bar.id} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 truncate">{bar.label}</span>

          <span aria-hidden className="h-3 rounded-full bg-(--color-bg)">
            <span
              className="block h-3 rounded-full bg-primary"
              style={{
                width: `${Math.max(2, (bar.n / biggest) * 100)}%`,
                ...(bar.color ? { backgroundColor: bar.color } : {})
              }}
            />
          </span>

          <span className="tabular-nums">
            {Math.round((bar.n / total) * 100)}% · {formatCount(bar.n, language)}
          </span>
        </li>
      ))}
    </ul>
  )
}
