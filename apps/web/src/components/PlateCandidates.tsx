import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlateCandidate } from '@carplates/shared'

import { groupCandidates, needsGrouping } from '@/components/plate-groups'
import { cn } from '@/lib/cn'

type Props = {
  candidates: PlateCandidate[]
  active: string | null
  onSelect: (plate: string) => void
}

/** Two chain links: joins the alternative readings of one plate. */
function ChainIcon(): ReactNode {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0 opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  )
}

export default function PlateCandidates({ candidates, active, onSelect }: Props): ReactNode {
  const { t } = useTranslation()

  if (candidates.length < 2) return null

  const groups = groupCandidates(candidates)
  const grouped = needsGrouping(groups)
  // One plate with other possible readings: say so, instead of the "also found" of separate plates.
  const labelKey = groups.length === 1 ? 'recognize.sameCarReads' : 'recognize.alsoFound'

  return (
    <div className="flex w-full max-w-content flex-wrap items-center gap-2 rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)]/80 px-2.5 py-1.5 backdrop-blur-sm">
      <span className="text-sm font-medium text-[var(--color-fg)]">{t(labelKey)}</span>
      {groups.map(group => (
        <span
          key={group.index}
          role="group"
          aria-label={t('recognize.plateN', { n: group.index + 1 })}
          style={grouped ? { borderColor: group.color } : undefined}
          className={cn('inline-flex items-center gap-1', grouped && 'rounded-full border-2 p-0.5')}
        >
          {grouped && groups.length > 1 && (
            <span
              aria-hidden
              style={{ backgroundColor: group.color }}
              className="ml-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs leading-none font-bold text-black"
            >
              {group.index + 1}
            </span>
          )}
          {group.candidates.map((c, i) => (
            <span key={c.plate} className="inline-flex items-center gap-1">
              {i > 0 && (
                <span title={t('recognize.sameCarReads')} className="text-[var(--color-fg)]">
                  <ChainIcon />
                </span>
              )}
              <button
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
            </span>
          ))}
        </span>
      ))}
    </div>
  )
}
