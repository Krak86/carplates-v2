import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { mmToMetres, SUB_CUTS, type SizeClass } from '@/components/size/VehicleSize.helpers'
import {
  displayName,
  formatCount,
  segmentRange,
  topOfSegment,
  type LengthRange,
  type ModelProfile
} from '@/routes/read/helpers'
import { readHref } from '@/routes/read/links'
import { TOP_PER_SEGMENT } from '@/routes/read/sizes/content'

type Props = {
  profiles: readonly ModelProfile[]
}

const CAR_CLASSES: readonly SizeClass[] = ['A', 'B', 'C', 'D', 'E', 'F']
const SUB_KEYS = [0, 1, 2, 3] as const

/** "< 3.80 m", "3.80–4.20 m", "≥ 5.10 m". */
function rangeText(range: LengthRange | null, unit: string): string {
  if (!range) return '—'
  const { fromMm, toMm } = range
  if (fromMm == null && toMm != null) return `< ${mmToMetres(toMm)} ${unit}`
  if (fromMm != null && toMm == null) return `≥ ${mmToMetres(fromMm)} ${unit}`
  if (fromMm != null && toMm != null) return `${mmToMetres(fromMm)}–${mmToMetres(toMm)} ${unit}`
  return '—'
}

/** Sub-size word ranges of the SUV / MPV classes (small … large), from the same cut-offs the plate card uses. */
const subRange = (index: number): LengthRange => ({
  fromMm: index > 0 ? (SUB_CUTS[index - 1] ?? null) : null,
  toMm: SUB_CUTS[index] ?? null
})

/** The segment table: each class with its length range for both body families and the biggest fleets in it. */
export default function SegmentsTable({ profiles }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const unit = t('rdw.unitM')

  const topModels = (cls: SizeClass): ReactNode => {
    const top = topOfSegment(profiles, cls, TOP_PER_SEGMENT)
    if (top.length === 0) return '—'
    return top.map(p => (
      <span key={`${p.model.brand}|${p.model.model}`} className="block">
        {displayName(p.model)} <span className="text-muted">({formatCount(p.model.n, i18n.language)})</span>
      </span>
    ))
  }

  const classLink = (cls: SizeClass): ReactNode => (
    <Link to={readHref.sizes({ cls })} className="font-medium text-primary">
      {t(`size.class.${cls}`)}
    </Link>
  )

  return (
    <Card id="segments" className="scroll-mt-20">
      <h2 className="mb-3 text-xl font-semibold">{t('read.sec.segments')}</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 pr-3">{t('read.seg.class')}</th>
              <th className="py-1.5 pr-3">{t('read.seg.hatch')}</th>
              <th className="py-1.5 pr-3">{t('read.seg.sedan')}</th>
              <th className="py-1.5">{t('read.seg.top')}</th>
            </tr>
          </thead>

          <tbody>
            {CAR_CLASSES.map(cls => (
              <tr key={cls} className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3">{classLink(cls)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{rangeText(segmentRange(cls, 'compact'), unit)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{rangeText(segmentRange(cls, 'long'), unit)}</td>
                <td className="py-2">{topModels(cls)}</td>
              </tr>
            ))}

            {(['J', 'M'] as const).map(cls => (
              <tr key={cls} className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3">{classLink(cls)}</td>
                <td colSpan={2} className="py-2 pr-3">
                  {SUB_KEYS.map(index => (
                    <span key={index} className="block whitespace-nowrap">
                      {t(`rdw.size.${index}`)}: {rangeText(subRange(index), unit)}
                    </span>
                  ))}
                </td>
                <td className="py-2">{topModels(cls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
