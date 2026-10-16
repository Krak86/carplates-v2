import type { ReactNode } from 'react'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { READ_PATH } from '@/routes/read/links'

type Props = {
  title: string
  lead: string
  backLabel: string
  /** In-page jump links (`#id`). */
  jumps: ReadonlyArray<{ id: string; label: string }>
}

/** Title, lead and jump chips shared by every /read article. */
export default function ArticleHeader({ title, lead, backLabel, jumps }: Props): ReactNode {
  return (
    <Card className="mb-4">
      <Link to={READ_PATH} viewTransition className="mb-2 inline-block text-sm text-primary">
        ← {backLabel}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="text-muted">{lead}</p>

      <nav aria-label={title} className="mt-3 flex flex-wrap gap-2">
        {jumps.map(jump => (
          <a
            key={jump.id}
            href={`#${jump.id}`}
            className="rounded-full border border-border px-3 py-1 text-sm hover:bg-(--color-bg)"
          >
            {jump.label}
          </a>
        ))}
      </nav>
    </Card>
  )
}
