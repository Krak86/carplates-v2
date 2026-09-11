import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { PlateLookupResponse } from '@carplates/shared'

import Card from '@/components/ui/Card'

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
  const c = data.current
  // A pure EV has no engine capacity — power_kwt (2026+ only) is its only engine
  // figure, so it takes the capacity row's place instead of being hidden.
  const hasCapacity = c.capacity != null
  const engineLabel = hasCapacity ? t('field.capacity') : t('field.power')
  const engineValue = hasCapacity ? c.capacity : c.powerKwt

  return (
    <Card className="w-full max-w-xl">
      <div className="mb-3">
        <div className="text-lg font-semibold">
          {[c.brand, c.model].filter(Boolean).join(' ')} {c.makeYear ? `(${c.makeYear})` : ''}
        </div>
        <div className="text-sm text-[var(--color-muted)]">
          {data.plate}
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

      {expanded && (
        <div className="mt-2 divide-y divide-[var(--color-border)]">
          <Row label={t('field.kind')} value={c.kind} />
          <Row label={t('field.purpose')} value={c.purpose} />
          {hasCapacity && <Row label={t('field.power')} value={c.powerKwt} />}
          <Row label={t('field.owner')} value={c.person === 'P' ? t('field.ownerPrivate') : t('field.ownerCompany')} />
          <Row label={t('field.regDate')} value={c.dReg} />
          <Row label={t('field.dep')} value={c.dep} />
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
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-[var(--color-muted)]">{t('result.historyCount', { count: data.historyCount })}</span>
        <button type="button" onClick={() => setExpanded(v => !v)} className="text-[var(--color-primary)]">
          {expanded ? t('result.showLess') : t('result.showMore')}
        </button>
      </div>
    </Card>
  )
}
