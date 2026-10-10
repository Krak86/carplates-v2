import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { MOT_TERMS, type MotTerm } from '@/components/MotFaults.helpers'

type Props = {
  term: MotTerm
}

/** "?" popover that explains one MOT term (`mot.help.<term>.title` / `.body`) — every number in the section has one nearby. */
export default function MotHelp({ term }: Props): ReactNode {
  const { t } = useTranslation()
  if (!MOT_TERMS.includes(term)) return null
  const title = t(`mot.help.${term}.title`)

  return (
    <InfoPopover label={t('vin.info.about', { field: title })} title={title}>
      <InfoText text={t(`mot.help.${term}.body`)} />
    </InfoPopover>
  )
}
