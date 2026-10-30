import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import { gsr2Baseline, gsr2Stages } from '@/components/vin/gsr2'
import VinEuBaseline from '@/components/vin/VinEuBaseline'
import { rdwQuery } from '@/lib/queries'

type Props = {
  brand: string
  model: string
  year: number | null
  kind?: string | null
}

/**
 * EU legal baseline for a decoded VIN. A VIN has no registration date, so the model year stands in, and only when the NL
 * register knows the model (an EU-market car) - the same condition as on the plate card.
 */
export default function VinTypicalEuBaseline({ brand, model, year, kind }: Props): ReactNode {
  const { data } = useQuery({
    ...rdwQuery(brand, model, year ?? 0, kind),
    enabled: !!(brand && model && year)
  })
  if (!data?.match) return null
  // VinEuBaseline renders nothing for a year with no stages; don't leave an empty dashed box behind
  if (gsr2Stages(gsr2Baseline(year)).length === 0) return null

  return (
    <div className="mt-4 rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-2">
      <VinEuBaseline year={year} />
    </div>
  )
}
