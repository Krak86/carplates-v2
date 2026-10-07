import type { ReactNode } from 'react'
import type { NewsItem } from '@carplates/shared'

import NewsCard from '@/components/NewsCard'

type Props = {
  items: NewsItem[]
  brand: string
  /** Thumbnail-left rows (wide containers) instead of stacked cards. */
  horizontal?: boolean
  /** Cards are out of the tab order / screen readers while the container is hidden. */
  decorative?: boolean
}

/** A car's news as one list: model matches first, then make-only matches (stable order within each). */
export default function NewsGroups({ items, brand, horizontal = false, decorative = false }: Props): ReactNode {
  const sorted = [...items.filter(i => i.match === 'model'), ...items.filter(i => i.match !== 'model')]

  return (
    <ul className="space-y-2">
      {sorted.map(item => (
        <li key={item.url}>
          <NewsCard item={item} compact horizontal={horizontal} decorative={decorative} fallbackBrand={brand} />
        </li>
      ))}
    </ul>
  )
}
