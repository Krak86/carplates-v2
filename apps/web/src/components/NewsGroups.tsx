import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NewsItem } from '@carplates/shared'

import NewsCard from '@/components/NewsCard'

type Props = {
  items: NewsItem[]
  brand: string
  model: string | null
  /** Thumbnail-left rows (wide containers) instead of stacked cards. */
  horizontal?: boolean
  /** Cards are out of the tab order / screen readers while the container is hidden. */
  decorative?: boolean
}

/** A car's news in two labelled groups: "About <make model>" (model matches), then "About <make>" (make only). */
export default function NewsGroups({ items, brand, model, horizontal = false, decorative = false }: Props): ReactNode {
  const { t } = useTranslation()
  const groups = [
    {
      key: 'model',
      title: t('news.aboutModel', { model: [brand, model].filter(Boolean).join(' ') }),
      items: items.filter(i => i.match === 'model')
    },
    { key: 'brand', title: t('news.aboutBrand', { brand }), items: items.filter(i => i.match !== 'model') }
  ].filter(g => g.items.length)

  return groups.map(group => (
    <section key={group.key} className="space-y-2">
      <h3 className="px-1 text-xs tracking-wide text-[var(--color-muted)] uppercase">{group.title}</h3>

      <ul className="space-y-2">
        {group.items.map(item => (
          <li key={item.url}>
            <NewsCard item={item} compact horizontal={horizontal} decorative={decorative} />
          </li>
        ))}
      </ul>
    </section>
  ))
}
