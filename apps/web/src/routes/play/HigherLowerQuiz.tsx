import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { brandLogoUrl } from '@carplates/shared'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { toIntlLocale } from '@/lib/intl'
import { statsTopQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import { buildChain, countItems, isHigher } from '@/routes/play/helpers'
import type { CountItem } from '@/routes/play/helpers'
import QuizEnd from '@/routes/play/QuizEnd'
import QuizHeader from '@/routes/play/QuizHeader'
import { readBest, writeBest } from '@/routes/play/quiz-storage'

type Props = { onAgain: () => void }

type FaceProps = { item: CountItem; count: string | null }

function ItemFace({ item, count }: FaceProps): ReactNode {
  const { i18n } = useTranslation()
  const logo = brandLogoUrl(item.brand)
  const label = item.key.startsWith('region:') ? (localizeRegion(item.label, i18n.language) ?? item.label) : item.label

  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-center">
      <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-white p-1.5">
        {logo ? (
          <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span aria-hidden className="text-2xl">
            📍
          </span>
        )}
      </div>
      <p className="font-medium">{label}</p>
      <p className="text-lg font-bold text-[var(--label-1)]">{count ?? '?'}</p>
    </div>
  )
}

function Chain({ chain, onAgain }: Props & { chain: CountItem[] }): ReactNode {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState(0)
  const [guess, setGuess] = useState<'higher' | 'lower' | null>(null)
  const [score, setScore] = useState(0)
  const [over, setOver] = useState(false)
  const [best, setBest] = useState(() => readBest('higher'))

  const current = chain[index]
  const next = chain[index + 1]
  // Running out of items ends the game like a miss does.
  if (!current || !next || over) return <QuizEnd id="higher" score={score} best={best} onAgain={onAgain} />

  const format = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const answered = guess !== null
  const right = isHigher(current, next) ? 'higher' : 'lower'

  const handleGuess = (g: 'higher' | 'lower'): void => {
    setGuess(g)
    if (g === right) setScore(s => s + 1)
  }

  const handleNext = (): void => {
    // A miss, or the last pair of the chain, ends the run.
    if (guess !== right || index + 2 >= chain.length) {
      setBest(writeBest('higher', score))
      setOver(true)
      return
    }
    setGuess(null)
    setIndex(i => i + 1)
  }

  return (
    <Card>
      <QuizHeader score={score} streak={score} />

      <p className="mb-3 text-center text-sm text-[var(--color-muted)]">{t('play.higher.question')}</p>
      <div className="flex gap-3">
        <ItemFace item={current} count={format.format(current.n)} />
        <ItemFace item={next} count={answered ? format.format(next.n) : null} />
      </div>

      {!answered && (
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => handleGuess('higher')}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t('play.higher.higher')}
          </button>
          <button
            type="button"
            onClick={() => handleGuess('lower')}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-bg)]"
          >
            {t('play.higher.lower')}
          </button>
        </div>
      )}

      {answered && (
        <div className="mt-3 flex items-center justify-between gap-3" aria-live="polite">
          <p className="text-sm font-medium">{t(guess === right ? 'play.higher.right' : 'play.higher.wrong')}</p>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t(guess === right && index + 2 < chain.length ? 'play.next' : 'play.finish')}
          </button>
        </div>
      )}
    </Card>
  )
}

function ChainLoader({ items, onAgain }: Props & { items: CountItem[] }): ReactNode {
  const [chain] = useState(() => buildChain(items))
  return <Chain chain={chain} onAgain={onAgain} />
}

/** Which of two leaderboard entries (brand, model, region) has more registered cars; ends on the first miss. */
export default function HigherLowerQuiz({ onAgain }: Props): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(statsTopQuery())

  if (stats.isPending) return <Spinner />
  if (stats.isError) return <p className="text-[var(--color-muted)]">{t('result.error')}</p>

  return <ChainLoader items={countItems(stats.data)} onAgain={onAgain} />
}
