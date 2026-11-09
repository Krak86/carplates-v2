import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { SummaryCard, SummaryState } from '@/components/ResultSummary.types'
import { useResultSummary } from '@/components/use-result-summary'
import { cn } from '@/lib/cn'

type Props = {
  plate: string | null
  vin: string | null
  brand: string | null
  model: string | null
  year: number | null
  kind: string | null
  fuel: string | null
  capacity: number | null
  body: string | null
  operCode: number | null
  dReg: string | null
}

/** Icon + tone per state. "No data" is dashed and untinted so it never reads like "no problems found". */
const STATE_STYLE: Record<SummaryState, { icon: string; className: string }> = {
  attention: { icon: '⚠️', className: 'chip-tone chip-attention' },
  ok: { icon: '✓', className: 'chip-tone chip-registry' },
  nodata: { icon: '?', className: 'border-dashed border-[var(--color-border)]' },
  pending: { icon: '…', className: 'border-[var(--color-border)]' }
}

function SummaryCardView({ card }: { card: SummaryCard }): ReactNode {
  const { t } = useTranslation()
  const style = STATE_STYLE[card.state]
  const params = { ...card.params }
  for (const [name, key] of Object.entries(card.paramKeys ?? {})) params[name] = t(key)

  return (
    <li
      data-state={card.state}
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
        style.className
      )}
    >
      <span className="text-[var(--color-muted)]">{t(`summary.card.${card.id}`)}</span>
      {card.state === 'pending' ? (
        <span aria-hidden className="mt-0.5 h-4 w-3/4 animate-pulse rounded bg-border" />
      ) : (
        <>
          <span className="flex items-center gap-1 font-semibold">
            <span aria-hidden>{style.icon}</span>
            {t(`summary.state.${card.state}`)}
          </span>
          {card.textKey && <span className="text-[var(--color-muted)]">{t(card.textKey, params)}</span>}
        </>
      )}
    </li>
  )
}

/**
 * Report-style strip at the top of the result card: one small card per check, each "Attention", "No problems found" or
 * "No data". Everything comes from queries the sections below already run (see `useResultSummary`). The wording never
 * says the car is fine: a card says what was searched and when, and an absent answer is "No data".
 */
export default function ResultSummary(props: Props): ReactNode {
  const { t } = useTranslation()
  const cards = useResultSummary(props)

  return (
    <section aria-label={t('summary.title')} className="mt-3">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map(card => (
          <SummaryCardView key={card.id} card={card} />
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-[var(--color-muted)]">{t('summary.note')}</p>
    </section>
  )
}
