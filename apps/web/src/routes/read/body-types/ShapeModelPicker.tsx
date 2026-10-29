import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import VehicleSizeSchema from '@/components/size/VehicleSizeSchema'
import {
  SIZE_FIELDS,
  mmToMetres,
  type SizeField,
  type SizeFigure,
  type SizeFigures,
  type SizeShape
} from '@/components/size/VehicleSize.helpers'
import { cn } from '@/lib/cn'
import { displayName, modelId, type ModelProfile } from '@/routes/read/helpers'
import ModelDimsRow from '@/routes/read/ModelDimsRow'

type Props = {
  shape: SizeShape
  profiles: readonly ModelProfile[]
}

const figureOf = (value: number | null | undefined): SizeFigure | null =>
  value ? { value, source: 'rdw', spread: null } : null

/** Catalogue dimensions of a registry model as the Size section's figures. */
function figuresOf({ model }: ModelProfile): SizeFigures {
  return {
    lengthMm: figureOf(model.lengthMm),
    widthMm: figureOf(model.widthMm),
    heightMm: figureOf(model.heightMm),
    wheelbaseMm: figureOf(model.wheelbaseMm)
  }
}

/**
 * Tabs over a shape's example models: the picked one is drawn to scale (the Size section's drawing, side + top view)
 * above its row. Point at a dimension to see what it means. Local state only; the first example is open.
 */
export default function ShapeModelPicker({ shape, profiles }: Props): ReactNode {
  const { t } = useTranslation()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [active, setActive] = useState<SizeField | null>(null)
  const picked = profiles.find(p => modelId(p.model) === pickedId) ?? profiles[0]
  if (!picked) return null

  const figures = figuresOf(picked)
  const isDrawable = SIZE_FIELDS.slice(0, 3).every(field => !!figures[field])

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">{t('read.examples')}</h4>

      {profiles.length > 1 && (
        <div role="group" aria-label={t('read.examples')} className="flex flex-wrap gap-1.5">
          {profiles.map(profile => {
            const id = modelId(profile.model)
            const isPicked = profile === picked

            return (
              <button
                key={id}
                type="button"
                aria-pressed={isPicked}
                onClick={() => setPickedId(id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  isPicked
                    ? 'border-primary bg-primary text-(--color-primary-fg)'
                    : 'border-border hover:border-primary'
                )}
              >
                {displayName(profile.model)}
              </button>
            )
          })}
        </div>
      )}

      {isDrawable && (
        <>
          <VehicleSizeSchema
            shape={shape}
            figures={figures}
            name={displayName(picked.model)}
            active={active}
            onActiveChange={setActive}
          />

          <p aria-live="polite" className="min-h-10 text-xs text-muted">
            {active ? (
              <>
                <strong className="text-fg">{t(`size.field.${active}`)}</strong>
                {figures[active] && ` ${mmToMetres(figures[active].value)} ${t('rdw.unitM')}`}
                {'. '}
                {t(`size.about.${active}`)}
              </>
            ) : (
              t('read.pickerHint')
            )}
          </p>
        </>
      )}

      <ModelDimsRow profile={picked} />
    </div>
  )
}
