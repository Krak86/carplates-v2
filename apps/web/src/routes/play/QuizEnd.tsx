import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { downloadBlob } from '@/lib/download'
import { renderPlateCardPng } from '@/lib/plate-card'
import type { QuizId } from '@/routes/play/games'

type Props = {
  id: QuizId
  score: number
  /** Best score kept on this device, this run included. */
  best: number
  /** Round count; omitted for an endless quiz. */
  total?: number
  onAgain: () => void
}

const NEXT_LINKS = [
  { to: '/stats?view=map', key: 'play.end.stats' },
  { to: '/read/plates', key: 'play.end.plates' },
  { to: '/race', key: 'play.end.race' },
  { to: '/', key: 'play.end.lookup' }
] as const

/** Share card: the app's plate card with the score as its fact, through the native share sheet, else a download. */
async function shareScore(title: string, fact: string): Promise<boolean> {
  const blob = await renderPlateCardPng({
    plate: 'CARS UA',
    brand: null,
    model: title,
    year: null,
    region: null,
    regionLabel: null,
    fact
  })
  if (!blob) return false
  const file = new File([blob], 'carsua-quiz.png', { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return true
    }
  }
  downloadBlob(blob, 'carsua-quiz.png')
  return true
}

export default function QuizEnd({ id, score, best, total, onAgain }: Props): ReactNode {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const isRecord = score > 0 && score >= best

  const handleShare = async (): Promise<void> => {
    const fact = total ? t('play.end.scoreOf', { score, total }) : t('play.end.scoreStreak', { score })
    setFailed(!(await shareScore(t(`play.quiz.${id}.title`), fact)))
  }

  return (
    <Card className="text-center">
      <h2 className="text-xl font-semibold">{t('play.end.title')}</h2>
      <p className="mt-2 text-3xl font-bold text-[var(--label-1)]">{total ? `${score} / ${total}` : score}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {isRecord ? t('play.end.newBest') : t('play.best', { score: best })}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onAgain}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t('play.end.again')}
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-bg)]"
        >
          {t('play.end.share')}
        </button>
      </div>
      {failed && <p className="mt-2 text-sm text-[var(--color-muted)]">{t('share.cardFailed')}</p>}

      <nav aria-label={t('play.end.next')} className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        {NEXT_LINKS.map(link => (
          <Link key={link.to} to={link.to} className="text-[var(--color-primary)] hover:underline">
            {t(link.key)}
          </Link>
        ))}
      </nav>
    </Card>
  )
}
