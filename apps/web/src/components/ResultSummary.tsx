import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { SUMMARY_TARGET } from '@/components/ResultSummary.helpers'
import type { SummaryCard, SummaryState } from '@/components/ResultSummary.types'
import { useResultSummary } from '@/components/use-result-summary'
import { cn } from '@/lib/cn'
import type { ShareSection } from '@/lib/share-section'

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
  /** Opens the section a tile leads to and scrolls there. */
  onOpen: (target: ShareSection) => void
}

/** Tiles shown on a phone before "Show more". */
const MOBILE_TILES = 2

/** Icon + tone per state. "No data" is dashed and untinted so it never reads like "no problems found". */
const STATE_STYLE: Record<SummaryState, { icon: string; className: string }> = {
  attention: { icon: '⚠️', className: 'chip-tone chip-attention' },
  ok: { icon: '✓', className: 'chip-tone chip-registry' },
  other: { icon: 'ℹ', className: 'border-dashed border-primary/50' },
  nodata: { icon: '?', className: 'border-dashed border-[var(--color-border)]' },
  pending: { icon: '…', className: 'border-[var(--color-border)]' }
}

function SummaryCardView({
  card,
  onOpen,
  className
}: {
  card: SummaryCard
  onOpen: (target: ShareSection) => void
  className?: string
}): ReactNode {
  const { t } = useTranslation()
  const style = STATE_STYLE[card.state]
  const params = { ...card.params }
  for (const [name, key] of Object.entries(card.paramKeys ?? {})) params[name] = t(key)

  const label = t(`summary.card.${card.id}`)

  return (
    <li data-state={card.state} className={cn('flex min-w-0', className)}>
      <button
        type="button"
        title={t('summary.tileOpen', { section: label })}
        onClick={() => onOpen(SUMMARY_TARGET[card.id])}
        className={cn(
          'flex w-full min-w-0 cursor-pointer flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors hover:brightness-110',
          style.className
        )}
      >
        <span className="flex items-center justify-between gap-1 text-[var(--color-muted)]">
          {label}
          <span aria-hidden>›</span>
        </span>
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
      </button>
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
  const { onOpen, ...query } = props
  const cards = useResultSummary(query)
  // Phones show the first tiles only; the rest sit behind "Show more" (`sm` and up always shows all six).
  const [moreTiles, setMoreTiles] = useState(false)

  return (
    <section aria-label={t('summary.title')} className="mt-3">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((card, index) => (
          <SummaryCardView
            key={card.id}
            card={card}
            onOpen={onOpen}
            className={cn(index >= MOBILE_TILES && !moreTiles && 'max-sm:hidden')}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setMoreTiles(v => !v)}
        aria-expanded={moreTiles}
        className="mt-2 w-full cursor-pointer rounded-lg border border-[var(--color-border)] py-1 text-xs font-medium hover:bg-primary/10 sm:hidden"
      >
        {moreTiles ? t('summary.showLess') : t('summary.showMore')}
      </button>
      <p className="mt-1.5 text-xs text-[var(--color-muted)]">{t('summary.note')}</p>
    </section>
  )
}
