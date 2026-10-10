import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Currency } from '@carplates/shared'

import EstimatedValuePill from '@/components/EstimatedValuePill'
import { useEstimatedValue, type ValueInput } from '@/components/use-estimated-value'

// Hovering / focusing the chevron warms the section's chunk, so the scroll lands on a ready section.
const loadSection = (): Promise<typeof import('@/components/EstimatedValueSection')> =>
  import('@/components/EstimatedValueSection')

type Props = ValueInput & {
  currency: Currency
  /** The chevron: mount the Estimated value section, open it and scroll to it. */
  onOpenSection: () => void
}

/**
 * Green "~ € X–Y" chip in the card header: the EU value estimate (Dutch new price x depreciation curve) plus Ukrainian
 * customs. The chevron scrolls to the "Estimated value" section, which holds the breakdown, the NBU currency switch,
 * the per-fuel table and the charts. Shares the Specs block's `/api/rdw` query; renders nothing while loading, on error
 * or when there is no RDW price to start from.
 */
export default function EstimatedValueChip({ currency, onOpenSection, ...input }: Props): ReactNode {
  const { t } = useTranslation()
  const value = useEstimatedValue(input, currency)

  if (!value) return null

  return (
    <div className="mt-1.5">
      <EstimatedValuePill
        value={value}
        trailing={
          <button
            type="button"
            aria-label={t('value.ua.expand')}
            onClick={onOpenSection}
            onPointerEnter={() => void loadSection()}
            onFocus={() => void loadSection()}
            className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/30 dark:text-emerald-300"
          >
            <svg viewBox="0 0 12 12" aria-hidden className="size-3">
              <path
                d="M2 4.5 6 8.5 10 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        }
      />
    </div>
  )
}
