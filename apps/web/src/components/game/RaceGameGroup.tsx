import type { ReactNode } from 'react'

type Props = {
  label: string
  children: ReactNode
}

export default function RaceGameGroup({ label, children }: Props): ReactNode {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}
