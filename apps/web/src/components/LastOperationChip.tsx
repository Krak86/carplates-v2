import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import InfoPopover from '@/components/InfoPopover'
import { cn } from '@/lib/cn'
import { OPER_STATUS_ICON, type OperStatus, operInfoKey, operStatus } from '@/lib/oper-info'

type Props = {
  operCode: number | null
  operName: string | null
  /** ISO date of the last operation. */
  dReg: string | null
  /** Given for a car with a valid VIN: an "imported" status then opens the Auction history section instead of searching. */
  onOpenAuctions?: () => void
  /** The vehicle's whole history holds a used import. Adds a second chip when the last operation is not that import. */
  everImported?: boolean
}

/** Statuses that are timeline categories reuse that explanation; the rest have their own `oper.statusInfo.*`. */
const CATEGORY_INFO: Partial<Record<OperStatus, string>> = {
  new: 'new',
  import: 'import',
  owner: 'owner',
  modification: 'modification',
  deregistered: 'deregistered',
  other: 'noise'
}

/**
 * Short "what happened last" chip (🔁 New owner · 2024) so the registration status is visible without opening the
 * history, with a ❓ explaining the operation. Built from the plate payload itself — no extra request, so it renders
 * with the card. The label links to Advanced search filtered to the same status.
 */
export default function LastOperationChip({
  operCode,
  operName,
  dReg,
  onOpenAuctions,
  everImported
}: Props): ReactNode {
  const { t } = useTranslation()
  const status = operCode == null ? null : operStatus(operCode)
  const earlierChip = everImported && status !== 'import' && (
    <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone py-0.5 pr-1 pl-2 text-xs text-[var(--color-fg)] transition-colors chip-registry">
      {onOpenAuctions ? (
        <button
          type="button"
          onClick={onOpenAuctions}
          title={t('auctions.earlierChipTitle')}
          className="inline-flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
        >
          <span aria-hidden>{OPER_STATUS_ICON.import}</span>
          {t('auctions.earlierChip')}
          <span aria-hidden>↓</span>
        </button>
      ) : (
        <span title={t('auctions.earlierChipTitle')} className="inline-flex items-center gap-1">
          <span aria-hidden>{OPER_STATUS_ICON.import}</span>
          {t('auctions.earlierChip')}
        </span>
      )}
    </span>
  )
  if (operCode == null || status == null) return earlierChip || null
  const year = dReg?.slice(0, 4)
  const categoryInfo = CATEGORY_INFO[status]
  const opensAuctions = status === 'import' && !!onOpenAuctions
  const label = (
    <>
      <span aria-hidden>{OPER_STATUS_ICON[status]}</span>
      {t(`oper.status.${status}`)}
      {year && <span className="text-[var(--color-muted)]">· {year}</span>}
    </>
  )

  return (
    <>
      <span
        className={cn(
          'inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone py-0.5 pr-1 pl-2 text-xs text-[var(--color-fg)] transition-colors chip-registry'
        )}
      >
        {opensAuctions ? (
          <button
            type="button"
            onClick={onOpenAuctions}
            title={t('auctions.chipTitle')}
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
          >
            {label}
            <span aria-hidden>↓</span>
          </button>
        ) : (
          <Link
            viewTransition
            to={`/advanced-search?oper=${operCode}`}
            title={t('oper.statusFindSame')}
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
          >
            {label}
          </Link>
        )}

        <InfoPopover label={t('oper.infoLabel')} title={t('oper.statusLast')}>
          <p className="m-0 font-medium">
            {OPER_STATUS_ICON[status]} {t(`oper.status.${status}`)}
          </p>
          <p className="mt-1.5 mb-0">
            {categoryInfo ? t(`oper.catInfo.${categoryInfo}`) : t(`oper.statusInfo.${status}`)}
          </p>
          <p className="mt-2 mb-0">{t(operInfoKey(operCode))}</p>
          {operName && <p className="mt-2 mb-0 border-l-2 border-[var(--color-border)] pl-2 text-sm">{operName}</p>}
          <p className="mt-1.5 mb-0 text-xs text-[var(--color-muted)]">
            {[dReg, `${t('oper.code')}: ${operCode}`].filter(Boolean).join(' · ')}
          </p>
        </InfoPopover>
      </span>
      {earlierChip}
    </>
  )
}
