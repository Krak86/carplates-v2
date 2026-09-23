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
    <Card className="relative w-full max-w-2xl transition-shadow duration-200 hover:shadow-md">
      <FavoriteButton kind="vin" value={data.vin} label={null} className="absolute top-3 right-3" />

      <div className="mb-1 flex items-center gap-1.5 pr-8 text-xl font-semibold">
        <span aria-hidden>🆔</span>
        {t('vin.title')}
      </div>
      <div className="mb-3 text-base text-[var(--color-muted)]">{data.vin}</div>

      {registry && (
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">
            <span aria-hidden>🕘</span>
            {t('vin.registryTitle')}
          </div>
          <RegistrationTimeline actions={registry.actions} />
        </div>
      )}

      <VinDecodeFields results={data.results} />
      <p className="mt-3 text-sm text-[var(--color-muted)]">{t('vin.source')}</p>
    </Card>
  )
}
