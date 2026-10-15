import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ChipChevronButton from '@/components/ChipChevronButton'
import { useCardJump } from '@/components/card-jump'
import type { JumpTarget } from '@/components/RdwSpecs.helpers'

type Props = {
  target: JumpTarget
}

/** Round chevron (same as the header chips) next to a basic-section value: opens the section that goes deeper on it and scrolls there. */
export default function RowJump({ target }: Props): ReactNode {
  const { t } = useTranslation()
  const jump = useCardJump()
  if (!jump) return null

  return <ChipChevronButton label={t(`rdw.jump.${target}.label`)} onClick={() => jump(target)} />
}
