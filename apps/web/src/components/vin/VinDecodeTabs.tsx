import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VinDecodeResponse } from '@carplates/shared'

import VinDecodeFields from '@/components/VinDecodeFields'
import VinBarcode from '@/components/vin/VinBarcode'
import VinOverview from '@/components/vin/VinOverview'
import { cn } from '@/lib/cn'

type Props = {
  data: VinDecodeResponse
  /** Show the VIN barcode + text + copy button as the first row (the plate card; the VIN page has it in its header). */
  withBarcode?: boolean
}

const VIEWS = ['overview', 'raw'] as const
type View = (typeof VIEWS)[number]

/** Overview | Raw data switcher over a VIN decode — shared by the VIN page and the plate card's VIN section. */
export default function VinDecodeTabs({ data, withBarcode }: Props): ReactNode {
  const { t } = useTranslation()
  const [view, setView] = useState<View>('overview')

  return (
    <div>
      {withBarcode && <VinBarcode vin={data.vin} />}

      <div
        role="tablist"
        aria-label={t('vin.title')}
        className="mb-3 flex gap-1 rounded-full bg-[var(--color-border)]/30 p-1"
      >
        {VIEWS.map(v => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              'flex-1 rounded-full px-3 py-1 text-sm whitespace-nowrap transition-colors',
              view === v ? 'bg-[var(--color-surface)] font-medium shadow-sm' : 'text-[var(--color-muted)]'
            )}
          >
            {t(`vin.tab.${v}`)}
          </button>
        ))}
      </div>

      {view === 'overview' ? <VinOverview data={data} /> : <VinDecodeFields results={data.results} />}
      <p className="mt-3 text-sm text-[var(--color-muted)]">{t('vin.source')}</p>
    </div>
  )
}
