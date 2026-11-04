import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

type Props = {
  /** Narrows the list to the 3D models (the ones that can already be placed in the real world on a phone). */
  onShow3d: () => void
}

/** The AR / XR teaser: says honestly what works today (AR inside the 3D viewer) and what is planned. */
export default function ShowroomAr({ onShow3d }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold">
          <span aria-hidden>🥽</span>
          {t('showroom.ar.title')}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {t('showroom.ar.badge')}
          </span>
        </h2>
        <p className="text-sm text-muted">{t('showroom.ar.desc')}</p>
      </div>
      <button
        type="button"
        onClick={onShow3d}
        className="shrink-0 cursor-pointer rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary hover:text-white"
      >
        {t('showroom.ar.button')}
      </button>
    </Card>
  )
}
