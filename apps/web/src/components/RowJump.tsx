import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useCardJump } from '@/components/card-jump'
import type { JumpTarget } from '@/components/RdwSpecs.helpers'

type Props = {
  target: JumpTarget
}

const ICON: Readonly<Record<string, string>> = { size: '📏', history: '⚙️', vin: '🆔' }

/** "📐↓" next to a basic-section value: opens the section that goes deeper on it and scrolls there. */
export default function RowJump({ target }: Props): ReactNode {
  const { t } = useTranslation()
  const jump = useCardJump()
  if (!jump) return null

  const label = t(`rdw.jump.${target}.label`)

  return (
    <button
      type="button"
      onClick={() => jump(target)}
      title={label}
      aria-label={label}
      className="rounded px-1 hover:bg-[var(--color-border)]/60"
    >
      <span aria-hidden>{ICON[target] ?? '📐'}↓</span>
    </button>
  )
}
