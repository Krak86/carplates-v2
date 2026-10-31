import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  denormalizePlate,
  stolenInUaUrl,
  WANTED_PLATES_DATASET_URL,
  WANTED_VEHICLES_DATASET_URL
} from '@carplates/shared'
import type { WantedPlate, WantedRecord } from '@carplates/shared'

import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { cn } from '@/lib/cn'
import { wantedVerdict } from '@/lib/export-verify'
import { toIntlLocale } from '@/lib/intl'
import { depMapsUrl } from '@/lib/maps'
import { wantedQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  plate: string | null
  vin: string | null
  /** Bumped by the header chip: each change opens the section and scrolls to it (0 = never asked). */
  openSignal?: number
}

const LINK_CLASS = 'text-[var(--color-primary)] underline'

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[var(--color-muted)]">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  )
}

function WantedRecordCard({ record }: { record: WantedRecord }): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const date = (iso: string | null): string | null => (iso ? new Date(iso).toLocaleDateString(locale) : null)
  const isWanted = record.status === 'wanted'

  return (
    <li
      className={cn(
        'rounded-lg border p-3 text-sm',
        isWanted ? 'border-red-500/60 bg-red-500/10' : 'border-[var(--color-border)] bg-[var(--color-border)]/20'
      )}
    >
      <p className="font-semibold">
        {isWanted ? '🚨 ' : '✔️ '}
        {isWanted ? t('wanted.status.wanted') : t('wanted.status.removed')}
        {` · ${t(`wanted.by.${record.matchedBy}`)}`}
      </p>

      <dl className="mt-1.5 space-y-0.5">
        <Row label={t('wanted.vehicle')} value={[record.brand, record.model].filter(Boolean).join(' ') || null} />
        <Row label={t('wanted.color')} value={record.color} />
        <Row label={t('wanted.plate')} value={record.plate} />
        <Row label={t('wanted.vin')} value={record.vin} />
        <Row label={t('wanted.seizedAt')} value={date(record.seizedAt)} />
        <Row label={t('wanted.registeredAt')} value={date(record.registeredAt)} />
        <Row
          label={t('wanted.organ')}
          value={
            record.organUnit && (
              <>
                {record.organUnit}{' '}
                <a
                  href={depMapsUrl(record.organUnit)}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={LINK_CLASS + ' whitespace-nowrap'}
                >
                  📍 {t('wanted.map')} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
                </a>
              </>
            )
          }
        />
        <Row
          label={t('wanted.removedAt')}
          value={record.removedExact === false ? t('wanted.removedUnknown') : date(record.removedAt)}
        />
      </dl>

      {!isWanted && <p className="mt-1.5 text-[var(--color-muted)]">{t('wanted.removedNote')}</p>}
    </li>
  )
}

function WantedPlateCard({ record }: { record: WantedPlate }): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const date = (iso: string | null): string | null => (iso ? new Date(iso).toLocaleDateString(locale) : null)
  const isWanted = record.status === 'wanted'

  return (
    <li
      className={cn(
        'rounded-lg border p-3 text-sm',
        isWanted ? 'border-amber-500/60 bg-amber-500/10' : 'border-[var(--color-border)] bg-[var(--color-border)]/20'
      )}
    >
      <p className="font-semibold">
        {isWanted ? '🔎 ' : '✔️ '}
        {t(`wanted.plates.status.${record.status}`)}
      </p>

      <dl className="mt-1.5 space-y-0.5">
        <Row label={t('wanted.plate')} value={record.plate} />
        <Row label={t('wanted.plates.reportedAt')} value={date(record.seizedAt)} />
        <Row label={t('wanted.registeredAt')} value={date(record.insertedAt)} />
        <Row
          label={t('wanted.organ')}
          value={
            record.organUnit && (
              <>
                {record.organUnit}{' '}
                <a
                  href={depMapsUrl(record.organUnit)}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={LINK_CLASS + ' whitespace-nowrap'}
                >
                  📍 {t('wanted.map')} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
                </a>
              </>
            )
          }
        />
        <Row label={t('wanted.removedAt')} value={date(record.removedAt)} />
      </dl>

      {!isWanted && <p className="mt-1.5 text-[var(--color-muted)]">{t('wanted.removedNote')}</p>}
    </li>
  )
}

/**
 * Collapsed "Wanted (stolen)" section (shareable via `?section=wanted`): is this plate / VIN on the National Police list of
 * vehicles wanted for unlawful taking (vehicle records first) or the Garpun list of wanted plates (plate-only, not proof) — now,
 * and in the snapshots we kept. Opens by itself when there is a record. The title
 * chip is the answer at a glance. A link to stolen.in.ua (same open data) is the manual check.
 */
export default function WantedCheck({ plate, vin, openSignal = 0 }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'wanted'
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data, isError } = useQuery({ ...wantedQuery(plate, vin), enabled: !!plate || !!vin })
  const title = t('wanted.title')

  useEffect(() => {
    if ((isShared || openSignal > 0) && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, openSignal])

  const records = data?.records ?? []
  const plates = data?.plates ?? []
  const verdict = !data ? null : wantedVerdict(data)
  const locale = toIntlLocale(i18n.language)
  const stolenUrl = plate ? stolenInUaUrl(denormalizePlate(plate)) : null

  return (
    <VinToggleSection
      ref={sectionRef}
      icon="🚨"
      title={
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          {title}
          {verdict && (
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs font-normal max-sm:w-fit max-sm:basis-full',
                verdict === 'wanted'
                  ? 'border-red-500 bg-red-500/15 font-semibold text-red-700 dark:text-red-300'
                  : 'border-[var(--color-border)]'
              )}
            >
              {t(`wanted.chip.${verdict}`)}
            </span>
          )}
        </span>
      }
      info={<SectionInfo section="wanted" title={title} />}
      actions={<ShareButton section="wanted" label={t('share.button', { section: title })} />}
      showLabel={t('wanted.show')}
      hideLabel={t('wanted.hide')}
      defaultOpen={isShared}
      openSignal={openSignal + (records.length > 0 || plates.length > 0 ? 1 : 0)}
    >
      {isError && <p className="mb-2 text-sm text-[var(--color-muted)]">{t('wanted.error')}</p>}

      {data && records.length === 0 && plates.length === 0 && <p className="mb-2 text-sm">✅ {t('wanted.clear')}</p>}

      {records.length > 0 && (
        <ul className="mb-2 space-y-2">
          {records.map(record => (
            <WantedRecordCard key={record.id} record={record} />
          ))}
        </ul>
      )}

      {plates.length > 0 && (
        <section className="mb-2">
          <h4 className="mb-1.5 text-sm font-semibold">{t('wanted.plates.heading')}</h4>
          <ul className="space-y-2">
            {plates.map(record => (
              <WantedPlateCard key={record.id} record={record} />
            ))}
          </ul>
          {data?.plateWanted && <p className="mt-1.5 text-sm font-medium">{t('wanted.plates.warning')}</p>}
        </section>
      )}

      {data && (
        <p className="text-sm text-[var(--color-muted)]">
          {data.checkedAt
            ? t('wanted.checkedAt', { date: new Date(data.checkedAt).toLocaleString(locale) })
            : t('wanted.neverLoaded')}
          {data.trackedSince &&
            ` ${t(data.historySource ? 'wanted.historySince' : 'wanted.trackedSince', {
              date: new Date(data.trackedSince).toLocaleDateString(locale)
            })}`}
        </p>
      )}

      <p className="mt-2 text-sm text-[var(--color-muted)]">{t('wanted.explainer')}</p>

      <p className="mt-2 text-sm text-[var(--color-muted)]">{t('wanted.note')}</p>

      <ul className="mt-2 space-y-1 text-sm">
        {stolenUrl && (
          <li>
            <a href={stolenUrl} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
              stolen.in.ua ↗
            </a>{' '}
            <span className="text-[var(--color-muted)]">{t('wanted.link.stolen')}</span>
            <span className="sr-only">{t('field.opensNewTab')}</span>
          </li>
        )}
        <li>
          <a
            href={WANTED_VEHICLES_DATASET_URL}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={LINK_CLASS}
          >
            data.gov.ua ↗
          </a>{' '}
          <span className="text-[var(--color-muted)]">{t('wanted.link.dataset')}</span>
          <span className="sr-only">{t('field.opensNewTab')}</span>
        </li>
        <li>
          <a href={WANTED_PLATES_DATASET_URL} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
            data.gov.ua ↗
          </a>{' '}
          <span className="text-[var(--color-muted)]">{t('wanted.link.garpun')}</span>
          <span className="sr-only">{t('field.opensNewTab')}</span>
        </li>
        <li>
          <Link viewTransition to="/wanted" className={LINK_CLASS}>
            {t('wanted.stats.viewLink')} →
          </Link>
        </li>
      </ul>
    </VinToggleSection>
  )
}
