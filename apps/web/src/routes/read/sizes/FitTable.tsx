import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { fitInBay, PARKING_REFS, type FitVerdict } from '@/components/size/fit'
import { mmToMetres } from '@/components/size/VehicleSize.helpers'
import { displayName, pick, type ModelProfile } from '@/routes/read/helpers'
import { FIT_INTRO, FIT_MODELS } from '@/routes/read/sizes/content'

type Props = {
  profiles: readonly ModelProfile[]
}

const ICON: Readonly<Record<FitVerdict, string>> = { comfortable: '✅', tight: '⚠️', no: '⛔' }

/** The biggest fleets that have all three outer sizes, one per distinct body size (Lanos is sold under three names). */
function fitCandidates(profiles: readonly ModelProfile[]): ModelProfile[] {
  const seen = new Set<string>()
  return [...profiles]
    .sort((a, b) => b.model.n - a.model.n)
    .filter(p => {
      const { lengthMm, widthMm, heightMm } = p.model
      if (!lengthMm || !widthMm || !heightMm) return false
      const key = `${lengthMm}|${widthMm}|${heightMm}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, FIT_MODELS)
}

/** "Will it fit?": the most common models against the Ukrainian, German and US parking places. */
export default function FitTable({ profiles }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const rows = fitCandidates(profiles)
  const [lengthCm, setLengthCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const own =
    lengthCm !== '' && widthCm !== '' ? { lengthMm: Number(lengthCm) * 10, widthMm: Number(widthCm) * 10 } : null

  return (
    <Card id="fit" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.sec.fit')}</h2>
      <p className="mb-3 text-muted">{pick(FIT_INTRO, i18n.language)}</p>

      <fieldset className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <legend className="mb-1 font-semibold">{t('read.fit.yours')}</legend>
        {(
          [
            ['lengthMm', lengthCm, setLengthCm],
            ['widthMm', widthCm, setWidthCm]
          ] as const
        ).map(([field, value, set]) => (
          <label key={field} className="flex flex-col gap-1">
            {t(`size.field.${field}`)}, {t('read.fit.cm')}
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={e => set(e.target.value.replace(/D/g, '').slice(0, 3))}
              placeholder={field === 'lengthMm' ? '530' : '250'}
              className="w-28 rounded-lg border border-border bg-surface px-2 py-1.5"
            />
          </label>
        ))}
      </fieldset>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 pr-3">{t('read.fit.model')}</th>
              {PARKING_REFS.map(ref => (
                <th key={ref.id} className="py-1.5 pr-3 font-medium">
                  {t(`size.bay.${ref.id}`)}
                  <span className="block text-xs font-normal text-muted">
                    {mmToMetres(ref.lengthMm)} × {mmToMetres(ref.widthMm)} {t('rdw.unitM')}
                  </span>
                </th>
              ))}
              {own && <th className="py-1.5 pr-3 font-medium">{t('read.fit.yours')}</th>}
            </tr>
          </thead>

          <tbody>
            {rows.map(({ model }) => {
              const dims = { lengthMm: model.lengthMm ?? 0, widthMm: model.widthMm ?? 0, heightMm: model.heightMm ?? 0 }
              const ownVerdict = own ? fitInBay(dims, own.widthMm, own.lengthMm).verdict : 'no'
              return (
                <tr key={`${model.brand}|${model.model}`} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-3">
                    {displayName(model)}
                    <span className="block text-xs text-muted">
                      {mmToMetres(dims.lengthMm)} × {mmToMetres(dims.widthMm)} {t('rdw.unitM')}
                    </span>
                  </td>
                  {PARKING_REFS.map(ref => {
                    const { verdict } = fitInBay(dims, ref.widthMm, ref.lengthMm)
                    return (
                      <td key={ref.id} className="py-1.5 pr-3" title={t(`size.verdict.${verdict}`)}>
                        <span aria-hidden>{ICON[verdict]}</span>
                        <span className="sr-only">{t(`size.verdict.${verdict}`)}</span>
                      </td>
                    )
                  })}
                  {own && (
                    <td className="py-1.5 pr-3">
                      <span aria-hidden>{ICON[ownVerdict]}</span>
                      <span className="sr-only">{t(`size.verdict.${ownVerdict}`)}</span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
