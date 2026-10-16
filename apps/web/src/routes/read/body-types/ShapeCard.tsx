import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { SHAPE_COPY, type ExplainedShape } from '@/routes/read/body-types/content'
import { pick, type ModelProfile } from '@/routes/read/helpers'
import { shapeAnchor } from '@/routes/read/links'
import ModelDimsRow from '@/routes/read/ModelDimsRow'
import ShapeSilhouette from '@/routes/read/ShapeSilhouette'

type Props = {
  shape: ExplainedShape
  highlighted: boolean
  find: (brand: string, model: string) => ModelProfile | undefined
}

/** One body shape: outline, what it is, how to spot it, and real models of it with their sizes and plates. */
export default function ShapeCard({ shape, highlighted, find }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const copy = SHAPE_COPY[shape]
  const examples = copy.examples.flatMap(e => find(e.brand, e.model) ?? [])

  return (
    <Card
      id={shapeAnchor(shape)}
      className={cn('flex scroll-mt-20 flex-col gap-3', highlighted && 'border-primary ring-2 ring-primary/30')}
    >
      <div className="flex items-center gap-3">
        <ShapeSilhouette shape={shape} />
        <h3 className="text-lg font-semibold">{t(`size.shape.${shape}`)}</h3>
      </div>

      <p>{pick(copy.what, i18n.language)}</p>

      <p className="text-sm text-muted">
        <span aria-hidden>👀</span> <strong>{t('read.howToSpot')}:</strong> {pick(copy.spot, i18n.language)}
      </p>

      {examples.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">{t('read.examples')}</h4>
          {examples.map(profile => (
            <ModelDimsRow key={`${profile.model.brand}|${profile.model.model}`} profile={profile} />
          ))}
        </div>
      )}
    </Card>
  )
}
