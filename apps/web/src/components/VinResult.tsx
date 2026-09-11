import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { VinDecodeResponse } from '@carplates/shared'

import Card from '@/components/ui/Card'

type Props = {
  data: VinDecodeResponse
}

export default function VinResult({ data }: Props): ReactNode {
  const { t } = useTranslation()
  const registry = data.registry

  return (
    <Card className="w-full max-w-xl">
      <div className="mb-1 text-lg font-semibold">{t('vin.title')}</div>
      <div className="mb-3 text-sm text-[var(--color-muted)]">{data.vin}</div>

      {registry && (
        <div className="mb-4">
          <div className="mb-1 text-sm font-semibold">{t('vin.registryTitle')}</div>
          <div className="divide-y divide-[var(--color-border)]">
            {registry.actions.map(action => (
              <div
                key={`${action.dReg}-${action.operCode}`}
                className="flex items-center justify-between gap-4 py-1 text-sm"
              >
                <span className="text-[var(--color-muted)]">{action.dReg ?? '—'}</span>
                <span className="flex items-center gap-2 text-right font-medium">
                  {action.plate ? (
                    <Link to={`/${action.plate}`} className="text-[var(--color-primary)] underline">
                      {action.plate}
                    </Link>
                  ) : (
                    '—'
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
            ))}
          </div>
        </div>
      )}

      <dl className="divide-y divide-[var(--color-border)]">
        {data.results.map(r => (
          <div key={r.variable} className="flex justify-between gap-4 py-1 text-sm">
            <dt className="text-[var(--color-muted)]">{r.variable}</dt>
            <dd className="text-right font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-[var(--color-muted)]">{t('vin.source')}</p>
    </Card>
  )
}
