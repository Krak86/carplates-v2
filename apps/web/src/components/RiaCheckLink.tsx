import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RIA_CHECK_URL } from '@carplates/shared'

import AuctionVinModal from '@/components/AuctionVinModal'

type Props = {
  kind: 'plate' | 'vin'
  /** Normalized plate or VIN, offered for copying before leaving for AUTO.RIA. */
  value: string
}

const SITE_NAME = 'AUTO.RIA'

/**
 * Under "not found": an outbound link to AUTO.RIA's check (it knows some pre-2013 plates our open data lacks). It opens
 * a modal with the plate / VIN to copy first, as the auction section does. Link only, no RIA data is fetched or shown:
 * their terms forbid reusing it (docs/legal-and-monetization.md).
 */
export default function RiaCheckLink({ kind, value }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const what = kind === 'plate' ? t('result.ria.plate') : 'VIN'

  return (
    <p className="mt-2 text-sm text-[var(--color-muted)]">
      {kind === 'plate' ? t('result.ria.hintPlate') : t('result.ria.hintVin')}{' '}
      <button type="button" onClick={() => setOpen(true)} className="underline">
        {t('result.ria.link')}
      </button>
      {open && (
        <AuctionVinModal
          vin={value}
          siteName={SITE_NAME}
          url={RIA_CHECK_URL}
          onClose={() => setOpen(false)}
          copyLabel={what}
          title={t('result.ria.modalTitle', { what, site: SITE_NAME })}
          step1={t('result.ria.step1', { what })}
          step2={t('result.ria.step2', { site: SITE_NAME })}
        />
      )}
    </p>
  )
}
