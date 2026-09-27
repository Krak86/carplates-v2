import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlateCandidate } from '@carplates/shared'

import { cn } from '@/lib/cn'

type Props = {
  candidates: PlateCandidate[]
  active: string | null
  onSelect: (plate: string) => void
}

export default function PlateCandidates({ candidates, active, onSelect }: Props): ReactNode {
  const { t } = useTranslation()

  if (candidates.length < 2) return null

  return (
    <div className="flex w-full max-w-2xl flex-wrap items-center gap-2">
      <span className="text-sm text-[var(--color-muted)]">{t('recognize.alsoFound')}</span>
      {candidates.map(c => (
        <button
          key={c.plate}
          type="button"
          onClick={() => onSelect(c.plate)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm',
            c.plate === active
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'border-[var(--color-surface)] hover:bg-[var(--color-surface)]/20'
          )}
        >
          {c.plate}
        </button>
      ))}
    </div>
  )
}
