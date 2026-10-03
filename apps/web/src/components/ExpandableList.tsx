import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** `<li>` elements (keyed by the caller). */
  items: ReactNode[]
  className?: string
}

/** How many items show before "Show N more". */
export const COLLAPSED_ITEMS = 5

/** A list that shows its first few items and expands to the rest on request. */
export default function ExpandableList({ items, className }: Props): ReactNode {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const hidden = items.length - COLLAPSED_ITEMS

  return (
    <>
      <ul className={className}>{expanded || hidden <= 0 ? items : items.slice(0, COLLAPSED_ITEMS)}</ul>

      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(v => !v)}
          className="mt-1 px-1 text-sm text-[var(--color-primary)] underline hover:no-underline"
        >
          {expanded ? t('reviews.showLess') : t('reviews.showMore', { count: hidden })}
        </button>
      )}
    </>
  )
}
