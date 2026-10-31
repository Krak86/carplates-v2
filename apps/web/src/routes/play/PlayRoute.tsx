import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { cn } from '@/lib/cn'
import Card from '@/components/ui/Card'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { parseQuizId, QUIZ_EMOJI, QUIZ_IDS, RACER_LINKS } from '@/routes/play/games'
import type { QuizId } from '@/routes/play/games'
import HigherLowerQuiz from '@/routes/play/HigherLowerQuiz'
import LogoQuiz from '@/routes/play/LogoQuiz'
import { ROUND_CHOICES } from '@/routes/play/helpers'
import type { RoundChoice } from '@/routes/play/helpers'
import { readBest, readRounds, writeRounds } from '@/routes/play/quiz-storage'
import RegionQuiz from '@/routes/play/RegionQuiz'

const QUIZ_COMPONENT: Readonly<Record<QuizId, (props: { rounds: number; onAgain: () => void }) => ReactNode>> = {
  region: RegionQuiz,
  logo: LogoQuiz,
  higher: HigherLowerQuiz
}

const CARD_CLASS =
  'flex h-full flex-col gap-1 transition-colors hover:border-[var(--color-primary)] focus-visible:outline-2'

// Lazy-loaded (see App.tsx). `?game=<id>` plays a quiz in place; the bare route is the hub of every game.
export default function PlayRoute(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [params, setParams] = useSearchParams()
  // A new run remounts the quiz, so its rounds are rebuilt without an effect.
  const [run, setRun] = useState(0)
  const [rounds, setRounds] = useState<RoundChoice>(readRounds)
  const game = parseQuizId(params.get('game'))
  const frameRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const handleChange = (): void =>
      setFullscreen(!!document.fullscreenElement && document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const handleToggleFullscreen = (): void => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void frameRef.current?.requestFullscreen().catch(() => undefined)
  }

  if (game) {
    const Quiz = QUIZ_COMPONENT[game]
    return (
      <div
        ref={frameRef}
        className={cn('mx-auto max-w-6xl', fullscreen && 'h-full max-w-none overflow-auto bg-[var(--color-bg)] p-4')}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link to="/play" className="text-sm text-[var(--color-primary)] hover:underline">
            {t('play.back')}
          </Link>
          <h1 className="text-lg font-semibold">{t(`play.quiz.${game}.title`)}</h1>
          {document.fullscreenEnabled && (
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-sm hover:border-[var(--color-primary)]"
            >
              {fullscreen ? t('play.exitFullscreen') : t('play.fullscreen')}
            </button>
          )}
        </div>
        {online ? <Quiz key={run} rounds={rounds} onAgain={() => setRun(r => r + 1)} /> : <p>{t('play.offline')}</p>}
      </div>
    )
  }

  const handleOpen = (id: QuizId): void => setParams({ game: id })
  const handleRounds = (value: RoundChoice): void => {
    writeRounds(value)
    setRounds(value)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold">{t('play.title')}</h1>
      <p className="mt-1 mb-4 text-[var(--color-muted)]">{t('play.intro')}</p>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label={t('play.rounds')}>
        <span className="text-sm text-[var(--color-muted)]">{t('play.rounds')}</span>
        {ROUND_CHOICES.map(choice => (
          <button
            key={choice}
            type="button"
            aria-pressed={choice === rounds}
            onClick={() => handleRounds(choice)}
            className={cn(
              'rounded-full border px-3 py-0.5 text-sm',
              choice === rounds
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
            )}
          >
            {choice}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {QUIZ_IDS.map(id => {
          const best = readBest(id, id === 'higher' ? undefined : rounds)
          return (
            <li key={id}>
              <button type="button" onClick={() => handleOpen(id)} className="block h-full w-full text-left">
                <Card className={CARD_CLASS}>
                  <span aria-hidden className="text-2xl">
                    {QUIZ_EMOJI[id]}
                  </span>
                  <span className="font-medium">{t(`play.quiz.${id}.title`)}</span>
                  <span className="text-sm text-[var(--color-muted)]">{t(`play.quiz.${id}.desc`)}</span>
                  {best > 0 && <span className="mt-auto pt-1 text-xs">{t('play.best', { score: best })}</span>}
                </Card>
              </button>
            </li>
          )
        })}

        {RACER_LINKS.map(link => (
          <li key={link.to}>
            <Link to={link.to} viewTransition className="block h-full">
              <Card className={CARD_CLASS}>
                <span aria-hidden className="text-2xl">
                  {link.emoji}
                </span>
                <span className="font-medium">{t(`play.${link.key}.title`)}</span>
                <span className="text-sm text-[var(--color-muted)]">{t(`play.${link.key}.desc`)}</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-[var(--color-muted)]">
        <Link to="/stats?view=map" className="text-[var(--color-primary)] hover:underline">
          {t('play.end.stats')}
        </Link>
        {' · '}
        <Link to="/read/plates" className="text-[var(--color-primary)] hover:underline">
          {t('play.end.plates')}
        </Link>
      </p>
    </div>
  )
}
