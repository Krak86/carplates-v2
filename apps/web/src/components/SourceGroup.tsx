import { useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  /** Public path of the source's logo; hidden when the file isn't there (yet). */
  icon?: string
  name: string
  children: ReactNode
}

/** One source (infocar, e-drive, other sites) inside the combined reviews section: its name, then what it offers. */
export default function SourceGroup({ icon, name, children }: Props): ReactNode {
  const [iconFailed, setIconFailed] = useState(false)

  return (
    <section className="space-y-1.5">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-[var(--color-muted)] uppercase">
        {icon && !iconFailed && (
          <img
            src={icon}
            alt=""
            width={20}
            height={20}
            onError={() => setIconFailed(true)}
            className="size-5 rounded-sm"
          />
        )}
        {name}
      </h4>

      {children}
    </section>
  )
}
