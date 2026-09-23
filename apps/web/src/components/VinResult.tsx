import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VinDecodeResponse } from '@carplates/shared'

import FavoriteButton from '@/components/FavoriteButton'
import RegistrationTimeline from '@/components/RegistrationTimeline'
import Card from '@/components/ui/Card'
import VinDecodeFields from '@/components/VinDecodeFields'

type Props = {
  data: VinDecodeResponse
}

export default function VinResult({ data }: Props): ReactNode {
  const { t } = useTranslation()
  const registry = data.registry

  return (
    <Card className="relative w-full max-w-xl">
      <FavoriteButton kind="vin" value={data.vin} label={null} className="absolute top-3 right-3" />

      <div className="mb-1 pr-8 text-lg font-semibold">{t('vin.title')}</div>
      <div className="mb-3 text-sm text-[var(--color-muted)]">{data.vin}</div>

      {registry && (
        <div className="mb-4">
          <div className="mb-1 text-sm font-semibold">{t('vin.registryTitle')}</div>
          <RegistrationTimeline actions={registry.actions} />
        </div>
      )}

      <VinDecodeFields results={data.results} />
      <p className="mt-3 text-xs text-[var(--color-muted)]">{t('vin.source')}</p>
    </Card>
  )
}
