import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { TEST_DRIVE_KM, driveProgress } from '@/lib/racer/config'

type Props = {
  /** Kilometres driven so far. */
  km: number
  className?: string
}

/** The test drive's progress: a line filling up to `TEST_DRIVE_KM`, with the percentage and the kilometres. */
export default function RaceProgress({ km, className }: Props): ReactNode {
  const { t } = useTranslation()
  const percent = Math.floor(driveProgress(km) * 100)

  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-xs text-[var(--color-muted)]">
        <span>{t('race.progress')}</span>
        <span className="tabular-nums">
          {percent}% · {Math.min(km, TEST_DRIVE_KM).toFixed(1)} / {TEST_DRIVE_KM} {t('race.progress.km')}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t('race.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]"
      >
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
