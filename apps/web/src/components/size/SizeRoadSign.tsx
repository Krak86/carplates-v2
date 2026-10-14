import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import SizeExternalLink from '@/components/size/SizeExternalLink'

/** ПДР України, section 15 "Зупинка і стоянка": where signs 5.38 and 7.6.x are explained. */
const PDR_PARKING_URL = 'https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF'

/**
 * Ukrainian road sign 5.38 "Місце стоянки" (a white "P" on a blue square), drawn in SVG, with its ПДР number and a ❓.
 * A scan of the official sign (e.g. from vodiy.ua) can replace the drawing later without touching the callers.
 */
export default function SizeRoadSign(): ReactNode {
  const { t } = useTranslation()
  const title = t('size.sign.parking.title')

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
      <svg viewBox="0 0 40 40" role="img" aria-label={title} className="size-8 shrink-0">
        <rect x="1" y="1" width="38" height="38" rx="5" fill="#fff" />
        <rect x="3" y="3" width="34" height="34" rx="3.5" fill="#0a5bb5" />
        <text
          x="20"
          y="29"
          textAnchor="middle"
          fontSize="26"
          fontWeight="700"
          fontFamily="Arial, sans-serif"
          fill="#fff"
        >
          P
        </text>
      </svg>
      <span>
        <span className="font-medium text-[var(--color-fg)]">{t('size.sign.parking.number')}</span> {title}
      </span>
      <InfoPopover label={t('vin.info.about', { field: title })} title={title}>
        <InfoText text={t('size.sign.parking.what')} />
        <p className="mt-1.5">
          <SizeExternalLink href={PDR_PARKING_URL}>{t('size.sign.parking.link')}</SizeExternalLink>
        </p>
      </InfoPopover>
    </span>
  )
}
