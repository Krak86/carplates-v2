import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import InfoPopover from '@/components/InfoPopover'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { models3dQuery } from '@/lib/queries'

const Model3dModal = lazy(() => import('@/components/Model3dModal'))

type Props = {
  brand: string | null
  model: string | null
}

/**
 * "3D view" chip: renders nothing unless the persisted Sketchfab catalog (pnpm ingest:sketchfab) has models for this
 * make/model. The lookup is a tiny cached request; the modal, its Sketchfab iframe and the thumbnails are only loaded on click.
 */
export default function Model3dButton({ brand, model }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [searchParams] = useSearchParams()
  // A shared link (`?section=model3d&tab=<uid>`) opens the modal straight on that model.
  const isSharedModel = searchParams.get('section') === 'model3d'
  const [open, setOpen] = useState(() => isSharedModel)
  const [sharedUid, setSharedUid] = useState(() => (isSharedModel ? searchParams.get('tab') : null))
  const hasQuery = !!brand && !!model
  const result = useQuery({ ...models3dQuery(brand ?? '', model ?? ''), enabled: hasQuery })
  const models = result.data?.models ?? []

  if (models.length === 0) return null

  return (
    <div className="contents">
      <InfoPopover
        label={t('model3d.open', { n: models.length })}
        title={t('model3d.open', { n: models.length })}
        anchor={
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!online}
            title={online ? undefined : t('offline.needsConnection')}
            className="inline-flex animate-chip-in cursor-pointer items-center gap-1 rounded-full border chip-tone px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors chip-view hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-fg)]"
          >
            <span aria-hidden>🧊</span>
            {t('model3d.open', { n: models.length })}
          </button>
        }
      >
        {t('chip.tip.view3d')}
      </InfoPopover>

      {open && online && (
        <Suspense fallback={null}>
          <Model3dModal
            models={models}
            label={[brand, model].filter(Boolean).join(' ')}
            initialUid={sharedUid}
            onClose={() => {
              setOpen(false)
              setSharedUid(null)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
