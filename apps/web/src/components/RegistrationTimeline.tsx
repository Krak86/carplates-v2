import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { regionName } from '@carplates/shared'
import type { Registration } from '@carplates/shared'

import { cn } from '@/lib/cn'
import { depMapsUrl } from '@/lib/maps'

type Props = {
  actions: Registration[]
  /** The plate already shown on this page — its own rows render as plain text, not a link to itself. */
  currentPlate?: string
}

/**
 * Registration actions as a shipping-style vertical timeline: a point + connecting arrow per step.
 * `actions` arrives newest-first (the API's history order) and is rendered in that order, latest on
 * top — but the connecting arrows point up, since that's the direction the dates actually run in
 * (each step is newer than the one below it).
 */
export default function RegistrationTimeline({ actions, currentPlate }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <ol className="m-0 list-none p-0">
      {actions.map((action, index) => {
        const isLast = index === actions.length - 1
        // Foreign/transit prefixes and plateless (2026+) rows have no oblast match — say so rather than going blank.
        const region = (action.plate && regionName(action.plate)) || t('result.regionUnknown')

        return (
          <li key={`${action.dReg}-${action.operCode}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  'mt-1 h-3 w-3 shrink-0 rounded-full border-2',
                  index === 0
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                )}
              />
              {!isLast && (
                <span aria-hidden className="relative w-px flex-1 bg-[var(--color-border)]">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none text-[var(--color-muted)]">
                    ▴
                  </span>
                </span>
              )}
            </div>

            <div className={cn('min-w-0 flex-1 text-sm', !isLast && 'pb-4')}>
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">{action.dReg ?? '—'}</span>
                <span className="flex items-center gap-2 text-right font-medium">
                  {!action.plate ? (
                    '—'
                  ) : action.plate === currentPlate ? (
                    action.plate
                  ) : (
                    <Link to={`/${action.plate}`} className="text-[var(--color-primary)] underline">
                      {action.plate}
                    </Link>
                  )}
                  {action.plateInferred && (
                    <span
                      title={t('result.plateInferredHint')}
                      className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs"
                    >
                      {t('result.plateInferred')}
                    </span>
                  )}
                </span>
              </div>

              <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                {region}
                {action.dep && (
                  <>
                    {' · '}
                    <a
                      href={depMapsUrl(action.dep)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] underline"
                    >
                      {action.dep}
                    </a>
                  </>
                )}
              </div>

              {action.operName && <div className="mt-0.5 text-xs text-[var(--color-muted)]">{action.operName}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
