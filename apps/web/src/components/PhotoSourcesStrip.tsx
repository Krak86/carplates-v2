import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

export type StripImage = { key: string; src: string }

type Props = {
  /** The attached plate photo - always the first thumbnail. */
  attachedUrl: string
  /** Every other image of this car (model photo, lot photos), in order. */
  others: readonly StripImage[]
  /** Key of the selected image; null = the attached photo. */
  selectedKey: string | null
  onSelect: (key: string | null) => void
}

/** Thumbnail strip under an attached plate photo: the photo first, then the other images; a click swaps it into the hero slot. */
export default function PhotoSourcesStrip({ attachedUrl, others, selectedKey, onSelect }: Props): ReactNode {
  const { t } = useTranslation()
  if (others.length === 0) return null
  const items: { key: string | null; src: string }[] = [{ key: null, src: attachedUrl }, ...others]

  return (
    <ul className="flex w-full max-w-content gap-1.5 overflow-x-auto pb-0.5">
      {items.map((item, i) => (
        <li key={item.key ?? 'attached'} className="shrink-0">
          <button
            type="button"
            onClick={() => onSelect(item.key)}
            aria-label={t('uaAuctions.photo.open', { n: i + 1, total: items.length })}
            aria-current={item.key === selectedKey}
            className={cn(
              'block h-12 w-16 overflow-hidden rounded-md border-2 transition-opacity',
              item.key === selectedKey
                ? 'border-[var(--color-primary)]'
                : 'border-transparent opacity-70 hover:opacity-100'
            )}
          >
            <img
              src={item.src}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
