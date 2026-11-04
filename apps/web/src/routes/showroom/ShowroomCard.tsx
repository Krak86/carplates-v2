import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShowroomItem, ShowroomKind, ShowroomView } from '@carplates/shared'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { itemKinds } from '@/routes/showroom/helpers'

type Props = {
  item: ShowroomItem
  /** Layout: big card (default), compact row, or image with the name over it. */
  view?: ShowroomView
  /** Position in the grid: staggers the entrance animation (capped by the `animate-row-in` utility). */
  index?: number
  onOpen: (kind: ShowroomKind) => void
}

const KIND_ICON: Readonly<Record<ShowroomKind, string>> = { '360': '🔄', '3d': '🧊', tuning: '🛠️', oem: '🏭' }

/** One make/model: a thumbnail (a 3D model's, else our stored Wikimedia photo) and a button per immersive view it has. */
export default function ShowroomCard({ item, view = 'grid', index = 0, onOpen }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  /** The thumbnail URL that failed to load (dead link): show the placeholder instead of a broken-image icon. */
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const kindLabel = (kind: ShowroomKind, n: number): string =>
    kind === '360'
      ? t('model360.open', { n })
      : kind === '3d'
        ? t('model3d.open', { n })
        : kind === 'tuning'
          ? t('tuning3d.title')
          : t('showroom.oem.button')

  const kinds = itemKinds(item)
  const buttons = (compact: boolean): ReactNode =>
    kinds.map(({ kind, n }) => (
      <button
        key={kind}
        type="button"
        onClick={() => onOpen(kind)}
        disabled={!online}
        title={online ? kindLabel(kind, n) : t('offline.needsConnection')}
        aria-label={kindLabel(kind, n)}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 rounded-full border text-xs disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-inherit',
          compact
            ? 'border-white/40 bg-black/40 px-2 py-0.5 text-white backdrop-blur-sm hover:border-white'
            : 'border-border px-2.5 py-0.5 hover:border-primary hover:text-primary'
        )}
      >
        <span aria-hidden>{KIND_ICON[kind]}</span>
        {!compact && kindLabel(kind, n)}
      </button>
    ))

  const image =
    item.thumbUrl && failedUrl !== item.thumbUrl ? (
      <img
        src={item.thumbUrl}
        alt=""
        loading="lazy"
        onError={() => setFailedUrl(item.thumbUrl)}
        className="absolute inset-0 size-full object-cover"
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center bg-border/40 text-4xl" aria-hidden>
        🚗
      </div>
    )

  const base = 'animate-row-in overflow-hidden rounded-xl border border-border bg-surface shadow-sm'
  const style = { '--row-i': index % 12 } as CSSProperties

  if (view === 'list')
    return (
      <li style={style} className={cn(base, 'flex items-center gap-3 p-2')}>
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg sm:w-36">{image}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h2 className="truncate font-semibold" title={item.label}>
            {item.label}
          </h2>
          <div className="flex flex-wrap gap-1.5">{buttons(false)}</div>
        </div>
      </li>
    )

  if (view === 'gallery')
    return (
      <li style={style} className={cn(base, 'group relative aspect-4/3')}>
        <div className="relative size-full transition-transform duration-300 group-hover:scale-105">{image}</div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-linear-to-t from-black/75 to-transparent p-2.5 pt-8">
          <h2 className="truncate text-sm font-semibold text-white" title={item.label}>
            {item.label}
          </h2>
          <div className="flex flex-wrap gap-1">{buttons(true)}</div>
        </div>
      </li>
    )

  return (
    <li style={style} className={cn(base, 'flex flex-col')}>
      <div className="relative aspect-video w-full shrink-0 overflow-hidden">{image}</div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h2 className="truncate font-semibold" title={item.label}>
          {item.label}
        </h2>
        <div className="mt-auto flex flex-wrap gap-1.5">{buttons(false)}</div>
      </div>
    </li>
  )
}
