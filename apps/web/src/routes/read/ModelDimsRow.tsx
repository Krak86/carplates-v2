import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import VehicleSizeSchema from '@/components/size/VehicleSizeSchema'
import { mmToMetres } from '@/components/size/VehicleSize.helpers'
import { cn } from '@/lib/cn'
import ExamplePlates from '@/routes/read/ExamplePlates'
import { displayName, figuresOf, formatCount, type ModelProfile } from '@/routes/read/helpers'

type Props = {
  profile: ModelProfile
  /** The model the reader came with from a plate card: framed so it is easy to spot. */
  highlighted?: boolean
  /** Show the "Show real plates" button and the advanced-search link. */
  withActions?: boolean
  /** Draw the model to scale (side + top view) in the tile. */
  withDrawing?: boolean
}

/** One model: name, approximate segment, L × W × H, how many we have, and (optionally) real plates of it. */
export default function ModelDimsRow({
  profile,
  highlighted = false,
  withActions = true,
  withDrawing = false
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { model, cls } = profile
  const { lengthMm, widthMm, heightMm } = model
  const dims = [lengthMm, widthMm, heightMm].map(mm => (mm ? mmToMetres(mm) : '-')).join(' × ')
  const searchParams = new URLSearchParams({ brand: model.brand, model: model.model })

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border border-border p-2.5',
        highlighted && 'border-primary ring-2 ring-primary/30'
      )}
      data-highlighted={highlighted || undefined}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-semibold">{displayName(model)}</span>
        <span className="text-sm text-muted">{t('read.inUa', { n: formatCount(model.n, i18n.language) })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {cls && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs">
            {t(`size.class.${cls.cls}`)}
            {cls.sub != null && ` · ${t(`rdw.size.${cls.sub}`)}`}
          </span>
        )}
        <span>
          {dims} {t('rdw.unitM')}
        </span>
        {!lengthMm && <span className="text-muted">{t('read.noDims')}</span>}
      </div>

      {withDrawing && lengthMm && widthMm && heightMm && (
        <VehicleSizeSchema shape={profile.shape} figures={figuresOf(profile)} name={displayName(model)} />
      )}

      {withActions && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <ExamplePlates brand={model.brand} model={model.model} />
          <Link to={`/advanced-search?${searchParams.toString()}`} className="text-sm text-primary">
            {t('read.search')} →
          </Link>
        </div>
      )}
    </div>
  )
}
