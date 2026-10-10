import type { ReactNode } from 'react'

type Props = {
  /** Number of items in the section (or a preformatted "a/b" pair); nothing is shown while unknown or zero. */
  count: number | string | undefined
}

/** The muted "(n)" after a section title (Recalls, Electric, News…). */
export default function SectionCount({ count }: Props): ReactNode {
  if (!count) return null
  return <span className="text-sm font-normal text-muted">({count})</span>
}
