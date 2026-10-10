import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NhtsaComplaintsResponse } from '@carplates/shared'

import MarketFlag from '@/components/MarketFlag'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { formatRecallDate } from '@/components/RdwRecalls.helpers'

type Props = {
  data: NhtsaComplaintsResponse
  locale: string
}

/**
 * Summary of US owner complaints NHTSA holds for the car's model-year: counts only, never the narratives. A complaint is
 * an unverified owner report, not a finding, so the copy says so.
 */
export default function NhtsaComplaints({ data, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const number = new Intl.NumberFormat(locale)
  const name = `${data.make} ${data.matchedModel ?? data.model} ${data.year}`
  const latest = formatRecallDate(data.latestFiled, locale)
  const facts = [
    data.crashes > 0 && t('nhtsa.complaints.crashes', { count: data.crashes }),
    data.fires > 0 && t('nhtsa.complaints.fires', { count: data.fires }),
    data.injuries > 0 && t('nhtsa.complaints.injuries', { count: data.injuries }),
    data.deaths > 0 && t('nhtsa.complaints.deaths', { count: data.deaths })
  ].filter(Boolean)

  return (
    <div className="mt-3 rounded-lg bg-[var(--color-surface)]/20 p-3 text-sm">
      <p className="flex items-center gap-1 font-medium">
        {t('nhtsa.complaints.title')}
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal text-[var(--color-muted)]">
          <MarketFlag market="US" className="h-3 w-4" />
          {t('recalls.market.US')}
        </span>
        <InfoPopover
          label={t('vin.info.about', { field: t('nhtsa.complaints.title') })}
          title={t('nhtsa.complaints.title')}
        >
          <InfoText text={t('nhtsa.complaints.info')} />
        </InfoPopover>
      </p>

      <p className="mt-1">{t('nhtsa.complaints.total', { name, total: number.format(data.total) })}</p>
      {facts.length > 0 && <p className="mt-1 text-[var(--color-muted)]">{facts.join(' · ')}</p>}

      {data.components.length > 0 && (
        <>
          <p className="mt-2 text-xs text-[var(--color-muted)]">{t('nhtsa.complaints.components')}</p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {data.components.map(component => (
              <li
                key={component.name}
                lang="en"
                className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs"
              >
                {component.name} · {number.format(component.count)}
              </li>
            ))}
          </ul>
        </>
      )}

      {latest && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">{t('nhtsa.complaints.latest', { date: latest })}</p>
      )}
    </div>
  )
}
