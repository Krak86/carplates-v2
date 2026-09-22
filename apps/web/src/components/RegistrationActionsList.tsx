import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Registration } from '@carplates/shared'

import { depMapsUrl } from '@/lib/maps'

type Props = {
  actions: Registration[]
  /** The plate already shown on this page — its own rows render as plain text, not a link to itself. */
  currentPlate?: string
}

export default function RegistrationActionsList({ actions, currentPlate }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {actions.map(action => (
        <div key={`${action.dReg}-${action.operCode}`} className="py-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--color-muted)]">{action.dReg ?? '—'}</span>
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
          {(action.operName ?? action.dep) && (
            <div className="mt-0.5 text-xs text-[var(--color-muted)]">
              {action.dep && (
                <a
                  href={depMapsUrl(action.dep)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] underline"
                >
                  {action.dep}
                </a>
              )}
              {action.operName && action.dep && ' · '}
              {action.operName}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
