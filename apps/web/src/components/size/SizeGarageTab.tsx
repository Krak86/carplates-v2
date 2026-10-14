import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { fitInGarage, GARAGE_REFS, MIRRORS_MM, sizeTips, type Dims, type FitVerdict } from '@/components/size/fit'
import SizeCarTop from '@/components/size/SizeCarTop'
import SizeVerdictChip from '@/components/size/SizeVerdictChip'
import { mmToMetres, type SizeShape } from '@/components/size/VehicleSize.helpers'

type Props = {
  dims: Dims
  shape: SizeShape
  estimated: boolean
}

const WALL = 160
const PAD = 300
const cm = (mm: number): number => Math.round(mm / 10)

const PART_ICON: Readonly<Record<FitVerdict, string>> = { comfortable: '✅', tight: '⚠️', no: '⛔' }

/** A single box and a double garage seen from above: the car(s), the door, and what is left at each edge. */
export default function SizeGarageTab({ dims, shape, estimated }: Props): ReactNode {
  const { t } = useTranslation()
  const tips = sizeTips(dims, shape)

  return (
    <div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{t('size.tab.garage.intro')}</p>

      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {GARAGE_REFS.map(garage => {
          const fit = fitInGarage(dims, garage)
          const name = t(`size.garage.${garage.id}`)
          const viewW = garage.widthMm + (WALL + PAD) * 2
          const viewH = garage.lengthMm + (WALL + PAD) * 2
          const x0 = WALL + PAD
          const y0 = WALL + PAD
          const carWidth = dims.widthMm + MIRRORS_MM
          const doorX = x0 + (garage.widthMm - garage.doorWidthMm) / 2
          const rows: ReadonlyArray<{ key: string; verdict: FitVerdict; text: string }> = [
            { key: 'width', verdict: fit.parts.width, text: t('size.garage.width', { n: cm(fit.gapMm) }) },
            { key: 'length', verdict: fit.parts.length, text: t('size.garage.length', { n: cm(fit.lengthMm) }) },
            { key: 'door', verdict: fit.parts.door, text: t('size.garage.door', { n: cm(fit.doorMm) }) },
            { key: 'height', verdict: fit.parts.height, text: t('size.garage.height', { n: cm(fit.heightMm) }) }
          ]

          return (
            <li key={garage.id} className="rounded-lg border border-[var(--color-border)] p-2">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                {name}
                <InfoPopover label={t('vin.info.about', { field: name })} title={name}>
                  <InfoText text={t(`size.garage.about.${garage.id}`)} />
                </InfoPopover>
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {mmToMetres(garage.lengthMm)} × {mmToMetres(garage.widthMm)} {t('rdw.unitM')} ·{' '}
                {t('size.garage.doorLabel')} {mmToMetres(garage.doorWidthMm)} × {mmToMetres(garage.doorHeightMm)}{' '}
                {t('rdw.unitM')}
              </p>

              <svg
                viewBox={`0 0 ${viewW} ${viewH}`}
                role="img"
                aria-label={t('size.garage.alt', { name })}
                className="mx-auto mt-1 h-auto w-full max-w-60"
              >
                <rect
                  x={x0 - WALL}
                  y={y0 - WALL}
                  width={garage.widthMm + WALL * 2}
                  height={garage.lengthMm + WALL * 2}
                  fill="var(--color-muted)"
                  fillOpacity={0.5}
                />
                <rect x={x0} y={y0} width={garage.widthMm} height={garage.lengthMm} fill="var(--color-bg)" />
                <rect
                  x={doorX}
                  y={y0 + garage.lengthMm}
                  width={garage.doorWidthMm}
                  height={WALL}
                  fill="var(--color-primary)"
                  fillOpacity={0.6}
                />
                {Array.from({ length: garage.cars }, (_, i) => (
                  <SizeCarTop
                    key={i}
                    x={x0 + fit.gapMm * (i + 1) + carWidth * i + MIRRORS_MM / 2}
                    y={y0 + (garage.lengthMm - dims.lengthMm) / 2}
                    dims={dims}
                    shape={shape}
                  />
                ))}
              </svg>

              <div className="mt-1">
                <SizeVerdictChip verdict={fit.verdict} estimated={estimated} />
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-[var(--color-muted)]">
                {rows.map(row => (
                  <li key={row.key}>
                    <span aria-hidden>{PART_ICON[row.verdict]}</span> {row.text}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      <p className="mt-2 text-xs text-[var(--color-muted)]">{t('size.garage.typical')}</p>

      <h4 className="mt-3 text-sm font-semibold">{t('size.tips.title')}</h4>
      <ul className="mt-1 space-y-1 text-sm">
        {tips.map(tip => {
          const label = t(`size.tip.${tip.key}.title`, tip.params)
          return (
            <li key={tip.key} className="flex items-start gap-1.5">
              <span aria-hidden>{tip.tone === 'easy' ? '👍' : '⚠️'}</span>
              <span>
                {label}{' '}
                <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
                  <InfoText text={t(`size.tip.${tip.key}.about`, tip.params)} />
                </InfoPopover>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
