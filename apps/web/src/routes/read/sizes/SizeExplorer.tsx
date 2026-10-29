import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { SIZE_CLASSES, type SizeClass, type SizeShape } from '@/components/size/VehicleSize.helpers'
import { cn } from '@/lib/cn'
import { EXPLORER_SHAPES, formatCount, pick, type ModelProfile } from '@/routes/read/helpers'
import ModelDimsRow from '@/routes/read/ModelDimsRow'
import { EXPLORER_INTRO } from '@/routes/read/sizes/content'
import { useSizeExplorerActions } from '@/routes/read/sizes/use-size-explorer-actions'

type Props = {
  profiles: readonly ModelProfile[]
}

const CHIP = 'rounded-full border border-border px-3 py-1 text-sm'
const CHIP_ON = 'bg-primary text-(--color-primary-fg)'

/** Pick a body shape, a segment or a name: the registry's models in that bucket, with sizes, counts and real plates. */
export default function SizeExplorer({ profiles }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const explorer = useSizeExplorerActions(profiles)
  const { shape, cls, text, highlighted, results, total } = explorer
  const isFiltered = !!(shape || cls || text || highlighted)

  const handleShapeChange = (value: string): void =>
    explorer.handleShape(EXPLORER_SHAPES.find(s => s === value) ?? null)

  return (
    <Card id="explorer" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.sec.explorer')}</h2>
      <p className="mb-3 text-muted">{pick(EXPLORER_INTRO, i18n.language)}</p>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t('size.shape.label')}
          <select
            value={shape ?? ''}
            onChange={e => handleShapeChange(e.target.value)}
            className="rounded-lg border border-border bg-(--color-surface) px-2 py-1.5"
          >
            <option value="">{t('read.explorer.any')}</option>
            {EXPLORER_SHAPES.map((s: SizeShape) => (
              <option key={s} value={s}>
                {t(`size.shape.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t('read.explorer.name')}
          <input
            type="search"
            value={text}
            onChange={e => explorer.handleText(e.target.value)}
            placeholder={t('read.explorer.namePlaceholder')}
            className="rounded-lg border border-border bg-(--color-surface) px-2 py-1.5"
          />
        </label>
      </div>

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t('size.class.label')}>
        {SIZE_CLASSES.map((c: SizeClass) => (
          <button
            key={c}
            type="button"
            aria-pressed={cls === c}
            onClick={() => explorer.handleClass(cls === c ? null : c)}
            className={cn(CHIP, cls === c && CHIP_ON)}
          >
            {t(`size.class.${c}`)}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted" aria-live="polite">
        <span>{t('read.explorer.count', { n: formatCount(total, i18n.language) })}</span>
        {isFiltered && (
          <button type="button" onClick={explorer.handleReset} className="text-primary">
            {t('read.explorer.reset')}
          </button>
        )}
      </div>

      {highlighted && (
        <p className="mb-2 text-sm">
          <span aria-hidden>📍</span> {t('read.explorer.yourCar')}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {results.map(p => (
          <ModelDimsRow
            key={`${p.model.brand}|${p.model.model}`}
            profile={p}
            highlighted={p === highlighted}
            withDrawing
          />
        ))}
      </div>

      {total === 0 && <p className="text-muted">{t('read.explorer.empty')}</p>}

      {explorer.canShowMore && (
        <button type="button" onClick={explorer.handleShowMore} className={cn(CHIP, 'mt-3')}>
          {t('read.explorer.more')}
        </button>
      )}
    </Card>
  )
}
