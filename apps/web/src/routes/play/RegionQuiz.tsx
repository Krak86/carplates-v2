import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import UaPlateBadge from '@/components/UaPlateBadge'
import { localizeRegion } from '@/lib/region-label'
import { buildRegionRounds } from '@/routes/play/helpers'
import QuizEnd from '@/routes/play/QuizEnd'
import QuizHeader from '@/routes/play/QuizHeader'
import { readBest, writeBest } from '@/routes/play/quiz-storage'
import StatsMap from '@/routes/stats/StatsMap'

type Props = { rounds: number; onAgain: () => void }

/** "Which region issued this plate?": ten plates of distinct regions, answered by tapping the region on the map. */
export default function RegionQuiz({ rounds: roundCount, onAgain }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [rounds] = useState(() => buildRegionRounds(roundCount))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(() => readBest('region', roundCount))

  const round = rounds[index]
  if (!round) return <QuizEnd id="region" score={score} best={best} total={rounds.length} onAgain={onAgain} />

  const answered = picked !== null
  const isRight = picked === round.region
  const marks = answered
    ? { [round.region]: 'correct' as const, ...(isRight ? {} : { [picked]: 'wrong' as const }) }
    : {}
  const regionLabel = localizeRegion(round.region, i18n.language)

  const handlePick = (region: string): void => {
    setPicked(region)
    if (region === round.region) {
      setScore(s => s + 1)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
  }

  const handleNext = (): void => {
    const next = index + 1
    if (next >= rounds.length) setBest(writeBest('region', roundCount, score))
    setPicked(null)
    setIndex(next)
  }

  return (
    <Card>
      <QuizHeader round={index + 1} total={rounds.length} score={score} streak={streak} />

      <div className="mb-3 flex flex-col items-center gap-1 text-center">
        <p className="text-sm text-[var(--color-muted)]">{t('play.region.question')}</p>
        <UaPlateBadge plate={round.plate} />
      </div>

      <StatsMap rows={[]} quiz={{ marks, onPick: handlePick, disabled: answered }} />

      <div className="mt-3 flex min-h-10 items-center justify-between gap-3" aria-live="polite">
        <p className="text-sm">
          {!answered && <span className="text-[var(--color-muted)]">{t('play.region.hint')}</span>}
          {answered && (
            <span className="font-medium">{t(isRight ? 'play.right' : 'play.wrong', { name: regionLabel })}</span>
          )}
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
