import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VinDecodeResponse } from '@carplates/shared'

import Card from '@/components/ui/Card'

type Props = {
  data: VinDecodeResponse
}

export default function VinResult({ data }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <Card className="w-full max-w-xl">
      <div className="mb-1 text-lg font-semibold">{t('vin.title')}</div>
      <div className="mb-3 text-sm text-[var(--color-muted)]">{data.vin}</div>
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
