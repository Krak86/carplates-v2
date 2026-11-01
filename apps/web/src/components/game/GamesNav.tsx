import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { cn } from '@/lib/cn'
import { QUIZ_EMOJI, QUIZ_IDS, RACER_LINKS } from '@/routes/play/games'

const CHIP_CLASS =
  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors hover:border-[var(--color-primary)]'

type Props = {
  className?: string
}

/** Links to every game (the hub, the quizzes, the test drive and relax), the current page marked. Shown on the standalone game routes. */
export default function GamesNav({ className }: Props): ReactNode {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const items = [
    ...QUIZ_IDS.map(id => ({
      to: `/play?game=${id}`,
      emoji: QUIZ_EMOJI[id],
      label: t(`play.quiz.${id}.title`),
      current: false
    })),
    ...RACER_LINKS.map(link => ({
      to: link.to,
      emoji: link.emoji,
      label: t(`play.${link.key}.title`),
      current: pathname === link.to
    }))
  ]

  return (
    <nav aria-label={t('play.title')} className={cn('flex flex-wrap items-center gap-2', className)}>
      <Link
        to="/play"
        viewTransition
        className={cn(CHIP_CLASS, 'border-[var(--color-border)] bg-[var(--color-bg)]/60 text-[var(--color-primary)]')}
      >
        <span aria-hidden>🎮</span>
        {t('play.title')}
      </Link>

      {items.map(item => (
        <Link
          key={item.to}
          to={item.to}
          viewTransition
          aria-current={item.current ? 'page' : undefined}
          className={cn(
            CHIP_CLASS,
            item.current
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-bg)]/60'
          )}
        >
          <span aria-hidden>{item.emoji}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
