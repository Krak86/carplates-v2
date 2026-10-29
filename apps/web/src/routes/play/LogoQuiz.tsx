import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { brandLogoUrl } from '@carplates/shared'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { statsTopQuery } from '@/lib/queries'
import { buildLogoRounds, logoBrands } from '@/routes/play/helpers'
import type { LogoRound } from '@/routes/play/helpers'
import QuizEnd from '@/routes/play/QuizEnd'
import QuizHeader from '@/routes/play/QuizHeader'
import { readBest, writeBest } from '@/routes/play/quiz-storage'

type Props = { onAgain: () => void }

function LogoRounds({ rounds, onAgain }: Props & { rounds: LogoRound[] }): ReactNode {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(() => readBest('logo'))

  const round = rounds[index]
  if (!round) return <QuizEnd id="logo" score={score} best={best} total={rounds.length} onAgain={onAgain} />

  const answered = picked !== null

  const handlePick = (brand: string): void => {
    setPicked(brand)
    if (brand === round.answer) {
      setScore(s => s + 1)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
  }

  const handleNext = (): void => {
    const next = index + 1
    if (next >= rounds.length) setBest(writeBest('logo', score))
    setPicked(null)
    setIndex(next)
  }

  return (
    <Card>
      <QuizHeader round={index + 1} total={rounds.length} score={score} streak={streak} />

      <p className="text-center text-sm text-[var(--color-muted)]">{t('play.logo.question')}</p>
      <div className="mx-auto my-3 flex h-32 w-48 items-center justify-center rounded-xl bg-white p-4 shadow-sm">
        <img
          src={brandLogoUrl(round.answer) ?? undefined}
          alt={answered ? round.answer : t('play.logo.alt')}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {round.options.map(option => (
          <button
            key={option}
            type="button"
            disabled={answered}
            onClick={() => handlePick(option)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm',
              !answered && 'border-[var(--color-border)] hover:bg-[var(--color-bg)]',
              answered && option === round.answer && 'border-[var(--label-4)] bg-[var(--label-4)]/20 font-semibold',
              answered &&
                option === picked &&
                option !== round.answer &&
                'border-[var(--label-0)] bg-[var(--label-0)]/20',
              answered && option !== round.answer && option !== picked && 'border-[var(--color-border)] opacity-60'
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-10 items-center justify-between gap-3" aria-live="polite">
        <p className="text-sm font-medium">
          {answered && t(picked === round.answer ? 'play.right' : 'play.wrong', { name: round.answer })}
        </p>
        {answered && (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {index + 1 >= rounds.length ? t('play.finish') : t('play.next')}
          </button>
        )}
      </div>
    </Card>
  )
}

function LogoRoundsLoader({ brands, onAgain }: Props & { brands: string[] }): ReactNode {
  const [rounds] = useState(() => buildLogoRounds(brands))
  return <LogoRounds rounds={rounds} onAgain={onAgain} />
}

/** "Which brand is this?": the logo of a top brand among four names. */
export default function LogoQuiz({ onAgain }: Props): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(statsTopQuery())

  if (stats.isPending) return <Spinner />
  if (stats.isError) return <p className="text-[var(--color-muted)]">{t('result.error')}</p>

  return <LogoRoundsLoader brands={logoBrands(stats.data)} onAgain={onAgain} />
}
