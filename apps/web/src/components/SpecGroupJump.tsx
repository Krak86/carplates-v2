import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { JumpSection } from '@/components/RdwSpecs.helpers'

type Props = {
  section: JumpSection
  onJump: (section: JumpSection) => void
}

/** "↓ Size & parking" under a Specs group heading: opens the section that goes deeper and scrolls to it, with a line saying what is there. */
export default function SpecGroupJump({ section, onJump }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <p className="mb-1 text-xs text-[var(--color-muted)]">
      <button
        type="button"
        onClick={() => onJump(section)}
        className="text-[var(--color-primary)] underline hover:no-underline"
      >
        <span aria-hidden>↓</span> {t(`rdw.jump.${section}.label`)}
      </button>
      {' — '}
      {t(`rdw.jump.${section}.what`)}
    </p>
  )
}
