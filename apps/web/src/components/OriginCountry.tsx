import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Flag from '@/components/Flag'
import { countryLabel } from '@/components/vin/helpers'

type Props = {
  code: string
  /** Shown in brackets after the name (e.g. Ukrainian SSR next to the USSR flag). */
  extra?: string
}

export default function OriginCountry({ code, extra }: Props): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <Flag code={code} />
      {countryLabel(code, i18n.language, t)}
      {extra && <span className="font-normal text-[var(--color-muted)]">({extra})</span>}
    </span>
  )
}
