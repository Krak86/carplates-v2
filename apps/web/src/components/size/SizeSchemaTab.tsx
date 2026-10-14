import type { ReactNode } from 'react'
import type { WikiSource } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import VehicleSizeSchema from '@/components/size/VehicleSizeSchema'
import {
  formatMm,
  mmToMetres,
  SIZE_FIELDS,
  sourceLabel,
  type ClassResult,
  type SizeField,
  type SizeFigure,
  type SizeFigures,
  type SizeShape
} from '@/components/size/VehicleSize.helpers'
import { cn } from '@/lib/cn'

type Props = {
  name: string
  shape: SizeShape
  figures: SizeFigures
  cls: ClassResult | null
  wiki: WikiSource | null
}

type RowProps = {
  label: string
  /** `size.about.<aboutKey>` explainer. */
  aboutKey: string
  children: ReactNode
  tag?: ReactNode
  note?: ReactNode
}

const ROW_CLASS =
  '-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40'

/** Same look as the Specs rows: a muted label chip with a ❓ on the left, the value (and its source) on the right. */
function Row({ label, aboutKey, children, tag, note }: RowProps): ReactNode {
  const { t } = useTranslation()

  return (
    <div className={ROW_CLASS}>
      <span className="flex items-center gap-1.5 rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">
        {label}
        <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
          <InfoText text={t(`size.about.${aboutKey}`)} />
        </InfoPopover>
      </span>

      <span className="flex flex-col items-end rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-right">
        <span className="font-medium">{children}</span>
        {note}
        {tag}
      </span>
    </div>
  )
}

type TagProps = { figure: SizeFigure; wiki: WikiSource | null }

/** The "where from" pill under a figure; a forecast is dashed and ❓-explained so it is never read as data. */
function SourceTag({ figure, wiki }: TagProps): ReactNode {
  const { t } = useTranslation()
  const isEstimate = figure.source === 'estimate'
  const label = sourceLabel(figure.source, wiki, t)

  return (
    <span
      className={cn(
        'mt-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 text-xs text-[var(--color-muted)]',
        isEstimate ? 'border-dashed border-[var(--color-border)]' : 'border-[var(--color-border)]'
      )}
    >
      {label}
      {isEstimate && (
        <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
          <InfoText text={t('size.about.estimate')} />
        </InfoPopover>
      )}
    </span>
  )
}

/**
 * The first tab: the scaled side and top drawing, then one row per figure with its source, the fleet range where RDW
 * gave one, and the shape and class the drawing and the header chip are based on.
 */
export default function SizeSchemaTab({ name, shape, figures, cls, wiki }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const metre = t('rdw.unitM')
  const unit = t('wikispec.unitMm')

  return (
    <div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{t('size.tab.schema.intro')}</p>

      <VehicleSizeSchema shape={shape} figures={figures} name={name} />

      <div className="mt-2 divide-y divide-[var(--color-border)]">
        {SIZE_FIELDS.map((field: SizeField) => {
          const figure = figures[field]
          if (!figure) return null
          const spread = figure.spread
          const hasSpread = !!spread && spread.max - spread.min > figure.value * 0.02

          return (
            <Row
              key={field}
              label={t(`size.field.${field}`)}
              aboutKey={field}
              tag={<SourceTag figure={figure} wiki={wiki} />}
              note={
                hasSpread && (
                  <span className="text-xs text-[var(--color-muted)]">
                    {t('size.range', {
                      range: `${formatMm(spread.min, i18n.language)}–${formatMm(spread.max, i18n.language)}`,
                      unit
                    })}
                  </span>
                )
              }
            >
              {figure.source === 'estimate' && '≈ '}
              {formatMm(figure.value, i18n.language)} {unit}
              <span className="ml-1 font-normal text-[var(--color-muted)]">
                ({mmToMetres(figure.value)} {metre})
              </span>
            </Row>
          )
        })}

        <Row label={t('size.shape.label')} aboutKey="shape">
          {t(`size.shape.${shape}`)}
        </Row>

        {cls && (
          <Row label={t('size.class.label')} aboutKey="class">
            {t(`size.class.${cls.cls}`)}
            {cls.sub != null && (
              <span className="ml-1 font-normal text-[var(--color-muted)]">({t(`rdw.size.${cls.sub}`)})</span>
            )}
          </Row>
        )}
      </div>
    </div>
  )
}
