import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import MarketFlag from '@/components/MarketFlag'
import { fitInBay, linkById, PARKING_REFS, type Dims } from '@/components/size/fit'
import SizeCarTop from '@/components/size/SizeCarTop'
import SizeExternalLink from '@/components/size/SizeExternalLink'
import SizeVerdictChip from '@/components/size/SizeVerdictChip'
import { mmToMetres, type SizeShape } from '@/components/size/VehicleSize.helpers'

type Props = {
  dims: Dims
  shape: SizeShape
  /** Any of the three outer sizes is a forecast. */
  estimated: boolean
}

const PAD = 400
const BIGGEST_W = Math.max(...PARKING_REFS.map(r => r.widthMm))
const BIGGEST_L = Math.max(...PARKING_REFS.map(r => r.lengthMm))

const cm = (mm: number): number => Math.round(mm / 10)

/**
 * The car drawn inside each reference parking place at one scale (Ukrainian ДБН place, its temporary-lot minimum, the
 * German minimum and the common US stall), with how much room is left. The mirrors are counted in the width.
 */
export default function SizeParkingTab({ dims, shape, estimated }: Props): ReactNode {
  const { t } = useTranslation()
  const viewW = Math.max(BIGGEST_W, dims.widthMm + 400) + PAD * 2
  const viewH = Math.max(BIGGEST_L, dims.lengthMm + 400) + PAD * 2

  return (
    <div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{t('size.tab.parking.intro')}</p>

      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {PARKING_REFS.map(ref => {
          const fit = fitInBay(dims, ref.widthMm, ref.lengthMm)
          const link = linkById(ref.link)
          const x0 = (viewW - ref.widthMm) / 2
          const y0 = (viewH - ref.lengthMm) / 2
          const name = t(`size.bay.${ref.id}`)

          return (
            <li key={ref.id} className="rounded-lg border border-[var(--color-border)] p-2">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                <MarketFlag market={ref.market} />
                {name}
                <InfoPopover label={t('vin.info.about', { field: name })} title={name}>
                  <InfoText text={t(`size.bay.about.${ref.id}`)} />
                </InfoPopover>
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {mmToMetres(ref.lengthMm)} × {mmToMetres(ref.widthMm)} {t('rdw.unitM')}
              </p>

              <svg
                viewBox={`0 0 ${viewW} ${viewH}`}
                role="img"
                aria-label={t('size.bay.alt', { name })}
                className="mx-auto mt-1 h-auto w-full max-w-48"
              >
                <rect
                  x={x0}
                  y={y0}
                  width={ref.widthMm}
                  height={ref.lengthMm}
                  fill="var(--color-surface)"
                  fillOpacity={0.35}
                />
                <g stroke="var(--color-muted)" strokeWidth={2}>
                  <line x1={x0} y1={y0} x2={x0} y2={y0 + ref.lengthMm} vectorEffect="non-scaling-stroke" />
                  <line
                    x1={x0 + ref.widthMm}
                    y1={y0}
                    x2={x0 + ref.widthMm}
                    y2={y0 + ref.lengthMm}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line x1={x0} y1={y0} x2={x0 + ref.widthMm} y2={y0} vectorEffect="non-scaling-stroke" />
                </g>
                <SizeCarTop
                  x={x0 + (ref.widthMm - dims.widthMm) / 2}
                  y={y0 + (ref.lengthMm - dims.lengthMm) / 2}
                  dims={dims}
                  shape={shape}
                />
              </svg>

              <div className="mt-1">
                <SizeVerdictChip verdict={fit.verdict} estimated={estimated} />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t('size.bay.margin', { side: cm(fit.sideMm), length: cm(fit.lengthMm) })}
              </p>
              {link && (
                <p className="mt-0.5 text-xs">
                  <SizeExternalLink href={link.url}>{t(`size.link.${link.id}.title`)}</SizeExternalLink>{' '}
                  <span className="text-[var(--color-muted)]">{link.clause}</span>
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-2 text-xs text-[var(--color-muted)]">{t('size.mirrors')}</p>
    </div>
  )
}
