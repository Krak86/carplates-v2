import type { ReactNode } from 'react'
import type { VinDecodeResponse } from '@carplates/shared'

type Props = {
  results: VinDecodeResponse['results']
}

export default function VinDecodeFields({ results }: Props): ReactNode {
  return (
    <dl className="divide-y divide-[var(--color-border)]">
      {results.map(r => (
        <div key={r.variable} className="flex justify-between gap-4 py-1 text-sm">
          <dt className="text-[var(--color-muted)]">{r.variable}</dt>
          <dd className="text-right font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
