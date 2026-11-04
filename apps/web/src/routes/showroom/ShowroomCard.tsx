import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShowroomItem, ShowroomKind } from '@carplates/shared'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { itemKinds } from '@/routes/showroom/helpers'

type Props = {
  item: ShowroomItem
  onOpen: (kind: ShowroomKind) => void
}

const KIND_ICON: Readonly<Record<ShowroomKind, string>> = { '360': '🔄', '3d': '🧊', tuning: '🛠️', oem: '🏭' }

/** One make/model: a thumbnail (when a 3D model has one) and a button per immersive view it has. */
export default function ShowroomCard({ item, onOpen }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const kindLabel = (kind: ShowroomKind, n: number): string =>
    kind === '360'
      ? t('model360.open', { n })
      : kind === '3d'
        ? t('model3d.open', { n })
        : kind === 'tuning'
          ? t('tuning3d.title')
          : t('showroom.oem.button')

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {item.thumbUrl ? (
        <img src={item.thumbUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-border/40 text-4xl" aria-hidden>
          🚗
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h2 className="truncate font-semibold" title={item.label}>
          {item.label}
        </h2>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {itemKinds(item).map(({ kind, n }) => (
            <button
              key={kind}
              type="button"
              onClick={() => onOpen(kind)}
              disabled={!online}
              title={online ? undefined : t('offline.needsConnection')}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-inherit"
            >
              <span aria-hidden>{KIND_ICON[kind]}</span>
              {kindLabel(kind, n)}
            </button>
          ))}
        </div>
      </div>
    </li>
  )
}
