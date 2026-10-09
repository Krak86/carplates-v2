import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { plateQuery } from '@/lib/queries'
import { useRegionLabel } from '@/lib/region-label'
import { formatVehicleLabel } from '@/lib/vehicle-label'

type Props = {
  plate: string
  /** Show the vehicle info straight away; otherwise behind a "Show info" button. */
  auto: boolean
  onNavigate: () => void
}

export default function ArPlateCard({ plate, auto, onNavigate }: Props): ReactNode {
  const { t } = useTranslation()
  const regionLabel = useRegionLabel()
  const [shown, setShown] = useState(false)
  const expanded = auto || shown
  const { data, isPending, isError } = useQuery({ ...plateQuery(plate), enabled: expanded, retry: false })
  const car = data?.current

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-base font-semibold">{plate}</span>
        {!expanded && (
          <button
            type="button"
            onClick={() => setShown(true)}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 hover:border-muted"
          >
            {t('ar.showInfo')}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-1">
          {isPending && <p className="text-muted">{t('ar.loadingInfo')}</p>}
          {isError && <p className="text-muted">{t('ar.notFound')}</p>}
          {car && (
            <>
              <p className="font-medium">
                {formatVehicleLabel({ brand: car.brand, model: car.model, year: car.makeYear, color: car.color })}
              </p>
              <p className="text-muted">{[car.fuel, car.body, regionLabel(data.region)].filter(Boolean).join(' · ')}</p>
            </>
          )}
          <Link
            viewTransition
            to={`/${encodeURIComponent(plate)}`}
            onClick={onNavigate}
            className="mt-1 inline-block text-[var(--color-primary)] hover:underline"
          >
            {t('ar.openFull')}
          </Link>
        </div>
      )}
    </div>
  )
}
