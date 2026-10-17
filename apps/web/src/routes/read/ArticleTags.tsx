import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { pick } from '@/routes/read/helpers'
import type { ArticleMeta } from '@/routes/read/types'

type Props = {
  article: ArticleMeta
  className?: string
}

/** Topic chips of an article (hub card and article header). */
export default function ArticleTags({ article, className = '' }: Props): ReactNode {
  const { i18n } = useTranslation()

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {article.tags.map(tag => (
        <li key={tag.en} className="rounded-full bg-(--color-bg) px-2 py-0.5 text-xs text-muted">
          {pick(tag, i18n.language)}
        </li>
      ))}
    </ul>
  )
}
