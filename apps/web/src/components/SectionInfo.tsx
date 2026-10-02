import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'

type Props = {
  /** `section.about.<section>` i18n key. */
  section: string
  title: string
}

/** ❓ next to a section heading — a plain-language explanation of what the section shows. */
export default function SectionInfo({ section, title }: Props): ReactNode {
  const { t } = useTranslation()
  return (
    <InfoPopover label={t('vin.info.about', { field: title })} title={title}>
      <InfoText text={t(`section.about.${section}`)} />
    </InfoPopover>
  )
}
