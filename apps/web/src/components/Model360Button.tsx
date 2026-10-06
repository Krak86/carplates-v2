import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { parseModel360Tab } from '@/lib/model360'
import { models360Query } from '@/lib/queries'

const Model360Modal = lazy(() => import('@/components/Model360Modal'))

type Props = {
  brand: string | null
  model: string | null
}

/**
 * "360° view" chip: renders nothing unless the persisted CarShow360 catalog (pnpm ingest:carshow360) has galleries for
 * this make/model. The lookup is a tiny cached request; the modal and its carshow360.net iframe are only loaded on click.
 */
export default function Model360Button({ brand, model }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [searchParams] = useSearchParams()
  // A shared link (`?section=model360&tab=<id>`) opens the modal straight on that gallery.
  const isShared = searchParams.get('section') === 'model360'
  const [open, setOpen] = useState(() => isShared)
  const [shared, setShared] = useState(() => (isShared ? parseModel360Tab(searchParams.get('tab')) : null))
  const hasQuery = !!brand && !!model
  const result = useQuery({ ...models360Query(brand ?? '', model ?? ''), enabled: hasQuery })
  const models = result.data?.models ?? []

  if (models.length === 0) return null

  return (
    <div className="contents">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!online}
        title={online ? undefined : t('offline.needsConnection')}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-fg)]"
      >
        <span aria-hidden>🔄</span>
        {t('model360.open', { n: models.length })}
      </button>

      {open && online && (
        <Suspense fallback={null}>
          <Model360Modal
            models={models}
            label={[brand, model].filter(Boolean).join(' ')}
            initialId={shared?.id}
            initialInterior={shared?.interior}
            onClose={() => {
              setOpen(false)
              setShared(null)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
