import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyTimeQuery } from '@/lib/queries'
import { fillBuckets, hourLabel, peakBucket, weekdayLabel } from '@/routes/road-safety/helpers'
import SectionSkeleton from '@/routes/road-safety/SectionSkeleton'

type Props = {
  year: number | undefined
}

type ColumnsProps = {
  buckets: { bucket: number; crashes: number }[]
  label: (bucket: number) => string
  ariaLabel: string
  peak: number
  /** Show the label of every n-th column only (24 hour labels do not fit a phone). */
  labelEvery?: number
}

function Columns({ buckets, label, ariaLabel, peak, labelEvery = 1 }: ColumnsProps): ReactNode {
  const biggest = Math.max(1, ...buckets.map(b => b.crashes))

  return (
    <div>
      <div className="flex h-32 items-end gap-0.5" role="img" aria-label={ariaLabel}>
        {buckets.map(b => (
          <span
            key={b.bucket}
            title={`${label(b.bucket)}: ${b.crashes}`}
            className={cn('flex-1 rounded-t-sm bg-[var(--color-primary)]', b.bucket !== peak && 'opacity-50')}
            style={{ height: `${Math.max(2, (b.crashes / biggest) * 100)}%` }}
          />
        ))}
      </div>

      <div className="mt-1 flex gap-0.5 text-xs text-[var(--color-muted)] tabular-nums">
        {buckets.map((b, i) => (
          <span key={b.bucket} className="flex-1 text-center whitespace-nowrap">
            {i % labelEvery === 0 ? label(b.bucket) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Crashes by hour of day and weekday, with the peak of each called out. */
export default function TimeSection({ year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const time = useQuery(roadSafetyTimeQuery(year))
  const locale = toIntlLocale(i18n.language)

  if (time.isError) return null
  if (!time.data) return <SectionSkeleton />

  const peakHour = peakBucket(time.data.hours)
  const peakWeekday = peakBucket(time.data.weekdays)
  if (!peakHour && !peakWeekday) return null

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-base font-semibold">{t('roadSafety.time.title')}</h2>

      <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {peakHour && (
          <span>
            {t('roadSafety.time.peakHour')}: <strong>{hourLabel(peakHour.bucket)}</strong>
          </span>
        )}

        {peakWeekday && (
          <span>
            {t('roadSafety.time.peakWeekday')}: <strong>{weekdayLabel(peakWeekday.bucket, locale)}</strong>
          </span>
        )}
      </p>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {peakHour && (
          <Columns
            buckets={fillBuckets(time.data.hours, 0, 23)}
            label={String}
            ariaLabel={t('roadSafety.time.byHour')}
            peak={peakHour.bucket}
            labelEvery={3}
          />
        )}

        {peakWeekday && (
          <Columns
            buckets={fillBuckets(time.data.weekdays, 1, 7)}
            label={n => weekdayLabel(n, locale)}
            ariaLabel={t('roadSafety.time.byWeekday')}
            peak={peakWeekday.bucket}
          />
        )}
      </div>
    </Card>
  )
}
