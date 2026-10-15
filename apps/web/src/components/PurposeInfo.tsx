import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { VEHICLE_PURPOSES, sourceValueForPurpose } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  /** Raw registry `purpose` of the record ("ЗАГАЛЬНИЙ"), highlighted in the list. */
  current: string | null
}

/** The three registry purposes and what they mean, this vehicle's one highlighted -- body of the Purpose row's help popover. */
export default function PurposeInfo({ current }: Props): ReactNode {
  const { t } = useTranslation()
  const currentValue = current?.trim().toUpperCase()

  return (
    <ul className="mt-2 flex flex-col gap-2">
      {VEHICLE_PURPOSES.map(p => (
        <li
          key={p}
          className={cn(
            'rounded px-1.5 py-1',
            sourceValueForPurpose(p) === currentValue && 'bg-[var(--color-primary)]/15'
          )}
        >
          <p className="font-medium">{t(`vehiclePurpose.${p}`)}</p>
          <p className="text-xs text-[var(--color-muted)]">{t(`vehiclePurposeDesc.${p}`)}</p>
        </li>
      ))}
    </ul>
  )
}
