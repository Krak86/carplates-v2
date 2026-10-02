import type { ReactNode } from 'react'

type Props = {
  icon: string
  title: string
  children: ReactNode
}

export default function VinSection({ icon, title, children }: Props): ReactNode {
  return (
    <section className="mt-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
        <span aria-hidden>{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}
