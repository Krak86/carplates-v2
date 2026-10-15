import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useCardJump } from '@/components/card-jump'
import { hasSpecGroup, type SpecGroup } from '@/components/RdwSpecs.helpers'
import SpecGroupJump from '@/components/SpecGroupJump'
import { rdwQuery } from '@/lib/queries'

type Props = {
  group: SpecGroup
  brand: string | null
  model: string | null
  year: number | null
  kind?: string | null
  fuel?: string | null
}

/** "↑ Specs: New price (NL) — …" inside a deeper section: back to the Specs group it grew from. Hidden without that group. */
export default function SpecsJumpLink({ group, brand, model, year, kind, fuel }: Props): ReactNode {
  const jump = useCardJump()
  const { data } = useQuery({
    ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: !!(brand && model && year) && !!jump
  })
  const specs = data?.match?.specs
  if (!jump || !specs || !hasSpecGroup(specs, group, fuel)) return null

  return <SpecGroupJump section={`specs-${group}`} arrow="↑" onJump={jump} />
}
