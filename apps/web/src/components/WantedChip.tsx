import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import ChipChevronButton from '@/components/ChipChevronButton'
import { wantedQuery } from '@/lib/queries'

type Props = {
  plate: string | null
  vin: string | null
  /** Opens (and scrolls to) the Wanted section. */
  onOpen: () => void
}

/**
 * Red "🚨 Wanted" header chip, shown only while the plate / VIN is on the police list — the answer must not hide in a
 * collapsed section. Shares its query with `WantedCheck`, so it costs no extra request.
 */
export default function WantedChip({ plate, vin, onOpen }: Props): ReactNode {
  const { t } = useTranslation()
  const { data } = useQuery({ ...wantedQuery(plate, vin), enabled: !!plate || !!vin })
  if (!data?.wanted && !data?.plateWanted) return null

  return (
    <>
      {data.wanted && (
        <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border border-red-500 bg-red-500/15 py-0.5 pr-1 pl-2 text-xs font-semibold text-red-700 dark:text-red-300">
          <span title={t('wanted.chipTitle')} className="inline-flex items-center gap-1">
            <span aria-hidden>🚨</span>
            {t('wanted.chip.wanted')}
          </span>
          <ChipChevronButton label={t('wanted.chipTitle')} onClick={onOpen} />
        </span>
      )}

      {/* Amber, not red: the plate alone is wanted, which does not prove this car is stolen. */}
      {data.plateWanted && (
        <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border border-amber-500 bg-amber-500/15 py-0.5 pr-1 pl-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <span title={t('wanted.chip.garpunTitle')} className="inline-flex items-center gap-1">
            <span aria-hidden>🔎</span>
            {t('wanted.chip.garpun')}
          </span>
          <ChipChevronButton label={t('wanted.chip.garpunTitle')} onClick={onOpen} />
        </span>
      )}
    </>
  )
}
