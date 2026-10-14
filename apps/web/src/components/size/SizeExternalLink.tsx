import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
}

/** A source link in the app's usual style: opens a new tab and carries the ↗ marker. */
export default function SizeExternalLink({ href, children }: Props): ReactNode {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-[var(--color-primary)] underline hover:no-underline"
    >
      {children} <span aria-hidden>↗</span>
    </a>
  )
}
