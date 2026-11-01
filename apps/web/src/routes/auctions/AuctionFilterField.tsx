import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'

type Props = {
  /** Id of the control inside; the label points at it. */
  id: string
  label: string
  /** Key suffix of `auctions.page.help.*`. */
  help: string
  children: ReactNode
}

/** One filter control with its label and a "?" that explains what it filters. */
export default function AuctionFilterField({ id, label, help, children }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
      <span className="flex items-center gap-1">
        <label htmlFor={id}>{label}</label>
        <InfoPopover label={t('auctions.page.helpLabel', { field: label })} title={label}>
          <p>{t(`auctions.page.help.${help}`)}</p>
        </InfoPopover>
      </span>
      {children}
    </div>
  )
}
