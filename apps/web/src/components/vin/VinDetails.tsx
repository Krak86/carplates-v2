import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VinDecodeResponse } from '@carplates/shared'

import SectionCount from '@/components/SectionCount'
import VinFieldRow from '@/components/vin/VinFieldRow'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { groupFields } from '@/components/vin/helpers'
import type { VinGroup } from '@/components/vin/types'

type Props = {
  results: VinDecodeResponse['results']
}

const OPEN_BY_DEFAULT: ReadonlySet<VinGroup> = new Set(['engine', 'safety'])

/** Every decoded field with a real value, bucketed into collapsible sections. Empty / "Not Applicable" rows never appear here. */
export default function VinDetails({ results }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div>
      {groupFields(results).map(({ group, rows }) => (
        <VinToggleSection
          key={group}
          nested
          icon="📂"
          defaultOpen={OPEN_BY_DEFAULT.has(group)}
          showLabel={t('vin.group.show')}
          hideLabel={t('vin.group.hide')}
          title={
            <>
              {t(`vin.group.${group}`)} <SectionCount count={rows.length} />
            </>
          }
        >
          <dl className="divide-y divide-[var(--color-border)]">
            {rows.map(r => (
              <VinFieldRow key={r.variable} row={r} />
            ))}
          </dl>
        </VinToggleSection>
      ))}
    </div>
  )
}
