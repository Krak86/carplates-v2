import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { CaRecallsResponse } from '@carplates/shared'

import { caRecallUrl, systemKey } from '@/components/CaRecalls.helpers'
import MarketFlag from '@/components/MarketFlag'
import RdwRecallField from '@/components/RdwRecallField'
import { formatRecallDate, formatVehicleCount, RECALLS_PREVIEW } from '@/components/RdwRecalls.helpers'

type Props = {
  data: NonNullable<CaRecallsResponse['match']>
  /** Model year of the car the list was asked for (null when unknown). */
  year: number | null
  /** UI locale for dates and numbers (`uk` for the `ua` app language). */
  locale: string
}

/**
 * Body of the "Canada (Transport Canada) data" group of the Recalls block: only campaigns with no US counterpart, in Transport
 * Canada's English wording. Model-level: says nothing about whether this particular car is affected.
 */
export default function CaRecallList({ data, year, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? data.recalls : data.recalls.slice(0, RECALLS_PREVIEW)
  const hiddenCount = data.recalls.length - shown.length
  const name = `${data.makeName} ${data.modelName}${year ? ` ${year}` : ''}`

  return (
    <div>
      <p className="text-xs text-[var(--color-muted)]">{t('ca.footnote', { name, count: data.total })}</p>

      <ul className="mt-2 divide-y divide-[var(--color-border)]">
        {shown.map(recall => {
          const date = formatRecallDate(recall.publishedAt, locale)
          const units = formatVehicleCount(recall.units, locale)
          const sysKey = recall.system ? systemKey(recall.system) : null
          return (
            <li key={recall.code} className="py-2">
              <details>
                <summary className="cursor-pointer text-base">
                  <span className="mr-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 align-middle text-xs text-[var(--color-muted)]">
                    <MarketFlag market="CA" className="h-3 w-4" />
                    {t('recalls.market.CA')}
                  </span>
                  {sysKey ? <span>{t(sysKey)}</span> : <span lang="en">{recall.system ?? recall.code}</span>}
                  <span className="ml-2 text-xs text-[var(--color-muted)]">{date}</span>
                </summary>

                <dl className="mt-2 space-y-2 text-sm">
                  {recall.text && (
                    <RdwRecallField
                      label={t('recalls.defect')}
                      value={recall.text}
                      lang="en"
                      multiline
                      info={t('ca.about.text')}
                    />
                  )}
                  {recall.system && sysKey && (
                    <RdwRecallField
                      label={t('ca.system')}
                      value={recall.system}
                      lang="en"
                      info={t('ca.about.system')}
                    />
                  )}
                  {recall.years.length > 0 && (
                    <RdwRecallField label={t('ca.years')} value={recall.years.join(', ')} info={t('ca.about.years')} />
                  )}
                  {units && <RdwRecallField label={t('ca.units')} value={units} info={t('ca.about.units')} />}
                  {recall.manufacturerNo && (
                    <RdwRecallField label={t('ca.mfrNo')} value={recall.manufacturerNo} info={t('ca.about.mfrNo')} />
                  )}
                  <RdwRecallField label={t('ca.code')} value={recall.code} info={t('ca.about.code')} />
                </dl>

                <a
                  href={caRecallUrl(recall.code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-[var(--color-primary)] underline hover:no-underline"
                >
                  {t('ca.moreInfo')}
                </a>
              </details>
            </li>
          )
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
        >
          {t('recalls.showMore', { count: hiddenCount })}
        </button>
      )}
      {expanded && data.total > data.recalls.length && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {t('recalls.truncated', { shown: data.recalls.length, total: data.total })}
        </p>
      )}
    </div>
  )
}
