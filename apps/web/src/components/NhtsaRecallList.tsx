import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NhtsaComplaintsResponse, NhtsaRecallsResponse } from '@carplates/shared'

import MarketFlag from '@/components/MarketFlag'
import NhtsaComplaints from '@/components/NhtsaComplaints'
import RdwRecallField from '@/components/RdwRecallField'
import { componentKey } from '@/components/NhtsaRecalls.helpers'
import { formatRecallDate, RECALLS_PREVIEW } from '@/components/RdwRecalls.helpers'

type Props = {
  /** Null when NHTSA lists no campaign for the model-year (the complaints can still be there). */
  data: NhtsaRecallsResponse | null
  complaints: NhtsaComplaintsResponse | null
  /** UI locale for dates (`uk` for the `ua` app language). */
  locale: string
}

/**
 * Body of the "US (NHTSA) data" group of the Recalls block: footnote, owner-complaint summary, then the recall campaigns for
 * the car's model-year. English source text, shown as NHTSA words it. Model-level: says nothing about whether this
 * particular car is affected.
 */
export default function NhtsaRecallList({ data, complaints, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const recalls = data?.recalls ?? []
  const shown = expanded ? recalls : recalls.slice(0, RECALLS_PREVIEW)
  const hiddenCount = recalls.length - shown.length
  const name = data ? `${data.make} ${data.matchedModel ?? data.model} ${data.year}` : ''

  return (
    <div>
      {data && <p className="text-xs text-[var(--color-muted)]">{t('nhtsa.footnote', { name, count: data.total })}</p>}

      {complaints && <NhtsaComplaints data={complaints} locale={locale} />}

      <ul className="mt-2 divide-y divide-[var(--color-border)]">
        {shown.map(recall => {
          const date = formatRecallDate(recall.publishedAt, locale)
          const compKey = recall.component ? componentKey(recall.component) : null
          const componentLabel = compKey ? t(compKey) : null
          return (
            <li key={recall.code} className="py-2">
              <details>
                <summary className="cursor-pointer text-base">
                  <span className="mr-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 align-middle text-xs text-[var(--color-muted)]">
                    <MarketFlag market="US" className="h-3 w-4" />
                    {t('recalls.market.US')}
                  </span>
                  {componentLabel ? (
                    <span>{componentLabel}</span>
                  ) : (
                    <span lang="en">{recall.component ?? recall.code}</span>
                  )}
                  <span className="ml-2 text-xs text-[var(--color-muted)]">
                    {[date, recall.producer].filter(Boolean).join(' · ')}
                  </span>
                </summary>

                <dl className="mt-2 space-y-2 text-sm">
                  {recall.component && compKey && (
                    <RdwRecallField
                      label={t('nhtsa.component')}
                      value={recall.component}
                      lang="en"
                      info={t('nhtsa.about.component')}
                    />
                  )}
                  {recall.summary && (
                    <RdwRecallField
                      label={t('recalls.defect')}
                      value={recall.summary}
                      lang="en"
                      info={t('nhtsa.about.summary')}
                    />
                  )}
                  {recall.consequence && (
                    <RdwRecallField
                      label={t('recalls.consequences')}
                      value={recall.consequence}
                      lang="en"
                      info={t('nhtsa.about.consequence')}
                    />
                  )}
                  {recall.remedy && (
                    <RdwRecallField
                      label={t('recalls.remedy')}
                      value={recall.remedy}
                      lang="en"
                      info={t('nhtsa.about.remedy')}
                    />
                  )}
                  {(recall.parkIt || recall.parkOutside || recall.overTheAirUpdate) && (
                    <RdwRecallField
                      label={t('nhtsa.advisory')}
                      value={[
                        recall.parkIt && t('nhtsa.parkIt'),
                        recall.parkOutside && t('nhtsa.parkOutside'),
                        recall.overTheAirUpdate && t('nhtsa.ota')
                      ]
                        .filter(Boolean)
                        .join('; ')}
                      info={t('nhtsa.about.advisory')}
                    />
                  )}
                  <RdwRecallField label={t('nhtsa.code')} value={recall.code} info={t('nhtsa.about.code')} />
                </dl>

                <a
                  href={`https://www.nhtsa.gov/recalls?nhtsaId=${encodeURIComponent(recall.code)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-[var(--color-primary)] underline hover:no-underline"
                >
                  {t('nhtsa.moreInfo')}
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
      {expanded && data && data.total > data.recalls.length && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {t('recalls.truncated', { shown: data.recalls.length, total: data.total })}
        </p>
      )}
    </div>
  )
}
