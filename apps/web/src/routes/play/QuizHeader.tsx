import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** Round shown (1-based); omitted for an endless quiz. */
  round?: number
  total?: number
  score: number
  streak: number
}

export default function QuizHeader({ round, total, score, streak }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-muted)]">
      <span>{round && total ? t('play.round', { n: round, total }) : t('play.endless')}</span>
      <span className="flex gap-3">
        <span>{t('play.score', { score })}</span>
        <span className={streak >= 3 ? 'font-semibold text-[var(--label-1)]' : undefined}>
          {t('play.streak', { n: streak })}
        </span>
      </span>
    </div>
  )
}
