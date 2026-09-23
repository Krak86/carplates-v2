import type { ReactNode } from 'react'
import type { VinDecodeResponse } from '@carplates/shared'

type Props = {
  results: VinDecodeResponse['results']
}

export default function VinDecodeFields({ results }: Props): ReactNode {
  return (
    <dl className="divide-y divide-[var(--color-border)]">
      {results.map(r => (
        <div
          key={r.variable}
          className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40"
        >
          <dt className="text-[var(--color-muted)]">{r.variable}</dt>
          <dd className="text-right font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
