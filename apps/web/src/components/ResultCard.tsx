import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { PlateLookupResponse } from '@carplates/shared'

import FavoriteButton from '@/components/FavoriteButton'
import RegistrationTimeline from '@/components/RegistrationTimeline'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { depMapsUrl } from '@/lib/maps'
import { plateHistoryQuery } from '@/lib/queries'

type Props = {
  data: PlateLookupResponse
}

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export default function ResultCard({ data }: Props): ReactNode {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const history = useQuery({ ...plateHistoryQuery(data.plate), enabled: showHistory })
  const c = data.current
  // A pure EV has no engine capacity — power_kwt (2026+ only) is its only engine
  // figure, so it takes the capacity row's place instead of being hidden.
  const hasCapacity = c.capacity != null
  const engineLabel = hasCapacity ? t('field.capacity') : t('field.power')
  const engineValue = hasCapacity ? c.capacity : c.powerKwt

  return (
    <Card className="relative w-full max-w-xl">
      <FavoriteButton
        kind="plate"
        value={data.plate}
        label={[c.brand, c.model].filter(Boolean).join(' ') || null}
        className="absolute top-3 right-3"
      />

      <div className="mb-3 pr-8">
        <div className="text-lg font-semibold">
          {[c.brand, c.model].filter(Boolean).join(' ')} {c.makeYear ? `(${c.makeYear})` : ''}
        </div>
        <div className="text-sm text-[var(--color-muted)]">
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
        <Row label={t('field.body')} value={c.body} />
        <Row label={engineLabel} value={engineValue} />
        <Row label={t('field.color')} value={c.color} />
        <Row label={t('field.fuel')} value={c.fuel} />
        <Row label={t('field.weight')} value={c.ownWeight && `${c.ownWeight} / ${c.totalWeight ?? '—'}`} />
      </div>

      <div
        aria-hidden={!expanded}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2 divide-y divide-[var(--color-border)]">
            <Row label={t('field.kind')} value={c.kind} />
            <Row label={t('field.purpose')} value={c.purpose} />
            {hasCapacity && <Row label={t('field.power')} value={c.powerKwt} />}
            <Row
              label={t('field.owner')}
              value={c.person === 'P' ? t('field.ownerPrivate') : t('field.ownerCompany')}
            />
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
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-[var(--color-muted)]">{t('result.historyCount', { count: data.historyCount })}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={showHistory}
            onClick={() => setShowHistory(v => !v)}
            className="group flex items-center gap-1 text-[var(--color-primary)]"
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6.25" />
              <path d="M8 4.5V8l2.5 1.5" />
            </svg>
            <span className="underline group-hover:no-underline">{t('result.historyTitle')}</span>
            <span
              aria-hidden
              className={cn('inline-block transition-transform duration-200', showHistory && 'rotate-180')}
            >
              ▾
            </span>
          </button>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(v => !v)}
            className="text-[var(--color-primary)] underline hover:no-underline"
          >
            {expanded ? t('result.showLess') : t('result.showMore')}
          </button>
        </div>
      </div>

      <div
        aria-hidden={!showHistory}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          showHistory ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
            {history.isPending && <p className="text-sm text-[var(--color-muted)]">{t('result.loading')}</p>}
            {history.isError && <p className="text-sm text-[var(--color-muted)]">{t('result.error')}</p>}
            {history.isSuccess && <RegistrationTimeline actions={history.data.actions} currentPlate={data.plate} />}
          </div>
        </div>
      </div>
    </Card>
  )
}
