import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { PlateLookupResponse } from '@carplates/shared'

import FavoriteButton from '@/components/FavoriteButton'
import FieldInfoButton from '@/components/FieldInfoButton'
import RegistrationTimeline from '@/components/RegistrationTimeline'
import { getFuelIcon } from '@/components/ResultCard.helpers'
import Card from '@/components/ui/Card'
import VehiclePhotos from '@/components/VehiclePhotos'
import VinDecodeFields from '@/components/VinDecodeFields'
import { cn } from '@/lib/cn'
import { depMapsUrl } from '@/lib/maps'
import { plateHistoryQuery, vinQuery } from '@/lib/queries'

type Props = {
  data: PlateLookupResponse
}

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  if (value == null || value === '') return null
  return (
    <div className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export default function ResultCard({ data }: Props): ReactNode {
  const { t } = useTranslation()
  const [showMore, setShowMore] = useState(false)
  const c = data.current
  const hasVin = c.vin != null

  // A VIN's own registry rows cover every plate the car ever wore; a plate-scoped
  // history misses plates it wore before this one, so prefer VIN once we have it.
  const vinDetail = useQuery({ ...vinQuery(c.vin ?? ''), enabled: showMore && hasVin })
  const plateHistory = useQuery({ ...plateHistoryQuery(data.plate), enabled: showMore && !hasVin })
  const historyActions = hasVin ? vinDetail.data?.registry?.actions : plateHistory.data?.actions
  const isPending = hasVin ? vinDetail.isPending : plateHistory.isPending
  const isError = hasVin ? vinDetail.isError : plateHistory.isError

  // A pure EV has no engine capacity — power_kwt (2026+ only) is its only engine
  // figure, so it takes the capacity row's place instead of being hidden.
  const hasCapacity = c.capacity != null
  const engineLabel = hasCapacity ? t('field.capacity') : t('field.power')
  const engineValue = hasCapacity ? c.capacity : c.powerKwt

  return (
    <Card className="relative w-full max-w-2xl transition-shadow duration-200 hover:shadow-md">
      <FavoriteButton
        kind="plate"
        value={data.plate}
        label={[c.brand, c.model].filter(Boolean).join(' ') || null}
        className="absolute top-3 right-3"
      />

      <div className="mb-3 pr-8">
        <div className="text-xl font-semibold">
          {[c.brand, c.model].filter(Boolean).join(' ')} {c.makeYear ? `(${c.makeYear})` : ''}
        </div>
        <div className="text-base text-[var(--color-muted)]">
          <Link to={`/${data.plate}`} className="text-[var(--color-primary)] underline">
            {data.plate}
          </Link>
          {data.region ? `, ${data.region}` : ''}
          {c.plateInferred && (
            <span
              title={t('result.plateInferredHint')}
              className="ml-2 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs"
            >
              {t('result.plateInferred')}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        <Row
          label={t('field.body')}
          value={
            c.body && (
              <span className="inline-flex items-center gap-1.5">
                {c.body}
                <FieldInfoButton dimension="body" current={c.body} />
              </span>
            )
          }
        />
        <Row label={engineLabel} value={engineValue} />
        <Row
          label={t('field.color')}
          value={
            c.color && (
              <span className="inline-flex items-center gap-1.5">
                {c.color}
                <FieldInfoButton dimension="color" current={c.color} />
              </span>
            )
          }
        />
        <Row
          label={t('field.fuel')}
          value={
            c.fuel && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>{getFuelIcon(c.fuel)}</span>
                {c.fuel}
                <FieldInfoButton dimension="fuel" current={c.fuel} />
              </span>
            )
          }
        />
        <Row label={t('field.weight')} value={c.ownWeight && `${c.ownWeight} / ${c.totalWeight ?? '—'}`} />
        <Row
          label={t('field.kind')}
          value={
            c.kind && (
              <span className="inline-flex items-center gap-1.5">
                {c.kind}
                <FieldInfoButton dimension="kind" current={c.kind} />
              </span>
            )
          }
        />
        <Row label={t('field.purpose')} value={c.purpose} />
        {hasCapacity && <Row label={t('field.power')} value={c.powerKwt} />}
        <Row label={t('field.owner')} value={c.person === 'P' ? t('field.ownerPrivate') : t('field.ownerCompany')} />
        <Row label={t('field.regDate')} value={c.dReg} />
        <Row
          label={t('field.dep')}
          value={
            c.dep ? (
              <a
                href={depMapsUrl(c.dep)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] underline"
              >
                {c.dep}
              </a>
            ) : null
          }
        />
        <Row label={t('field.koatuu')} value={c.regAddrKoatuu} />
        <Row
          label={t('field.vin')}
          value={
            c.vin ? (
              <Link to={`/${c.vin}`} className="text-[var(--color-primary)] underline">
                {c.vin}
              </Link>
            ) : null
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-base">
        <span className="text-[var(--color-muted)]">{t('result.historyLabel')}</span>
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore(v => !v)}
          className="group flex items-center gap-1 text-[var(--color-primary)]"
        >
          <span aria-hidden>⚙️</span>
          <span className="underline group-hover:no-underline">
            {showMore ? t('result.showLess') : t('result.showMore')}
          </span>
          <span aria-hidden className={cn('inline-block transition-transform duration-200', showMore && 'rotate-180')}>
            ▾
          </span>
        </button>
      </div>

      <div
        aria-hidden={!showMore}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          showMore ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
            <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
              <span aria-hidden>🕘</span>
              {t('result.historyTitle')}
            </div>
            {isPending && <p className="text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
            {isError && <p className="text-base text-[var(--color-muted)]">{t('result.error')}</p>}
            {historyActions && <RegistrationTimeline actions={historyActions} currentPlate={data.plate} />}

            {hasVin && vinDetail.isSuccess && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
                  <span aria-hidden>🆔</span>
                  {t('vin.title')}
                </div>
                <VinDecodeFields results={vinDetail.data.results} />
                <p className="mt-2 text-sm text-[var(--color-muted)]">{t('vin.source')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <VehiclePhotos brand={c.brand} model={c.model} year={c.makeYear} />
    </Card>
  )
}
