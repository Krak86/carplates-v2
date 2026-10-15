import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

type Props = {
  /** Registry `person` flag of the record: 'P' private person, anything else a legal entity. */
  person: string | null
}

const OWNER_TYPES = [
  { key: 'private', code: 'P' },
  { key: 'legal', code: 'J' }
] as const

/** The two registry owner types with their share of the registry, this vehicle's one highlighted -- body of the Owner row's help popover. */
export default function OwnerInfo({ person }: Props): ReactNode {
  const { t } = useTranslation()
  const currentCode = person === 'P' ? 'P' : 'J'

  return (
    <>
      <ul className="mt-2 flex flex-col gap-2">
        {OWNER_TYPES.map(({ key, code }) => (
          <li key={key} className={cn('rounded px-1.5 py-1', code === currentCode && 'bg-[var(--color-primary)]/15')}>
            <p className="font-medium">{t(`ownerType.${key}`)}</p>
            <p className="text-xs text-[var(--color-muted)]">{t(`ownerType.${key}.desc`)}</p>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-[var(--color-muted)]">{t('ownerType.why')}</p>
    </>
  )
}
